var schemas = require('../schemas');
var escrowService = require('./escrowService');
var walletLib = require('./wallet');
var notificationLib = require('./notifications');

var Auction = schemas.Auction;
var Bid = schemas.Bid;
var Order = schemas.Order;
var OrderItem = schemas.OrderItem;
var Product = schemas.Product;
var ensureEscrowRecord = escrowService.ensureEscrowRecord;
var holdEscrowForOrder = escrowService.holdEscrowForOrder;
var releaseWalletReserve = walletLib.releaseWalletReserve;
var createNotification = notificationLib.createNotification;

var isReserveMet = function(auction, winningAmount) {
  var amount = winningAmount === undefined ? 0 : winningAmount;
  return !auction.reservePrice || Number(amount || 0) >= Number(auction.reservePrice || 0);
};

var getAuctionParticipationAmount = function(options) {
  var auction = options.auction;
  var product = options.product;
  var amount = options.amount;
  var bidAmount = Number(amount || 0);
  var buyOutAmount = Number(
    (auction && auction.buyNowPrice) ||
    (product && product.buyNowPrice) ||
    (product && product.price) ||
    0
  );
  return Math.max(bidAmount, buyOutAmount, 0);
};

var releaseBidReserve = async function(bid, reason) {
  var description = reason === undefined ? 'Auction reserve released' : reason;

  if (!bid || !bid.bidder || !bid.reservedAmount) {
    return;
  }

  await releaseWalletReserve({
    userId: bid.bidder,
    amount: bid.reservedAmount,
    auction: bid.auction,
    bid: bid._id,
    description: description,
    metadata: { source: 'auction_bid_release' },
  });
};

var markBidsForClosure = async function(options) {
  var auctionId = options.auctionId;
  var winnerBidId = options.winnerBidId === undefined ? null : options.winnerBidId;
  var cancelled = options.cancelled === undefined ? false : options.cancelled;

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

var createAuctionSettlementOrder = async function(options) {
  var auction = options.auction;
  var buyerId = options.buyerId;
  var product = options.product;
  var amount = options.amount;
  var type = options.type;
  var buyerNotes = options.buyerNotes;
  var consumeReserve = options.consumeReserve === undefined ? null : options.consumeReserve;
  var order = await Order.findOne({ auction: auction._id });

  if (order) {
    return order;
  }

  order = await Order.create({
    buyer: buyerId,
    seller: auction.seller,
    product: product._id,
    auction: auction._id,
    type: type,
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
      amount: amount,
      status: 'pending',
    },
    status: 'processing',
    paidAt: new Date(),
    sellerConfirmedAt: new Date(),
    buyerNotes: buyerNotes,
  });

  await OrderItem.create({
    order: order._id,
    product: product._id,
    seller: auction.seller,
    titleSnapshot: product.title,
    priceSnapshot: amount,
    quantity: 1,
    total: amount,
    primaryImage: product.thumbnailImage || (Array.isArray(product.images) && product.images.length ? product.images[0] : null),
  });

  await ensureEscrowRecord(order, {
    amount: amount,
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
    consumeReserve: consumeReserve,
  });

  return Order.findById(order._id);
};

var ensureAuctionWinnerOrder = async function(options) {
  var auction = options.auction;
  var winningBid = options.winningBid;
  var product = options.product;

  if (!winningBid) {
    return null;
  }

  return createAuctionSettlementOrder({
    auction: auction,
    buyerId: winningBid.bidder,
    product: product,
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

var activateScheduledAuctions = async function() {
  var now = new Date();
  var activatedAuctions = await Auction.find({
    status: 'scheduled',
    startAt: { $lte: now },
    endAt: { $gt: now },
  }).select('_id product');
  var productIds;
  var productResult;

  if (!activatedAuctions.length) {
    return { activatedAuctions: 0, activatedProducts: 0 };
  }

  await Auction.updateMany(
    {
      _id: {
        $in: activatedAuctions.map(function(auction) {
          return auction._id;
        }),
      },
    },
    { $set: { status: 'live' } }
  );

  productIds = activatedAuctions.map(function(auction) {
    return auction.product;
  }).filter(Boolean);

  productResult = productIds.length
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

var closeAuction = async function(auctionId, options) {
  var config = options || {};
  var force = config.force === undefined ? false : config.force;
  var cancelled = config.cancelled === undefined ? false : config.cancelled;
  var auction = await Auction.findById(auctionId);
  var order;
  var now;
  var product;
  var currentWinningBid;
  var winningBid;
  var reserveMet;

  if (!auction) {
    var notFoundError = new Error('Auction not found');
    notFoundError.status = 404;
    throw notFoundError;
  }

  if (auction.status === 'ended' || auction.status === 'cancelled') {
    order = await Order.findOne({ auction: auction._id });
    return { auction: auction, order: order, alreadyClosed: true };
  }

  now = new Date();
  if (!cancelled && !force && auction.endAt > now) {
    var runningError = new Error('Auction is still running');
    runningError.status = 400;
    throw runningError;
  }

  product = await Product.findById(auction.product);
  if (!product) {
    var productError = new Error('Product not found');
    productError.status = 404;
    throw productError;
  }

  currentWinningBid = await Bid.findOne({ auction: auction._id, isWinning: true });

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

    await Promise.all([
      createNotification({
        userId: auction.seller,
        title: 'Dau gia da bi huy',
        message: 'Phien dau gia cua ban da bi huy.',
        type: 'auction_cancelled',
        refType: 'auction',
        refId: String(auction._id),
        metadata: { auctionId: String(auction._id) },
      }),
      currentWinningBid
        ? createNotification({
            userId: currentWinningBid.bidder,
            title: 'Dau gia da bi huy',
            message: 'Phien dau gia ban tham gia da bi huy.',
            type: 'auction_cancelled',
            refType: 'auction',
            refId: String(auction._id),
            metadata: { auctionId: String(auction._id) },
          })
        : null,
    ]);

    return { auction: auction, product: product, order: null };
  }

  winningBid = (await Bid.findOne({ auction: auction._id }).sort({ amount: -1, createdAt: 1 })) || null;
  reserveMet = winningBid ? isReserveMet(auction, winningBid.amount) : false;

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

  order = null;
  if (reserveMet && winningBid) {
    product.status = 'sold';
    product.soldAt = now;
    product.currentBid = winningBid.amount;
    order = await ensureAuctionWinnerOrder({ auction: auction, winningBid: winningBid, product: product });
    await Promise.all([
      createNotification({
        userId: auction.seller,
        title: 'Dau gia ket thuc',
        message: 'Ban da co nguoi thang dau gia voi gia ' + winningBid.amount.toLocaleString('vi-VN') + ' VND.',
        type: 'auction_ended',
        refType: 'auction',
        refId: String(auction._id),
        metadata: { auctionId: String(auction._id), orderId: order ? String(order._id) : null },
      }),
      createNotification({
        userId: winningBid.bidder,
        title: 'Ban da thang dau gia',
        message: 'Ban da thang dau gia voi gia ' + winningBid.amount.toLocaleString('vi-VN') + ' VND.',
        type: 'auction_won',
        refType: 'auction',
        refId: String(auction._id),
        metadata: { auctionId: String(auction._id), orderId: order ? String(order._id) : null },
      }),
    ]);
  } else {
    if (winningBid) {
      await releaseBidReserve(winningBid, 'Auction ended without valid winner; reserve unlocked');
      await createNotification({
        userId: winningBid.bidder,
        title: 'Dau gia ket thuc',
        message: 'Phien dau gia ket thuc nhung khong co nguoi thang.',
        type: 'auction_ended',
        refType: 'auction',
        refId: String(auction._id),
        metadata: { auctionId: String(auction._id) },
      });
    }
    product.status = 'active';
    await createNotification({
      userId: auction.seller,
      title: 'Dau gia ket thuc',
      message: 'Phien dau gia ket thuc nhung khong co nguoi thang.',
      type: 'auction_ended',
      refType: 'auction',
      refId: String(auction._id),
      metadata: { auctionId: String(auction._id) },
    });
  }
  await product.save();

  return { auction: auction, product: product, order: order };
};

var processExpiredAuctions = async function() {
  var expiredAuctions = await Auction.find({
    status: { $in: ['scheduled', 'live'] },
    endAt: { $lte: new Date() },
  }).select('_id');
  var results = [];
  var index;
  var auction;
  var result;

  for (index = 0; index < expiredAuctions.length; index += 1) {
    auction = expiredAuctions[index];
    try {
      result = await closeAuction(auction._id, { force: true });
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

var lifecycleTimer = null;
var lifecycleRunPromise = null;

var runAuctionLifecycleTick = async function() {
  if (lifecycleRunPromise) {
    return lifecycleRunPromise;
  }

  lifecycleRunPromise = (async function() {
    try {
      var activation = await activateScheduledAuctions();
      var closures = await processExpiredAuctions();
      return { activation: activation, closures: closures };
    } finally {
      lifecycleRunPromise = null;
    }
  })();

  return lifecycleRunPromise;
};

var startAuctionLifecycleMonitor = function(intervalMs) {
  if (intervalMs === undefined) {
    intervalMs = 60 * 1000;
  }
  if (lifecycleTimer) {
    return lifecycleTimer;
  }

  lifecycleTimer = setInterval(async function() {
    try {
      await runAuctionLifecycleTick();
    } catch (error) {
      console.error('Auction lifecycle monitor error:', error.message);
    }
  }, intervalMs);

  runAuctionLifecycleTick().catch(function(error) {
    console.error('Initial auction lifecycle error:', error.message);
  });

  if (typeof lifecycleTimer.unref === 'function') {
    lifecycleTimer.unref();
  }

  return lifecycleTimer;
};

module.exports = {
  activateScheduledAuctions: activateScheduledAuctions,
  closeAuction: closeAuction,
  createAuctionSettlementOrder: createAuctionSettlementOrder,
  getAuctionParticipationAmount: getAuctionParticipationAmount,
  processExpiredAuctions: processExpiredAuctions,
  runAuctionLifecycleTick: runAuctionLifecycleTick,
  startAuctionLifecycleMonitor: startAuctionLifecycleMonitor,
};
