const { Category, Product } = require('../schemas');
const {
  asyncHandler,
  buildPaginationMeta,
  cleanObject,
  parsePagination,
  sendError,
  sendSuccess,
} = require('../lib/http');

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
  } else if (!(req.userRoles || []).includes('admin')) {
    filter.status = 'active';
  }
  if (req.query.minPrice || req.query.maxPrice) {
    filter.price = {};
    if (req.query.minPrice) filter.price.$gte = Number(req.query.minPrice);
    if (req.query.maxPrice) filter.price.$lte = Number(req.query.maxPrice);
  }
  if (req.query.q) {
    filter.$text = { $search: req.query.q };
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

  product.viewsCount += 1;
  await product.save();
  return sendSuccess(res, product);
});

exports.createProduct = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.body.categoryId || req.body.category);
  if (!category) {
    return sendError(res, 'Category not found', 404);
  }

  const product = await Product.create({
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
    images: req.body.images,
    mediaIds: req.body.mediaIds,
    addressText: req.body.addressText || req.body.address,
    province: req.body.province,
    district: req.body.district,
    ward: req.body.ward,
    location: req.body.location,
    tags: req.body.tags,
    source: req.body.source || 'manual',
    sourceUrl: req.body.sourceUrl,
    sourceExternalId: req.body.sourceExternalId,
  });

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
      images: req.body.images,
      mediaIds: req.body.mediaIds,
      addressText: req.body.addressText || req.body.address,
      province: req.body.province,
      district: req.body.district,
      ward: req.body.ward,
      location: req.body.location,
      tags: req.body.tags,
      sourceUrl: req.body.sourceUrl,
      sourceExternalId: req.body.sourceExternalId,
    })
  );

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
