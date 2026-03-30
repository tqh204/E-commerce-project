const { Auction, Bid, Product } = require('../schemas');
const { closeAuction, runAuctionLifecycleTick } = require('../lib/auctionLifecycle');
const {
  asyncHandler,
  buildPaginationMeta,
  cleanObject,
  parsePagination,
  sendError,
  sendSuccess,
} = require('../lib/http');

exports.listAuctions = asyncHandler(async (req, res) => {
  await runAuctionLifecycleTick();
  const { page, limit, skip } = parsePagination(req.query);
  const filter = {};
  if (req.query.status) {
    filter.status = req.query.status;
  }
  const [auctions, total] = await Promise.all([
    Auction.find(filter)
      .populate('product', 'title price thumbnailImage status')
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
    .populate('product', 'title price thumbnailImage status')
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
  if (String(product.seller) !== String(req.user._id) && !(req.userRoles || []).includes('admin')) {
    return sendError(res, 'Forbidden', 403);
  }

  const auction = await Auction.create({
    product: product._id,
    seller: product.seller,
    startAt: req.body.startAt,
    endAt: req.body.endAt,
    startingBid: req.body.startingBid,
    currentBid: req.body.currentBid || req.body.startingBid,
    reservePrice: req.body.reservePrice,
    buyNowPrice: req.body.buyNowPrice,
    bidStep: req.body.bidStep,
    autoExtendMinutes: req.body.autoExtendMinutes,
    status: req.body.status || 'scheduled',
  });

  product.saleType = 'auction';
  product.startingBid = auction.startingBid;
  product.currentBid = auction.currentBid;
  product.buyNowPrice = auction.buyNowPrice;
  product.status = auction.status === 'live' ? 'active' : product.status;
  await product.save();

  return sendSuccess(res, auction, null, 201);
});

exports.updateAuction = asyncHandler(async (req, res) => {
  const auction = await Auction.findById(req.params.id);
  if (!auction) {
    return sendError(res, 'Auction not found', 404);
  }
  if (String(auction.seller) !== String(req.user._id) && !(req.userRoles || []).includes('admin')) {
    return sendError(res, 'Forbidden', 403);
  }

  Object.assign(
    auction,
    cleanObject({
      startAt: req.body.startAt,
      endAt: req.body.endAt,
      startingBid: req.body.startingBid,
      currentBid: req.body.currentBid,
      reservePrice: req.body.reservePrice,
      buyNowPrice: req.body.buyNowPrice,
      bidStep: req.body.bidStep,
      autoExtendMinutes: req.body.autoExtendMinutes,
      status: req.body.status,
    })
  );
  await auction.save();

  return sendSuccess(res, auction);
});

exports.placeBid = asyncHandler(async (req, res) => {
  const auction = await Auction.findById(req.params.id);
  if (!auction) {
    return sendError(res, 'Auction not found', 404);
  }
  if (String(auction.seller) === String(req.user._id)) {
    return sendError(res, 'Seller cannot bid on own auction', 400);
  }

  const now = new Date();
  if (auction.status !== 'live' && !(auction.startAt <= now && auction.endAt >= now)) {
    return sendError(res, 'Auction is not live', 400);
  }

  const minimumBid = Math.max(auction.currentBid || 0, auction.startingBid || 0) + (auction.bidStep || 1);
  const amount = Number(req.body.amount || 0);
  if (amount < minimumBid) {
    return sendError(res, `Bid must be at least ${minimumBid}`, 400);
  }

  await Bid.updateMany({ auction: auction._id, isWinning: true }, { $set: { isWinning: false, status: 'outbid' } });
  const bid = await Bid.create({
    auction: auction._id,
    product: auction.product,
    bidder: req.user._id,
    amount,
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
  auction.status = 'live';
  await auction.save();

  await Product.findByIdAndUpdate(auction.product, { currentBid: amount });

  return sendSuccess(res, bid, null, 201);
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

  await Bid.deleteMany({ auction: auction._id });
  await auction.deleteOne();
  return sendSuccess(res, { deleted: true });
});
