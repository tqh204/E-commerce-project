var schemas = require('../schemas');
var notificationLib = require('../lib/notifications');
var auctionLifecycleLib = require('../lib/auctionLifecycle');
var walletLib = require('../lib/wallet');
var httpLib = require('../lib/http');

var Auction = schemas.Auction;
var Bid = schemas.Bid;
var Product = schemas.Product;
var User = schemas.User;
var createNotification = notificationLib.createNotification;
var closeAuction = auctionLifecycleLib.closeAuction;
var createAuctionSettlementOrder = auctionLifecycleLib.createAuctionSettlementOrder;
var getAuctionParticipationAmount = auctionLifecycleLib.getAuctionParticipationAmount;
var runAuctionLifecycleTick = auctionLifecycleLib.runAuctionLifecycleTick;
var reserveWalletFunds = walletLib.reserveWalletFunds;
var releaseWalletReserve = walletLib.releaseWalletReserve;
var buildPaginationMeta = httpLib.buildPaginationMeta;
var cleanObject = httpLib.cleanObject;
var parsePagination = httpLib.parsePagination;

var ALLOWED_CREATE_STATUSES = ['scheduled', 'live', 'cancelled'];
var AUCTION_EDITABLE_STATUSES = ['scheduled', 'cancelled'];

var createControllerError = function(message, status, details) {
  var error = new Error(message);
  error.status = status || 400;
  if (details !== undefined) {
    error.details = details;
  }
  return error;
};

var containsValue = function(list, value) {
  return Array.isArray(list) && list.indexOf(value) !== -1;
};

var toCurrencyNumber = function(value, fallback) {
  var parsed;

  if (fallback === undefined) {
    fallback = 0;
  }

  parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

var computeMinimumBidStep = function(baseAmount) {
  var normalizedBase = Math.max(toCurrencyNumber(baseAmount, 0), 0);
  return Math.max(20000, Math.ceil(normalizedBase * 0.2));
};

var buildAuctionPricing = function(product, payload) {
  var source = payload || {};
  var startingBid = Math.max(toCurrencyNumber(source.startingBid, 0), 0);
  var pricingBase =
    startingBid || toCurrencyNumber(product.price, 0) || toCurrencyNumber(source.buyNowPrice, 0);
  var minimumBidStep = computeMinimumBidStep(pricingBase);
  var requestedBidStep =
    source.bidStep === undefined ? null : toCurrencyNumber(source.bidStep, 0);

  if (!startingBid) {
    throw createControllerError('startingBid must be greater than 0', 400);
  }

  if (requestedBidStep !== null && requestedBidStep < minimumBidStep) {
    throw createControllerError('Bid step must be at least ' + minimumBidStep, 400);
  }

  return {
    startingBid: startingBid,
    currentBid: Math.max(toCurrencyNumber(source.currentBid, startingBid), startingBid),
    reservePrice:
      source.reservePrice === undefined || source.reservePrice === null
        ? null
        : Math.max(toCurrencyNumber(source.reservePrice, 0), 0),
    buyNowPrice:
      source.buyNowPrice === undefined || source.buyNowPrice === null
        ? null
        : Math.max(toCurrencyNumber(source.buyNowPrice, 0), 0),
    bidStep: requestedBidStep !== null ? requestedBidStep : minimumBidStep,
    minimumBidStep: minimumBidStep,
  };
};

var syncProductForAuction = async function(product, auctionStatus, pricing, options) {
  var config = options || {};
  var preserveSoldState = Boolean(config.preserveSoldState);

  product.saleType = 'auction';
  product.startingBid = pricing.startingBid;
  product.currentBid = pricing.currentBid;
  product.buyNowPrice = pricing.buyNowPrice;
  product.bidStep = pricing.bidStep;
  product.reservePrice = pricing.reservePrice;

  if (preserveSoldState && product.status === 'sold') {
    await product.save();
    return product;
  }

  if (auctionStatus === 'cancelled') {
    product.status = 'hidden';
  } else if (auctionStatus === 'scheduled' || auctionStatus === 'live') {
    product.status = 'active';
  }

  await product.save();
  return product;
};

module.exports.listAuctions = async function(query) {
  var pagination;
  var page;
  var limit;
  var skip;
  var filter = {};
  var results;

  await runAuctionLifecycleTick();

  pagination = parsePagination(query || {});
  page = pagination.page;
  limit = pagination.limit;
  skip = pagination.skip;

  if (query && query.status) {
    filter.status = query.status;
  }

  results = await Promise.all([
    Auction.find(filter)
      .populate('product', 'title price thumbnailImage status buyNowPrice')
      .populate('seller', 'username fullName')
      .populate('winnerUser', 'username fullName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Auction.countDocuments(filter),
  ]);

  return {
    data: results[0],
    meta: buildPaginationMeta(page, limit, results[1]),
  };
};

module.exports.getAuctionById = async function(auctionId) {
  var auction = await Auction.findById(auctionId)
    .populate('product', 'title price thumbnailImage status buyNowPrice')
    .populate('seller', 'username fullName')
    .populate('winnerUser', 'username fullName')
    .populate('winnerBid');
  var bids;

  if (!auction) {
    return null;
  }

  bids = await Bid.find({ auction: auction._id })
    .populate('bidder', 'username fullName')
    .sort({ createdAt: -1 })
    .limit(20);

  return { auction: auction, bids: bids };
};

module.exports.createAuction = async function(body, actor) {
  var product = await Product.findById(body.productId);
  var isAdmin;
  var pricing;
  var requestedStatus;
  var status;
  var auction;

  if (!product) {
    throw createControllerError('Product not found', 404);
  }

  isAdmin = (actor.userRoles || []).indexOf('admin') !== -1;
  if (String(product.seller) !== String(actor.user._id) && !isAdmin) {
    throw createControllerError('Forbidden', 403);
  }

  pricing = buildAuctionPricing(product, body);
  requestedStatus = String(body.status || '').trim();
  status = containsValue(ALLOWED_CREATE_STATUSES, requestedStatus) ? requestedStatus : 'scheduled';

  auction = await Auction.create({
    product: product._id,
    seller: product.seller,
    startAt: body.startAt,
    endAt: body.endAt,
    startingBid: pricing.startingBid,
    currentBid: pricing.currentBid,
    reservePrice: pricing.reservePrice,
    buyNowPrice: pricing.buyNowPrice,
    bidStep: pricing.bidStep,
    minimumBidStep: pricing.minimumBidStep,
    autoExtendMinutes: body.autoExtendMinutes,
    status: status,
  });

  await syncProductForAuction(product, auction.status, pricing);

  if (auction.status === 'scheduled' || auction.status === 'live') {
    await runAuctionLifecycleTick();
  }

  return auction;
};

module.exports.updateAuction = async function(auctionId, body, actor) {
  var auction = await Auction.findById(auctionId);
  var isAdmin;
  var isOwner;
  var product;
  var pricing;
  var requestedStatus;

  if (!auction) {
    return null;
  }

  isAdmin = (actor.userRoles || []).indexOf('admin') !== -1;
  isOwner = String(auction.seller) === String(actor.user._id);
  if (!isOwner && !isAdmin) {
    throw createControllerError('Forbidden', 403);
  }
  if (!containsValue(AUCTION_EDITABLE_STATUSES, auction.status) && !isAdmin) {
    throw createControllerError('Auction can no longer be edited', 400);
  }

  product = await Product.findById(auction.product);
  if (!product) {
    throw createControllerError('Product not found', 404);
  }

  pricing = buildAuctionPricing(product, {
    startingBid: body.startingBid === undefined ? auction.startingBid : body.startingBid,
    currentBid: body.currentBid === undefined ? auction.currentBid : body.currentBid,
    reservePrice: body.reservePrice === undefined ? auction.reservePrice : body.reservePrice,
    buyNowPrice: body.buyNowPrice === undefined ? auction.buyNowPrice : body.buyNowPrice,
    bidStep: body.bidStep === undefined ? auction.bidStep : body.bidStep,
  });

  Object.assign(
    auction,
    cleanObject({
      startAt: body.startAt,
      endAt: body.endAt,
      startingBid: pricing.startingBid,
      currentBid: pricing.currentBid,
      reservePrice: pricing.reservePrice,
      buyNowPrice: pricing.buyNowPrice,
      bidStep: pricing.bidStep,
      minimumBidStep: pricing.minimumBidStep,
      autoExtendMinutes: body.autoExtendMinutes,
    })
  );

  if (!isAdmin) {
    requestedStatus = String(body.status || '').trim();
    auction.status = containsValue(ALLOWED_CREATE_STATUSES, requestedStatus)
      ? requestedStatus
      : auction.status || 'scheduled';
  }

  await auction.save();
  await syncProductForAuction(product, auction.status, pricing);

  return auction;
};

module.exports.placeBid = async function(auctionId, body, actor) {
  var auction = await Auction.findById(auctionId);
  var now;
  var product;
  var minimumBid;
  var amount;
  var currentWinningBid;
  var reservedAmount;
  var bidder;
  var currentReserved;
  var delta;
  var availableBalance;
  var bid;

  if (!auction) {
    return null;
  }
  if (String(auction.seller) === String(actor.user._id)) {
    throw createControllerError('Owner cannot bid on own auction', 400);
  }
  if (auction.status !== 'live') {
    throw createControllerError('Auction is not live', 400);
  }

  now = new Date();
  if (auction.startAt > now || auction.endAt <= now) {
    throw createControllerError('Auction is outside the bidding window', 400);
  }

  product = await Product.findById(auction.product);
  if (!product) {
    throw createControllerError('Product not found', 404);
  }

  minimumBid = Math.max(auction.currentBid || 0, auction.startingBid || 0) + (auction.bidStep || 1);
  amount = Number(body.amount || 0);
  if (amount < minimumBid) {
    throw createControllerError('Bid must be at least ' + minimumBid, 400);
  }

  currentWinningBid = await Bid.findOne({ auction: auction._id, isWinning: true });
  reservedAmount = getAuctionParticipationAmount({ auction: auction, product: product, amount: amount });
  bidder = await User.findById(actor.user._id);
  if (!bidder) {
    throw createControllerError('Bidder not found', 404);
  }

  if (currentWinningBid && String(currentWinningBid.bidder) === String(actor.user._id)) {
    currentReserved = Number(currentWinningBid.reservedAmount || currentWinningBid.amount || 0);
    delta = reservedAmount - currentReserved;

    if (delta > 0) {
      await reserveWalletFunds({
        userId: actor.user._id,
        amount: delta,
        auction: auction._id,
        bid: currentWinningBid._id,
        description: 'Increased reserve for higher winning bid',
      });
    } else if (delta < 0) {
      await releaseWalletReserve({
        userId: actor.user._id,
        amount: Math.abs(delta),
        auction: auction._id,
        bid: currentWinningBid._id,
        description: 'Adjusted reserve for updated winning bid',
      });
    }
  } else {
    availableBalance = Number(bidder.balance || 0) - Number(bidder.lockedBalance || 0);
    if (availableBalance < reservedAmount) {
      throw createControllerError(
        'Wallet balance is not enough to participate. Required: ' + reservedAmount,
        400
      );
    }

    await reserveWalletFunds({
      userId: actor.user._id,
      amount: reservedAmount,
      auction: auction._id,
      description: 'Reserved wallet funds for auction participation',
    });
  }

  if (currentWinningBid && String(currentWinningBid.bidder) !== String(actor.user._id)) {
    await releaseWalletReserve({
      userId: currentWinningBid.bidder,
      amount: currentWinningBid.reservedAmount || currentWinningBid.amount,
      auction: auction._id,
      bid: currentWinningBid._id,
      description: 'Outbid reserve unlocked',
    });

    await createNotification({
      userId: currentWinningBid.bidder,
      title: 'Ban da bi vuot gia',
      message: 'Co nguoi vua tra gia cao hon trong phien dau gia ban tham gia.',
      type: 'auction_outbid',
      refType: 'auction',
      refId: String(auction._id),
      metadata: { auctionId: String(auction._id), bidId: String(currentWinningBid._id) },
    });
  }

  await Bid.updateMany(
    { auction: auction._id, isWinning: true },
    { $set: { isWinning: false, status: 'outbid' } }
  );

  bid = await Bid.create({
    auction: auction._id,
    product: auction.product,
    bidder: actor.user._id,
    amount: amount,
    reservedAmount: reservedAmount,
    maxAutoBid: body.maxAutoBid,
    source: body.source || 'manual',
    status: 'active',
    isWinning: true,
  });

  auction.currentBid = amount;
  auction.winnerUser = actor.user._id;
  auction.winnerBid = bid._id;
  auction.totalBids += 1;
  auction.lastBidAt = new Date();
  await auction.save();

  await Product.findByIdAndUpdate(auction.product, { currentBid: amount });

  await createNotification({
    userId: auction.seller,
    title: 'Co tra gia moi',
    message: 'Phien dau gia vua co nguoi tra gia ' + amount.toLocaleString('vi-VN') + ' VND.',
    type: 'auction_bid',
    refType: 'auction',
    refId: String(auction._id),
    metadata: { auctionId: String(auction._id), bidId: String(bid._id) },
  });

  return bid;
};

module.exports.buyNow = async function(auctionId, actor) {
  var auction = await Auction.findById(auctionId);
  var product;
  var buyNowPrice;
  var buyer;
  var availableBalance;
  var currentWinningBid;
  var buyNowBid;
  var order;

  if (!auction) {
    return null;
  }
  if (!containsValue(['scheduled', 'live'], auction.status)) {
    throw createControllerError('Auction is not available for buy-now', 400);
  }
  if (String(auction.seller) === String(actor.user._id)) {
    throw createControllerError('Owner cannot buy own auction', 400);
  }

  product = await Product.findById(auction.product);
  if (!product) {
    throw createControllerError('Product not found', 404);
  }

  buyNowPrice = Number(auction.buyNowPrice || product.buyNowPrice || product.price || 0);
  if (buyNowPrice <= 0) {
    throw createControllerError('Auction does not support buy-now', 400);
  }

  buyer = await User.findById(actor.user._id);
  availableBalance = Number(buyer.balance || 0) - Number(buyer.lockedBalance || 0);
  if (availableBalance < buyNowPrice) {
    throw createControllerError('Wallet balance is not enough. Required: ' + buyNowPrice, 400);
  }

  currentWinningBid = await Bid.findOne({ auction: auction._id, isWinning: true });
  if (currentWinningBid) {
    await releaseWalletReserve({
      userId: currentWinningBid.bidder,
      amount: currentWinningBid.reservedAmount || currentWinningBid.amount,
      auction: auction._id,
      bid: currentWinningBid._id,
      description: 'Auction buy-now selected, previous reserve unlocked',
    });
  }

  await Bid.updateMany(
    { auction: auction._id },
    { $set: { isWinning: false, status: 'cancelled' } }
  );

  buyNowBid = await Bid.create({
    auction: auction._id,
    product: auction.product,
    bidder: actor.user._id,
    amount: buyNowPrice,
    reservedAmount: 0,
    source: 'proxy',
    status: 'won',
    isWinning: true,
  });

  order = await createAuctionSettlementOrder({
    auction: auction,
    buyerId: actor.user._id,
    product: product,
    amount: buyNowPrice,
    type: 'auction_buy_now',
    buyerNotes: 'Generated from auction buy-now flow',
  });

  auction.status = 'ended';
  auction.currentBid = buyNowPrice;
  auction.winnerUser = actor.user._id;
  auction.winnerBid = buyNowBid._id;
  auction.isReserveMet = true;
  await auction.save();

  product.status = 'sold';
  product.saleType = 'auction';
  product.currentBid = buyNowPrice;
  product.soldAt = new Date();
  await product.save();

  await Promise.all([
    createNotification({
      userId: auction.seller,
      title: 'Dau gia ket thuc (mua ngay)',
      message: 'Nguoi mua da chon mua ngay voi gia ' + buyNowPrice.toLocaleString('vi-VN') + ' VND.',
      type: 'auction_buy_now',
      refType: 'auction',
      refId: String(auction._id),
      metadata: { auctionId: String(auction._id), orderId: String(order._id) },
    }),
    createNotification({
      userId: actor.user._id,
      title: 'Mua ngay thanh cong',
      message: 'Ban da mua ngay san pham dau gia voi gia ' + buyNowPrice.toLocaleString('vi-VN') + ' VND.',
      type: 'auction_buy_now',
      refType: 'auction',
      refId: String(auction._id),
      metadata: { auctionId: String(auction._id), orderId: String(order._id) },
    }),
  ]);

  return { auction: auction, order: order, bid: buyNowBid };
};

module.exports.closeAuction = async function(auctionId, body, actor) {
  var auction = await Auction.findById(auctionId);
  var isOwner;
  var isAdmin;

  if (!auction) {
    return null;
  }

  isOwner = String(auction.seller) === String(actor.user._id);
  isAdmin = (actor.userRoles || []).indexOf('admin') !== -1;
  if (!isOwner && !isAdmin) {
    throw createControllerError('Forbidden', 403);
  }

  return closeAuction(auction._id, {
    force: Boolean(body.force || isAdmin),
    cancelled: Boolean(body.cancelled),
  });
};

module.exports.openAuction = async function(auctionId, actor) {
  var auction = await Auction.findById(auctionId);
  var isOwner;
  var isAdmin;
  var now;

  if (!auction) {
    return null;
  }

  isOwner = String(auction.seller) === String(actor.user._id);
  isAdmin = (actor.userRoles || []).indexOf('admin') !== -1;
  if (!isOwner && !isAdmin) {
    throw createControllerError('Forbidden', 403);
  }

  now = new Date();
  if (!auction.startAt || new Date(auction.startAt) > now) {
    auction.startAt = now;
  }
  if (!auction.endAt || new Date(auction.endAt) <= now) {
    auction.endAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  }
  auction.status = 'live';
  auction.currentBid = auction.currentBid || auction.startingBid;
  await auction.save();

  await Product.findByIdAndUpdate(auction.product, {
    saleType: 'auction',
    status: 'active',
    startingBid: auction.startingBid,
    currentBid: auction.currentBid,
    bidStep: auction.bidStep,
    reservePrice: auction.reservePrice,
    buyNowPrice: auction.buyNowPrice,
  });

  return auction;
};

module.exports.deleteAuction = async function(auctionId, actor) {
  var auction = await Auction.findById(auctionId);
  var currentWinningBid;

  if (!auction) {
    return false;
  }
  if (String(auction.seller) !== String(actor.user._id) && (actor.userRoles || []).indexOf('admin') === -1) {
    throw createControllerError('Forbidden', 403);
  }

  currentWinningBid = await Bid.findOne({ auction: auction._id, isWinning: true });
  if (currentWinningBid) {
    await releaseWalletReserve({
      userId: currentWinningBid.bidder,
      amount: currentWinningBid.reservedAmount || currentWinningBid.amount,
      auction: auction._id,
      bid: currentWinningBid._id,
      description: 'Auction deleted, reserve unlocked',
    });
  }

  await Bid.deleteMany({ auction: auction._id });
  await auction.deleteOne();

  return true;
};
