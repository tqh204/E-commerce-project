const { Auction, Bid, Order, OrderItem, Product } = require('../schemas');
const { ensureEscrowRecord, holdEscrowForOrder } = require('./escrowService');
const { releaseWalletReserve } = require('./wallet');

const isReserveMet = (auction, winningAmount = 0) =>
  !auction.reservePrice || Number(winningAmount || 0) >= Number(auction.reservePrice || 0);

const getAuctionParticipationAmount = ({ auction, product, amount }) => {
  const bidAmount = Number(amount || 0);
  const buyOutAmount = Number(auction?.buyNowPrice || product?.buyNowPrice || product?.price || 0);
  return Math.max(bidAmount, buyOutAmount, 0);
};

const releaseBidReserve = async (bid, reason = 'Auction reserve released') => {
  if (!bid?.bidder || !bid?.reservedAmount) {
    return;
  }

  await releaseWalletReserve({
    userId: bid.bidder,
    amount: bid.reservedAmount,
    auction: bid.auction,
    bid: bid._id,
    description: reason,
    metadata: { source: 'auction_bid_release' },
  });
};

const markBidsForClosure = async ({ auctionId, winnerBidId = null, cancelled = false }) => {
  if (cancelled) {
    await Bid.updateMany(
      { auction: auctionId, status: { $in: ['active', 'outbid', 'won'] } },
      { $set: { status: 'cancelled', isWinning: false } }
    );
    return;
  }

  await Bid.updateMany(
    { auction: auctionId, _id: { $ne: winnerBidId } },
    { $set: { status: 'outbid', isWinning: false } }
  );

  if (winnerBidId) {
    await Bid.findByIdAndUpdate(winnerBidId, { status: 'won', isWinning: true });
  }
};

const createAuctionSettlementOrder = async ({
  auction,
  buyerId,
  product,
  amount,
  type,
  buyerNotes,
  consumeReserve = null,
}) => {
  let order = await Order.findOne({ auction: auction._id });
  if (order) {
    return order;
  }

  order = await Order.create({
    buyer: buyerId,
    seller: auction.seller,
    product: product._id,
    auction: auction._id,
    type,
    paymentType: 'wallet',
    shippingMethod: 'delivery',
    price: amount,
    quantity: 1,
    subtotal: amount,
    shippingFee: 0,
    platformFee: 0,
    totalAmount: amount,
    shipping: {
      method: 'delivery',
      status: 'pending',
    },
    escrow: {
      amount,
      status: 'pending',
    },
    status: 'processing',
    paidAt: new Date(),
    sellerConfirmedAt: new Date(),
    buyerNotes,
  });

  await OrderItem.create({
    order: order._id,
    product: product._id,
    seller: auction.seller,
    titleSnapshot: product.title,
    priceSnapshot: amount,
    quantity: 1,
    total: amount,
    primaryImage: product.thumbnailImage || product.images?.[0] || null,
  });

  await ensureEscrowRecord(order, {
    amount,
    feeAmount: 0,
    flowType: type === 'auction_buy_now' ? 'auction_buy_now' : 'auction_win',
    fundingSource: 'wallet',
  });

  await holdEscrowForOrder(order, {
    flowType: type === 'auction_buy_now' ? 'auction_buy_now' : 'auction_win',
    description:
      type === 'auction_buy_now'
        ? 'Auction buy-now funds moved into escrow'
        : 'Auction winner funds moved into escrow',
    consumeReserve,
  });

  return await Order.findById(order._id);
};

const ensureAuctionWinnerOrder = async ({ auction, winningBid, product }) => {
  if (!winningBid) {
    return null;
  }

  return createAuctionSettlementOrder({
    auction,
    buyerId: winningBid.bidder,
    product,
    amount: winningBid.amount,
    type: 'auction_win',
    buyerNotes: 'Generated from auction winner flow',
    consumeReserve: {
      reservedAmount: winningBid.reservedAmount || winningBid.amount,
      auction: auction._id,
      bid: winningBid._id,
    },
  });
};

const activateScheduledAuctions = async () => {
  const now = new Date();
  const activatedAuctions = await Auction.find({
    status: 'scheduled',
    startAt: { $lte: now },
    endAt: { $gt: now },
  }).select('_id product');

  if (!activatedAuctions.length) {
    return { activatedAuctions: 0, activatedProducts: 0 };
  }

  await Auction.updateMany(
    { _id: { $in: activatedAuctions.map((auction) => auction._id) } },
    { $set: { status: 'live' } }
  );

  const productIds = activatedAuctions.map((auction) => auction.product).filter(Boolean);
  const productResult = productIds.length
    ? await Product.updateMany(
        {
          _id: { $in: productIds },
          saleType: 'auction',
          status: { $in: ['draft', 'hidden'] },
        },
        { $set: { status: 'active' } }
      )
    : { modifiedCount: 0 };

  return {
    activatedAuctions: activatedAuctions.length,
    activatedProducts: productResult.modifiedCount || 0,
  };
};

const closeAuction = async (auctionId, options = {}) => {
  const { force = false, cancelled = false } = options;
  const auction = await Auction.findById(auctionId);
  if (!auction) {
    const error = new Error('Auction not found');
    error.status = 404;
    throw error;
  }

  if (auction.status === 'ended' || auction.status === 'cancelled') {
    return { auction, order: await Order.findOne({ auction: auction._id }), alreadyClosed: true };
  }

  const now = new Date();
  if (!cancelled && !force && auction.endAt > now) {
    const error = new Error('Auction is still running');
    error.status = 400;
    throw error;
  }

  const product = await Product.findById(auction.product);
  if (!product) {
    const error = new Error('Product not found');
    error.status = 404;
    throw error;
  }

  const currentWinningBid = await Bid.findOne({ auction: auction._id, isWinning: true });

  if (cancelled) {
    auction.status = 'cancelled';
    auction.winnerUser = null;
    auction.winnerBid = null;
    auction.isReserveMet = false;
    await auction.save();
    await markBidsForClosure({ auctionId: auction._id, cancelled: true });

    if (currentWinningBid) {
      await releaseBidReserve(currentWinningBid, 'Auction cancelled and bid reserve unlocked');
    }

    product.status = 'hidden';
    await product.save();

    return { auction, product, order: null };
  }

  const winningBid =
    (await Bid.findOne({ auction: auction._id }).sort({ amount: -1, createdAt: 1 })) || null;
  const reserveMet = winningBid ? isReserveMet(auction, winningBid.amount) : false;

  auction.status = 'ended';
  auction.isReserveMet = reserveMet;
  auction.currentBid = winningBid ? winningBid.amount : auction.currentBid;
  auction.winnerUser = reserveMet && winningBid ? winningBid.bidder : null;
  auction.winnerBid = reserveMet && winningBid ? winningBid._id : null;
  await auction.save();

  await markBidsForClosure({
    auctionId: auction._id,
    winnerBidId: reserveMet && winningBid ? winningBid._id : null,
  });

  let order = null;
  if (reserveMet && winningBid) {
    product.status = 'sold';
    product.soldAt = now;
    product.currentBid = winningBid.amount;
    order = await ensureAuctionWinnerOrder({ auction, winningBid, product });
  } else {
    if (winningBid) {
      await releaseBidReserve(winningBid, 'Auction ended without valid winner; reserve unlocked');
    }
    product.status = 'active';
  }
  await product.save();

  return { auction, product, order };
};

const processExpiredAuctions = async () => {
  const expiredAuctions = await Auction.find({
    status: { $in: ['scheduled', 'live'] },
    endAt: { $lte: new Date() },
  }).select('_id');

  const results = [];
  for (const auction of expiredAuctions) {
    try {
      const result = await closeAuction(auction._id, { force: true });
      results.push({
        auctionId: String(auction._id),
        orderId: result.order ? String(result.order._id) : null,
        status: result.auction.status,
      });
    } catch (error) {
      results.push({
        auctionId: String(auction._id),
        error: error.message,
      });
    }
  }

  return results;
};

let lifecycleTimer = null;
let lifecycleRunPromise = null;

const runAuctionLifecycleTick = async () => {
  if (lifecycleRunPromise) {
    return lifecycleRunPromise;
  }

  lifecycleRunPromise = (async () => {
    try {
      const activation = await activateScheduledAuctions();
      const closures = await processExpiredAuctions();
      return { activation, closures };
    } finally {
      lifecycleRunPromise = null;
    }
  })();

  return lifecycleRunPromise;
};

const startAuctionLifecycleMonitor = (intervalMs = 60 * 1000) => {
  if (lifecycleTimer) {
    return lifecycleTimer;
  }

  lifecycleTimer = setInterval(async () => {
    try {
      await runAuctionLifecycleTick();
    } catch (error) {
      console.error('Auction lifecycle monitor error:', error.message);
    }
  }, intervalMs);

  runAuctionLifecycleTick().catch((error) => {
    console.error('Initial auction lifecycle error:', error.message);
  });

  if (typeof lifecycleTimer.unref === 'function') {
    lifecycleTimer.unref();
  }

  return lifecycleTimer;
};

module.exports = {
  activateScheduledAuctions,
  closeAuction,
  createAuctionSettlementOrder,
  getAuctionParticipationAmount,
  processExpiredAuctions,
  runAuctionLifecycleTick,
  startAuctionLifecycleMonitor,
};
