var schemas = require('../schemas');
var httpLib = require('../lib/http');

var Category = schemas.Category;
var Product = schemas.Product;
var buildPaginationMeta = httpLib.buildPaginationMeta;
var cleanObject = httpLib.cleanObject;
var parsePagination = httpLib.parsePagination;

var createControllerError = function(message, status, details) {
  var error = new Error(message);
  error.status = status || 400;
  if (details !== undefined) {
    error.details = details;
  }
  return error;
};

var canModerateProducts = function(userRoles) {
  return (userRoles || []).indexOf('admin') !== -1;
};

var canViewOwnSellerListings = function(actor, query) {
  return actor.user && query && query.sellerId && String(query.sellerId) === String(actor.user._id);
};

var escapeRegex = function(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

var applyProductStatusTimestamps = function(product) {
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

var buildProductFilter = function(query, actor) {
  var filter = {};
  var keyword;
  var regex;

  if (query.categoryId) {
    filter.category = query.categoryId;
  }
  if (query.sellerId) {
    filter.seller = query.sellerId;
  }
  if (query.saleType) {
    filter.saleType = query.saleType;
  }
  if (query.source) {
    filter.source = query.source;
  }
  if (query.status) {
    filter.status = query.status;
  } else if (!canModerateProducts(actor.userRoles) && !canViewOwnSellerListings(actor, query)) {
    filter.status = 'active';
  }
  if (query.minPrice || query.maxPrice) {
    filter.price = {};
    if (query.minPrice) {
      filter.price.$gte = Number(query.minPrice);
    }
    if (query.maxPrice) {
      filter.price.$lte = Number(query.maxPrice);
    }
  }
  if (query.q) {
    keyword = String(query.q || '').trim();
    regex = new RegExp(escapeRegex(keyword), 'i');
    filter.$or = [{ title: regex }, { description: regex }, { tags: regex }];
  }
  if (query.lng && query.lat) {
    filter.location = {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [Number(query.lng), Number(query.lat)],
        },
        $maxDistance: Number(query.radius || 10) * 1000,
      },
    };
  }
  return filter;
};

module.exports.getAllProducts = async function(query, actor) {
  var pagination = parsePagination(query || {});
  var page = pagination.page;
  var limit = pagination.limit;
  var skip = pagination.skip;
  var filter = buildProductFilter(query || {}, actor || {});
  var sort;
  var results;

  if (query && query.sort === 'price_asc') {
    sort = { price: 1 };
  } else if (query && query.sort === 'price_desc') {
    sort = { price: -1 };
  } else {
    sort = { createdAt: -1 };
  }

  results = await Promise.all([
    Product.find(filter)
      .populate('category', 'name slug')
      .populate('seller', 'username fullName avatarUrl ratingAvg')
      .sort(sort)
      .skip(skip)
      .limit(limit),
    Product.countDocuments(filter),
  ]);

  return {
    data: results[0],
    meta: buildPaginationMeta(page, limit, results[1]),
  };
};

module.exports.getProductById = async function(productId, actor) {
  var product = await Product.findById(productId)
    .populate('category', 'name slug')
    .populate('seller', 'username fullName avatarUrl ratingAvg');
  var viewerId;
  var sellerId;
  var hasViewed;

  if (!product) {
    return null;
  }

  viewerId = actor.user ? String(actor.user._id) : null;
  sellerId = String((product.seller && product.seller._id) || product.seller);
  hasViewed = (product.viewedBy || []).some(function(userId) {
    return String(userId) === viewerId;
  });
  if (viewerId && viewerId !== sellerId && !hasViewed) {
    await Product.updateOne(
      { _id: product._id, viewedBy: { $ne: actor.user._id } },
      {
        $inc: { viewsCount: 1 },
        $addToSet: { viewedBy: actor.user._id },
      }
    );
    product.viewsCount += 1;
  }

  return product;
};

module.exports.createProduct = async function(body, actor) {
  var category = await Category.findById(body.categoryId || body.category);
  var city;
  var region;
  var isNegotiable;
  var product;

  if (!category) {
    throw createControllerError('Category not found', 404);
  }

  city = body.city || body.province || '';
  region = body.region || city;
  isNegotiable = body.isNegotiable !== undefined && body.isNegotiable !== null
    ? body.isNegotiable
    : body.negotiable;

  product = new Product({
    seller: actor.user._id,
    category: category._id,
    title: body.title || body.name,
    description: body.description,
    saleType: body.saleType,
    price: body.price,
    startingBid: body.startingBid,
    currentBid: body.currentBid,
    buyNowPrice: body.buyNowPrice,
    bidStep: body.bidStep,
    reservePrice: body.reservePrice,
    condition: body.condition,
    status: body.status || 'active',
    inventory: body.inventory,
    fulfillmentType: body.fulfillmentType,
    isNegotiable: isNegotiable,
    images: body.images,
    mediaIds: body.mediaIds,
    addressText: body.addressText || body.address,
    province: body.province || city,
    city: city,
    region: region,
    district: body.district,
    ward: body.ward,
    location: body.location,
    tags: body.tags,
    source: body.source || 'manual',
    sourceUrl: body.sourceUrl,
    sourceExternalId: body.sourceExternalId,
  });
  applyProductStatusTimestamps(product);
  await product.save();

  return product;
};

module.exports.updateProduct = async function(productId, body, actor) {
  var product = await Product.findById(productId);
  var isOwner;
  var isAdmin;
  var category;
  var city;
  var region;
  var isNegotiable;

  if (!product) {
    return null;
  }

  isOwner = String(product.seller) === String(actor.user && actor.user._id);
  isAdmin = (actor.userRoles || []).indexOf('admin') !== -1;
  if (!isOwner && !isAdmin) {
    throw createControllerError('Forbidden', 403);
  }

  if (body.categoryId || body.category) {
    category = await Category.findById(body.categoryId || body.category);
    if (!category) {
      throw createControllerError('Category not found', 404);
    }
  }

  city = body.city || body.province;
  region = body.region || city;
  isNegotiable = body.isNegotiable !== undefined && body.isNegotiable !== null
    ? body.isNegotiable
    : body.negotiable;

  Object.assign(
    product,
    cleanObject({
      category: body.categoryId || body.category,
      title: body.title || body.name,
      description: body.description,
      saleType: body.saleType,
      price: body.price,
      startingBid: body.startingBid,
      currentBid: body.currentBid,
      buyNowPrice: body.buyNowPrice,
      bidStep: body.bidStep,
      reservePrice: body.reservePrice,
      condition: body.condition,
      status: body.status,
      inventory: body.inventory,
      fulfillmentType: body.fulfillmentType,
      isNegotiable: isNegotiable,
      images: body.images,
      mediaIds: body.mediaIds,
      addressText: body.addressText || body.address,
      province: body.province || city,
      city: city,
      region: region,
      district: body.district,
      ward: body.ward,
      location: body.location,
      tags: body.tags,
      sourceUrl: body.sourceUrl,
      sourceExternalId: body.sourceExternalId,
    })
  );
  applyProductStatusTimestamps(product);

  await product.save();
  return product;
};

module.exports.deleteProduct = async function(productId, actor) {
  var product = await Product.findById(productId);
  var isOwner;
  var isAdmin;

  if (!product) {
    return false;
  }

  isOwner = String(product.seller) === String(actor.user && actor.user._id);
  isAdmin = (actor.userRoles || []).indexOf('admin') !== -1;
  if (!isOwner && !isAdmin) {
    throw createControllerError('Forbidden', 403);
  }

  await product.deleteOne();
  return true;
};
