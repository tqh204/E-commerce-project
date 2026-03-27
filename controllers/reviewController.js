const { Order, Product, Review, User } = require('../schemas');
const {
  asyncHandler,
  buildPaginationMeta,
  parsePagination,
  sendError,
  sendSuccess,
} = require('../lib/http');

const canManageReview = (review, req) =>
  (req.userRoles || []).includes('admin') ||
  String(review.reviewer) === String(req.user._id) ||
  String(review.reviewee) === String(req.user._id);

const updateUserRating = async (userId) => {
  const reviews = await Review.find({ reviewee: userId, isVisible: true });
  const ratingCount = reviews.length;
  const ratingAvg =
    ratingCount === 0 ? 0 : reviews.reduce((sum, review) => sum + review.score, 0) / ratingCount;

  await User.findByIdAndUpdate(userId, { ratingCount, ratingAvg });
};

exports.listReviews = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = {};

  if (req.query.productId) {
    filter.product = req.query.productId;
  }
  if (req.query.revieweeId) {
    filter.reviewee = req.query.revieweeId;
  }
  if (req.query.reviewerId) {
    filter.reviewer = req.query.reviewerId;
  }
  if (req.query.visible !== undefined) {
    filter.isVisible = req.query.visible === 'true';
  }

  const [reviews, total] = await Promise.all([
    Review.find(filter)
      .populate('product', 'title thumbnailImage')
      .populate('reviewer', 'username fullName avatarUrl')
      .populate('reviewee', 'username fullName avatarUrl')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Review.countDocuments(filter),
  ]);

  return sendSuccess(res, reviews, buildPaginationMeta(page, limit, total));
});

exports.getReviewById = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id)
    .populate('product', 'title thumbnailImage')
    .populate('reviewer', 'username fullName avatarUrl')
    .populate('reviewee', 'username fullName avatarUrl');

  if (!review) {
    return sendError(res, 'Review not found', 404);
  }

  return sendSuccess(res, review);
});

exports.createReview = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.body.orderId).populate('product');
  if (!order) {
    return sendError(res, 'Order not found', 404);
  }

  const reviewerId = String(req.user._id);
  const isBuyer = String(order.buyer) === reviewerId;
  const isSeller = String(order.seller) === reviewerId;
  if (!isBuyer && !isSeller && !(req.userRoles || []).includes('admin')) {
    return sendError(res, 'Forbidden', 403);
  }

  const reviewee = isBuyer ? order.seller : order.buyer;
  const existing = await Review.findOne({ order: order._id, reviewer: req.user._id });
  if (existing) {
    return sendError(res, 'Review already exists for this order', 409);
  }

  const review = await Review.create({
    order: order._id,
    product: order.product?._id || order.product,
    reviewer: req.user._id,
    reviewee,
    score: Number(req.body.score),
    comment: req.body.comment,
    mediaIds: req.body.mediaIds,
    images: req.body.images,
    isVisible: req.body.isVisible !== undefined ? Boolean(req.body.isVisible) : true,
  });

  await updateUserRating(reviewee);
  return sendSuccess(res, review, null, 201);
});

exports.respondToReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) {
    return sendError(res, 'Review not found', 404);
  }
  if (!canManageReview(review, req)) {
    return sendError(res, 'Forbidden', 403);
  }

  review.sellerResponse = {
    content: req.body.content || '',
    respondedAt: new Date(),
  };
  await review.save();

  return sendSuccess(res, review);
});

exports.updateVisibility = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) {
    return sendError(res, 'Review not found', 404);
  }
  if (!(req.userRoles || []).includes('admin')) {
    return sendError(res, 'Forbidden', 403);
  }

  review.isVisible = req.body.isVisible !== undefined ? Boolean(req.body.isVisible) : review.isVisible;
  await review.save();
  await updateUserRating(review.reviewee);

  return sendSuccess(res, review);
});
