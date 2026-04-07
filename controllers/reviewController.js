var schemas = require('../schemas');
var httpLib = require('../lib/http');

var Order = schemas.Order;
var Review = schemas.Review;
var User = schemas.User;
var buildPaginationMeta = httpLib.buildPaginationMeta;
var parsePagination = httpLib.parsePagination;

var createControllerError = function(message, status, details) {
  var error = new Error(message);
  error.status = status || 400;
  if (details !== undefined) {
    error.details = details;
  }
  return error;
};

var canManageReview = function(review, actor) {
  return (actor.userRoles || []).indexOf('admin') !== -1 ||
    String(review.reviewer) === String(actor.user && actor.user._id) ||
    String(review.reviewee) === String(actor.user && actor.user._id);
};

var updateUserRating = async function(userId) {
  var reviews = await Review.find({ reviewee: userId, isVisible: true });
  var ratingCount = reviews.length;
  var ratingAvg = ratingCount === 0
    ? 0
    : reviews.reduce(function(sum, review) {
      return sum + review.score;
    }, 0) / ratingCount;

  await User.findByIdAndUpdate(userId, { ratingCount: ratingCount, ratingAvg: ratingAvg });
};

module.exports.listReviews = async function(query) {
  var pagination = parsePagination(query || {});
  var page = pagination.page;
  var limit = pagination.limit;
  var skip = pagination.skip;
  var filter = {};
  var results;

  if (query && query.productId) {
    filter.product = query.productId;
  }
  if (query && query.revieweeId) {
    filter.reviewee = query.revieweeId;
  }
  if (query && query.reviewerId) {
    filter.reviewer = query.reviewerId;
  }
  if (query && query.visible !== undefined) {
    filter.isVisible = query.visible === 'true';
  }

  results = await Promise.all([
    Review.find(filter)
      .populate('product', 'title thumbnailImage')
      .populate('reviewer', 'username fullName avatarUrl')
      .populate('reviewee', 'username fullName avatarUrl')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Review.countDocuments(filter),
  ]);

  return {
    data: results[0],
    meta: buildPaginationMeta(page, limit, results[1]),
  };
};

module.exports.getReviewById = async function(reviewId) {
  return Review.findById(reviewId)
    .populate('product', 'title thumbnailImage')
    .populate('reviewer', 'username fullName avatarUrl')
    .populate('reviewee', 'username fullName avatarUrl');
};

module.exports.createReview = async function(body, actor) {
  var order = await Order.findById(body.orderId).populate('product');
  var reviewerId;
  var isBuyer;
  var isSeller;
  var reviewee;
  var existing;
  var review;

  if (!order) {
    throw createControllerError('Order not found', 404);
  }

  reviewerId = String(actor.user && actor.user._id);
  isBuyer = String(order.buyer) === reviewerId;
  isSeller = String(order.seller) === reviewerId;
  if (!isBuyer && !isSeller && (actor.userRoles || []).indexOf('admin') === -1) {
    throw createControllerError('Forbidden', 403);
  }

  reviewee = isBuyer ? order.seller : order.buyer;
  existing = await Review.findOne({ order: order._id, reviewer: actor.user._id });
  if (existing) {
    throw createControllerError('Review already exists for this order', 409);
  }

  review = await Review.create({
    order: order._id,
    product: order.product && order.product._id ? order.product._id : order.product,
    reviewer: actor.user._id,
    reviewee: reviewee,
    score: Number(body.score),
    comment: body.comment,
    mediaIds: body.mediaIds,
    images: body.images,
    isVisible: body.isVisible !== undefined ? Boolean(body.isVisible) : true,
  });

  await updateUserRating(reviewee);
  return review;
};

module.exports.respondToReview = async function(reviewId, body, actor) {
  var review = await Review.findById(reviewId);

  if (!review) {
    return null;
  }
  if (!canManageReview(review, actor)) {
    throw createControllerError('Forbidden', 403);
  }

  review.sellerResponse = {
    content: body.content || '',
    respondedAt: new Date(),
  };
  await review.save();

  return review;
};

module.exports.updateVisibility = async function(reviewId, body, actor) {
  var review = await Review.findById(reviewId);

  if (!review) {
    return null;
  }
  if ((actor.userRoles || []).indexOf('admin') === -1) {
    throw createControllerError('Forbidden', 403);
  }

  review.isVisible = body.isVisible !== undefined ? Boolean(body.isVisible) : review.isVisible;
  await review.save();
  await updateUserRating(review.reviewee);

  return review;
};
