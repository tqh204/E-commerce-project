const { Auction, Bid, Product, User } = require('../schemas');
const { createNotification } = require('../lib/notifications');
const {
  closeAuction,
  createAuctionSettlementOrder,
  getAuctionParticipationAmount,
  runAuctionLifecycleTick,
} = require('../lib/auctionLifecycle');
const { reserveWalletFunds, releaseWalletReserve } = require('../lib/wallet');
const {
  asyncHandler,
  buildPaginationMeta,
  cleanObject,
  parsePagination,
  sendError,
  sendSuccess,
} = require('../lib/http');

const ALLOWED_CREATE_STATUSES = new Set(['scheduled', 'live', 'cancelled']);
const AUCTION_EDITABLE_STATUSES = new Set(['scheduled', 'cancelled']);

const toCurrencyNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const computeMinimumBidStep = (baseAmount) => {
  const normalizedBase = Math.max(toCurrencyNumber(baseAmount, 0), 0);
  return Math.max(20000, Math.ceil(normalizedBase * 0.2));
};

const buildAuctionPricing = (product, payload = {}) => {
  const startingBid = Math.max(toCurrencyNumber(payload.startingBid, 0), 0);
  const pricingBase =
    startingBid || toCurrencyNumber(product.price, 0) || toCurrencyNumber(payload.buyNowPrice, 0);
  const minimumBidStep = computeMinimumBidStep(pricingBase);
  const requestedBidStep = payload.bidStep === undefined ? null : toCurrencyNumber(payload.bidStep, 0);

  if (!startingBid) {
    const error = new Error('startingBid must be greater than 0');
    error.status = 400;
    throw error;
  }

  if (requestedBidStep !== null && requestedBidStep < minimumBidStep) {
    const error = new Error(`Bid step must be at least ${minimumBidStep}`);
    error.status = 400;
    throw error;
  }

  return {
    startingBid,
    currentBid: Math.max(toCurrencyNumber(payload.currentBid, startingBid), startingBid),
    reservePrice:
      payload.reservePrice === undefined || payload.reservePrice === null
        ? null
        : Math.max(toCurrencyNumber(payload.reservePrice, 0), 0),
    buyNowPrice:
      payload.buyNowPrice === undefined || payload.buyNowPrice === null
        ? null
        : Math.max(toCurrencyNumber(payload.buyNowPrice, 0), 0),
    bidStep: requestedBidStep !== null ? requestedBidStep : minimumBidStep,
    minimumBidStep,
  };
};

const syncProductForAuction = async (product, auctionStatus, pricing, options = {}) => {
  const { preserveSoldState = false } = options;
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

exports.listAuctions = asyncHandler(async (req, res) => {
  await runAuctionLifecycleTick();
  const { page, limit, skip } = parsePagination(req.query);
  const filter = {};
  if (req.query.status) {
    filter.status = req.query.status;
  }
  const [auctions, total] = await Promise.all([
    Auction.find(filter)
      .populate('product', 'title price thumbnailImage status buyNowPrice')
      .populate('seller', 'username fullName')
      .populate('winnerUser', 'username fullName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Auction.countDocuments(filter),
  ]);

  return sendSuccess(res, auctions, buildPaginationMeta(page, limit, total));
});

exports.getAuctionById = asyncHandler(async (req, res) => {
  const auction = await Auction.findById(req.params.id)
    .populate('product', 'title price thumbnailImage status buyNowPrice')
    .populate('seller', 'username fullName')
    .populate('winnerUser', 'username fullName')
    .populate('winnerBid');

  if (!auction) {
    return sendError(res, 'Auction not found', 404);
  }

  const bids = await Bid.find({ auction: auction._id })
    .populate('bidder', 'username fullName')
    .sort({ createdAt: -1 })
    .limit(20);

  return sendSuccess(res, { auction, bids });
});

exports.createAuction = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.body.productId);
  if (!product) {
    return sendError(res, 'Product not found', 404);
  }

  const isAdmin = (req.userRoles || []).includes('admin');
  if (String(product.seller) !== String(req.user._id) && !isAdmin) {
    return sendError(res, 'Forbidden', 403);
  }

  const pricing = buildAuctionPricing(product, req.body);
  const requestedStatus = `${req.body.status || ''}`.trim();
  const status = ALLOWED_CREATE_STATUSES.has(requestedStatus) ? requestedStatus : 'scheduled';

  const auction = await Auction.create({
    product: product._id,
    seller: product.seller,
    startAt: req.body.startAt,
    endAt: req.body.endAt,
    startingBid: pricing.startingBid,
    currentBid: pricing.currentBid,
    reservePrice: pricing.reservePrice,
    buyNowPrice: pricing.buyNowPrice,
    bidStep: pricing.bidStep,
    minimumBidStep: pricing.minimumBidStep,
    autoExtendMinutes: req.body.autoExtendMinutes,
    status,
  });

  await syncProductForAuction(product, auction.status, pricing);

  if (auction.status === 'scheduled' || auction.status === 'live') {
    await runAuctionLifecycleTick();
  }

  return sendSuccess(res, auction, null, 201);
});

exports.updateAuction = asyncHandler(async (req, res) => {
  const auction = await Auction.findById(req.params.id);
  if (!auction) {
    return sendError(res, 'Auction not found', 404);
  }

  const isAdmin = (req.userRoles || []).includes('admin');
  const isOwner = String(auction.seller) === String(req.user._id);
  if (!isOwner && !isAdmin) {
    return sendError(res, 'Forbidden', 403);
  }
  if (!AUCTION_EDITABLE_STATUSES.has(auction.status) && !isAdmin) {
    return sendError(res, 'Auction can no longer be edited', 400);
  }

  const product = await Product.findById(auction.product);
  if (!product) {
    return sendError(res, 'Product not found', 404);
  }

  const pricing = buildAuctionPricing(product, {
    startingBid: req.body.startingBid ?? auction.startingBid,
    currentBid: req.body.currentBid ?? auction.currentBid,
    reservePrice: req.body.reservePrice ?? auction.reservePrice,
    buyNowPrice: req.body.buyNowPrice ?? auction.buyNowPrice,
    bidStep: req.body.bidStep ?? auction.bidStep,
  });

  Object.assign(
    auction,
    cleanObject({
      startAt: req.body.startAt,
      endAt: req.body.endAt,
      startingBid: pricing.startingBid,
      currentBid: pricing.currentBid,
      reservePrice: pricing.reservePrice,
      buyNowPrice: pricing.buyNowPrice,
      bidStep: pricing.bidStep,
      minimumBidStep: pricing.minimumBidStep,
      autoExtendMinutes: req.body.autoExtendMinutes,
    })
  );

  if (!isAdmin) {
    const requestedStatus = `${req.body.status || ''}`.trim();
    auction.status = ALLOWED_CREATE_STATUSES.has(requestedStatus)
      ? requestedStatus
      : auction.status || 'scheduled';
  }

  await auction.save();
  await syncProductForAuction(product, auction.status, pricing);

  return sendSuccess(res, auction);
});

exports.placeBid = asyncHandler(async (req, res) => {
  const auction = await Auction.findById(req.params.id);
  if (!auction) {
    return sendError(res, 'Auction not found', 404);
  }
  if (String(auction.seller) === String(req.user._id)) {
    return sendError(res, 'Owner cannot bid on own auction', 400);
  }
  if (auction.status !== 'live') {
    return sendError(res, 'Auction is not live', 400);
  }

  const now = new Date();
  if (auction.startAt > now || auction.endAt <= now) {
    return sendError(res, 'Auction is outside the bidding window', 400);
  }

  const product = await Product.findById(auction.product);
  if (!product) {
    return sendError(res, 'Product not found', 404);
  }

  const minimumBid = Math.max(auction.currentBid || 0, auction.startingBid || 0) + (auction.bidStep || 1);
  const amount = Number(req.body.amount || 0);
  if (amount < minimumBid) {
    return sendError(res, `Bid must be at least ${minimumBid}`, 400);
  }

  const currentWinningBid = await Bid.findOne({ auction: auction._id, isWinning: true });
  const reservedAmount = getAuctionParticipationAmount({ auction, product, amount });
  const bidder = await User.findById(req.user._id);
  if (!bidder) {
    return sendError(res, 'Bidder not found', 404);
  }

  if (currentWinningBid && String(currentWinningBid.bidder) === String(req.user._id)) {
    const currentReserved = Number(currentWinningBid.reservedAmount || currentWinningBid.amount || 0);
    const delta = reservedAmount - currentReserved;
    if (delta > 0) {
      await reserveWalletFunds({
        userId: req.user._id,
        amount: delta,
        auction: auction._id,
        bid: currentWinningBid._id,
        description: 'Increased reserve for higher winning bid',
      });
    } else if (delta < 0) {
      await releaseWalletReserve({
        userId: req.user._id,
        amount: Math.abs(delta),
        auction: auction._id,
        bid: currentWinningBid._id,
        description: 'Adjusted reserve for updated winning bid',
      });
    }
  } else {
    const availableBalance = Number(bidder.balance || 0) - Number(bidder.lockedBalance || 0);
    if (availableBalance < reservedAmount) {
      return sendError(
        res,
        `Wallet balance is not enough to participate. Required: ${reservedAmount}`,
        400
      );
    }
    await reserveWalletFunds({
      userId: req.user._id,
      amount: reservedAmount,
      auction: auction._id,
      description: 'Reserved wallet funds for auction participation',
    });
  }

  if (currentWinningBid && String(currentWinningBid.bidder) !== String(req.user._id)) {
    await releaseWalletReserve({
      userId: currentWinningBid.bidder,
      amount: currentWinningBid.reservedAmount || currentWinningBid.amount,
      auction: auction._id,
      bid: currentWinningBid._id,
      description: 'Outbid reserve unlocked',
    });

    await createNotification({
      userId: currentWinningBid.bidder,
      title: 'Bạn đã bị vượt giá',
      message: 'Có người vừa trả giá cao hơn trong phiên đấu giá bạn tham gia.',
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
  const bid = await Bid.create({
    auction: auction._id,
    product: auction.product,
    bidder: req.user._id,
    amount,
    reservedAmount,
    maxAutoBid: req.body.maxAutoBid,
    source: req.body.source || 'manual',
    status: 'active',
    isWinning: true,
  });

  auction.currentBid = amount;
  auction.winnerUser = req.user._id;
  auction.winnerBid = bid._id;
  auction.totalBids += 1;
  auction.lastBidAt = new Date();
  await auction.save();

  await Product.findByIdAndUpdate(auction.product, { currentBid: amount });

  await createNotification({
    userId: auction.seller,
    title: 'Có trả giá mới',
    message: `Phiên đấu giá vừa có người trả giá ${amount.toLocaleString('vi-VN')} VND.`,
    type: 'auction_bid',
    refType: 'auction',
    refId: String(auction._id),
    metadata: { auctionId: String(auction._id), bidId: String(bid._id) },
  });

  return sendSuccess(res, bid, null, 201);
});

exports.buyNow = asyncHandler(async (req, res) => {
  const auction = await Auction.findById(req.params.id);
  if (!auction) {
    return sendError(res, 'Auction not found', 404);
  }
  if (!['scheduled', 'live'].includes(auction.status)) {
    return sendError(res, 'Auction is not available for buy-now', 400);
  }
  if (String(auction.seller) === String(req.user._id)) {
    return sendError(res, 'Owner cannot buy own auction', 400);
  }

  const product = await Product.findById(auction.product);
  if (!product) {
    return sendError(res, 'Product not found', 404);
  }

  const buyNowPrice = Number(auction.buyNowPrice || product.buyNowPrice || product.price || 0);
  if (buyNowPrice <= 0) {
    return sendError(res, 'Auction does not support buy-now', 400);
  }

  const buyer = await User.findById(req.user._id);
  const availableBalance = Number(buyer.balance || 0) - Number(buyer.lockedBalance || 0);
  if (availableBalance < buyNowPrice) {
    return sendError(res, `Wallet balance is not enough. Required: ${buyNowPrice}`, 400);
  }

  const currentWinningBid = await Bid.findOne({ auction: auction._id, isWinning: true });
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

  const buyNowBid = await Bid.create({
    auction: auction._id,
    product: auction.product,
    bidder: req.user._id,
    amount: buyNowPrice,
    reservedAmount: 0,
    source: 'proxy',
    status: 'won',
    isWinning: true,
  });

  const order = await createAuctionSettlementOrder({
    auction,
    buyerId: req.user._id,
    product,
    amount: buyNowPrice,
    type: 'auction_buy_now',
    buyerNotes: 'Generated from auction buy-now flow',
  });

  auction.status = 'ended';
  auction.currentBid = buyNowPrice;
  auction.winnerUser = req.user._id;
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
      title: 'Đấu giá kết thúc (mua ngay)',
      message: `Người mua đã chọn mua ngay với giá ${buyNowPrice.toLocaleString('vi-VN')} VND.`,
      type: 'auction_buy_now',
      refType: 'auction',
      refId: String(auction._id),
      metadata: { auctionId: String(auction._id), orderId: String(order._id) },
    }),
    createNotification({
      userId: req.user._id,
      title: 'Mua ngay thành công',
      message: `Bạn đã mua ngay sản phẩm đấu giá với giá ${buyNowPrice.toLocaleString('vi-VN')} VND.`,
      type: 'auction_buy_now',
      refType: 'auction',
      refId: String(auction._id),
      metadata: { auctionId: String(auction._id), orderId: String(order._id) },
    }),
  ]);

  return sendSuccess(res, { auction, order, bid: buyNowBid });
});

exports.closeAuction = asyncHandler(async (req, res) => {
  const auction = await Auction.findById(req.params.id);
  if (!auction) {
    return sendError(res, 'Auction not found', 404);
  }
  const isOwner = String(auction.seller) === String(req.user._id);
  const isAdmin = (req.userRoles || []).includes('admin');
  if (!isOwner && !isAdmin) {
    return sendError(res, 'Forbidden', 403);
  }
  const result = await closeAuction(auction._id, {
    force: Boolean(req.body.force || isAdmin),
    cancelled: Boolean(req.body.cancelled),
  });

  return sendSuccess(res, result);
});

exports.openAuction = asyncHandler(async (req, res) => {
  const auction = await Auction.findById(req.params.id);
  if (!auction) {
    return sendError(res, 'Auction not found', 404);
  }
  const isOwner = String(auction.seller) === String(req.user._id);
  const isAdmin = (req.userRoles || []).includes('admin');
  if (!isOwner && !isAdmin) {
    return sendError(res, 'Forbidden', 403);
  }
  const now = new Date();
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

  return sendSuccess(res, auction);
});

exports.deleteAuction = asyncHandler(async (req, res) => {
  const auction = await Auction.findById(req.params.id);
  if (!auction) {
    return sendError(res, 'Auction not found', 404);
  }
  if (String(auction.seller) !== String(req.user._id) && !(req.userRoles || []).includes('admin')) {
    return sendError(res, 'Forbidden', 403);
  }

  const currentWinningBid = await Bid.findOne({ auction: auction._id, isWinning: true });
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
  return sendSuccess(res, { deleted: true });
});
