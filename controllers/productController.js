const { Category, Product } = require('../schemas');
const {
  asyncHandler,
  buildPaginationMeta,
  cleanObject,
  parsePagination,
  sendError,
  sendSuccess,
} = require('../lib/http');

const canModerateProducts = (req) => (req.userRoles || []).includes('admin');
const canViewOwnSellerListings = (req) =>
  req.user &&
  req.query.sellerId &&
  String(req.query.sellerId) === String(req.user._id);
const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const applyProductStatusTimestamps = (product) => {
  if (product.status === 'active') {
    product.publishedAt = product.publishedAt || new Date();
  } else if (product.status === 'draft' || product.status === 'pending') {
    product.publishedAt = null;
  }

  if (product.status === 'sold') {
    product.soldAt = product.soldAt || new Date();
  } else {
    product.soldAt = null;
  }
};

const buildProductFilter = (req) => {
  const filter = {};
  if (req.query.categoryId) {
    filter.category = req.query.categoryId;
  }
  if (req.query.sellerId) {
    filter.seller = req.query.sellerId;
  }
  if (req.query.saleType) {
    filter.saleType = req.query.saleType;
  }
  if (req.query.source) {
    filter.source = req.query.source;
  }
  if (req.query.status) {
    filter.status = req.query.status;
  } else if (!canModerateProducts(req) && !canViewOwnSellerListings(req)) {
    filter.status = 'active';
  }
  if (req.query.minPrice || req.query.maxPrice) {
    filter.price = {};
    if (req.query.minPrice) filter.price.$gte = Number(req.query.minPrice);
    if (req.query.maxPrice) filter.price.$lte = Number(req.query.maxPrice);
  }
  if (req.query.q) {
    const keyword = String(req.query.q || '').trim();
    const regex = new RegExp(escapeRegex(keyword), 'i');
    filter.$or = [{ title: regex }, { description: regex }, { tags: regex }];
  }
  if (req.query.lng && req.query.lat) {
    filter.location = {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [Number(req.query.lng), Number(req.query.lat)],
        },
        $maxDistance: Number(req.query.radius || 10) * 1000,
      },
    };
  }
  return filter;
};

exports.getAllProducts = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = buildProductFilter(req);
  const sort = req.query.sort === 'price_asc'
    ? { price: 1 }
    : req.query.sort === 'price_desc'
      ? { price: -1 }
      : { createdAt: -1 };

  const [products, total] = await Promise.all([
    Product.find(filter)
      .populate('category', 'name slug')
      .populate('seller', 'username fullName avatarUrl ratingAvg')
      .sort(sort)
      .skip(skip)
      .limit(limit),
    Product.countDocuments(filter),
  ]);

  return sendSuccess(res, products, buildPaginationMeta(page, limit, total));
});

exports.getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id)
    .populate('category', 'name slug')
    .populate('seller', 'username fullName avatarUrl ratingAvg');

  if (!product) {
    return sendError(res, 'Product not found', 404);
  }

  // Chỉ tăng lượt xem khi người dùng đã đăng nhập và không phải chính người bán
  const viewerId = req.user ? String(req.user._id) : null;
  const sellerId = String(product.seller?._id || product.seller);
  const hasViewed = (product.viewedBy || []).some((userId) => String(userId) === viewerId);
  if (viewerId && viewerId !== sellerId && !hasViewed) {
    await Product.updateOne(
      { _id: product._id, viewedBy: { $ne: req.user._id } },
      {
        $inc: { viewsCount: 1 },
        $addToSet: { viewedBy: req.user._id },
      }
    );
    product.viewsCount += 1;
  }
  return sendSuccess(res, product);
});

exports.createProduct = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.body.categoryId || req.body.category);
  if (!category) {
    return sendError(res, 'Category not found', 404);
  }

  const city = req.body.city || req.body.province || '';
  const region = req.body.region || city;

  const product = new Product({
    seller: req.user._id,
    category: category._id,
    title: req.body.title || req.body.name,
    description: req.body.description,
    saleType: req.body.saleType,
    price: req.body.price,
    startingBid: req.body.startingBid,
    currentBid: req.body.currentBid,
    buyNowPrice: req.body.buyNowPrice,
    bidStep: req.body.bidStep,
    reservePrice: req.body.reservePrice,
    condition: req.body.condition,
    status: req.body.status || 'active',
    inventory: req.body.inventory,
    fulfillmentType: req.body.fulfillmentType,
    isNegotiable: req.body.isNegotiable ?? req.body.negotiable,
    images: req.body.images,
    mediaIds: req.body.mediaIds,
    addressText: req.body.addressText || req.body.address,
    province: req.body.province || city,
    city,
    region,
    district: req.body.district,
    ward: req.body.ward,
    location: req.body.location,
    tags: req.body.tags,
    source: req.body.source || 'manual',
    sourceUrl: req.body.sourceUrl,
    sourceExternalId: req.body.sourceExternalId,
  });
  applyProductStatusTimestamps(product);
  await product.save();

  return sendSuccess(res, product, null, 201);
});

exports.updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    return sendError(res, 'Product not found', 404);
  }

  const isOwner = String(product.seller) === String(req.user._id);
  const isAdmin = (req.userRoles || []).includes('admin');
  if (!isOwner && !isAdmin) {
    return sendError(res, 'Forbidden', 403);
  }

  if (req.body.categoryId || req.body.category) {
    const category = await Category.findById(req.body.categoryId || req.body.category);
    if (!category) {
      return sendError(res, 'Category not found', 404);
    }
  }

  const city = req.body.city || req.body.province;
  const region = req.body.region || city;

  Object.assign(
    product,
    cleanObject({
      category: req.body.categoryId || req.body.category,
      title: req.body.title || req.body.name,
      description: req.body.description,
      saleType: req.body.saleType,
      price: req.body.price,
      startingBid: req.body.startingBid,
      currentBid: req.body.currentBid,
      buyNowPrice: req.body.buyNowPrice,
      bidStep: req.body.bidStep,
      reservePrice: req.body.reservePrice,
      condition: req.body.condition,
      status: req.body.status,
      inventory: req.body.inventory,
      fulfillmentType: req.body.fulfillmentType,
      isNegotiable: req.body.isNegotiable ?? req.body.negotiable,
      images: req.body.images,
      mediaIds: req.body.mediaIds,
      addressText: req.body.addressText || req.body.address,
      province: req.body.province || city,
      city,
      region,
      district: req.body.district,
      ward: req.body.ward,
      location: req.body.location,
      tags: req.body.tags,
      sourceUrl: req.body.sourceUrl,
      sourceExternalId: req.body.sourceExternalId,
    })
  );
  applyProductStatusTimestamps(product);

  await product.save();
  return sendSuccess(res, product);
});

exports.deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    return sendError(res, 'Product not found', 404);
  }

  const isOwner = String(product.seller) === String(req.user._id);
  const isAdmin = (req.userRoles || []).includes('admin');
  if (!isOwner && !isAdmin) {
    return sendError(res, 'Forbidden', 403);
  }

  await product.deleteOne();
  return sendSuccess(res, { deleted: true });
});
