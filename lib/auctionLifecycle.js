const { Auction, Bid, EscrowTransaction, Order, OrderItem, Product } = require('../schemas');

const isReserveMet = (auction, winningAmount = 0) =>
  !auction.reservePrice || Number(winningAmount || 0) >= Number(auction.reservePrice || 0);

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

const ensureAuctionWinnerOrder = async ({ auction, winningBid, product }) => {
  if (!winningBid) {
    return null;
  }

  let order = await Order.findOne({ auction: auction._id });
  if (order) {
    return order;
  }

  order = await Order.create({
    buyer: winningBid.bidder,
    seller: auction.seller,
    product: product._id,
    auction: auction._id,
    type: 'auction_win',
    paymentType: 'escrow',
    shippingMethod: 'delivery',
    price: winningBid.amount,
    quantity: 1,
    subtotal: winningBid.amount,
    shippingFee: 0,
    platformFee: 0,
    totalAmount: winningBid.amount,
    shipping: {
      method: 'delivery',
      status: 'pending',
    },
    escrow: {
      amount: winningBid.amount,
      status: 'pending',
    },
    status: 'pending_payment',
    buyerNotes: 'Generated from auction winner flow',
  });

  await OrderItem.create({
    order: order._id,
    product: product._id,
    seller: auction.seller,
    titleSnapshot: product.title,
    priceSnapshot: winningBid.amount,
    quantity: 1,
    total: winningBid.amount,
    primaryImage: product.thumbnailImage || product.images?.[0] || null,
  });

  const escrow = await EscrowTransaction.create({
    order: order._id,
    buyer: winningBid.bidder,
    seller: auction.seller,
    amount: winningBid.amount,
    feeAmount: 0,
    status: 'pending',
  });

  order.escrowTransaction = escrow._id;
  await order.save();

  return order;
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
          status: { $in: ['draft', 'pending'] },
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

  if (cancelled) {
    auction.status = 'cancelled';
    auction.winnerUser = null;
    auction.winnerBid = null;
    auction.isReserveMet = false;
    await auction.save();
    await markBidsForClosure({ auctionId: auction._id, cancelled: true });

    product.status = 'hidden';
    await product.save();

    return { auction, product, order: null };
  }

  const winningBid = (await Bid.findOne({ auction: auction._id }).sort({ amount: -1, createdAt: 1 })) || null;
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
  processExpiredAuctions,
  runAuctionLifecycleTick,
  startAuctionLifecycleMonitor,
};
