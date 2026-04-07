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

module.exports.listCategories = async function(query) {
  var pagination = parsePagination(query || {});
  var page = pagination.page;
  var limit = pagination.limit;
  var skip = pagination.skip;
  var filter = {};
  var results;
  var categories;
  var total;
  var categoryIds;
  var productCounts;
  var productCountMap;
  var categoriesWithCounts;

  if (query && query.parentCategory) {
    filter.parentCategory = query.parentCategory;
  }
  if (query && query.isActive !== undefined) {
    filter.isActive = query.isActive === 'true';
  }

  results = await Promise.all([
    Category.find(filter)
      .populate('parentCategory', 'name slug')
      .sort({ sortOrder: 1, name: 1 })
      .skip(skip)
      .limit(limit),
    Category.countDocuments(filter),
  ]);
  categories = results[0];
  total = results[1];

  categoryIds = categories.map(function(category) {
    return category._id;
  });
  productCounts = categoryIds.length
    ? await Product.aggregate([
        { $match: { category: { $in: categoryIds } } },
        { $group: { _id: '$category', total: { $sum: 1 } } },
      ])
    : [];

  productCountMap = new Map();
  productCounts.forEach(function(item) {
    productCountMap.set(String(item._id), item.total);
  });

  categoriesWithCounts = categories.map(function(category) {
    var payload = category.toObject();
    payload.productCount = productCountMap.get(String(category._id)) || 0;
    return payload;
  });

  return {
    data: categoriesWithCounts,
    meta: buildPaginationMeta(page, limit, total),
  };
};

module.exports.getCategoryById = async function(categoryId) {
  return Category.findById(categoryId).populate('parentCategory', 'name slug');
};

module.exports.createCategory = async function(body) {
  var parentCategory = body.parentCategory || body.parent_id || null;
  var isActive;

  if (parentCategory) {
    var parent = await Category.findById(parentCategory);
    if (!parent) {
      throw createControllerError('Parent category not found', 404);
    }
  }

  isActive = body.isActive !== undefined && body.isActive !== null
    ? body.isActive
    : body.is_active;

  return Category.create({
    name: body.name,
    slug: body.slug,
    description: body.description,
    icon: body.icon,
    image: body.image,
    parentCategory: parentCategory,
    level: body.level,
    sortOrder: body.sortOrder,
    isActive: isActive,
    source: body.source,
  });
};

module.exports.updateCategory = async function(categoryId, body) {
  var category = await Category.findById(categoryId);
  var parentCategory;
  var parent;
  var isActive;

  if (!category) {
    return null;
  }

  parentCategory = body.parentCategory || body.parent_id;
  if (parentCategory && String(parentCategory) === String(category._id)) {
    throw createControllerError('Category cannot be its own parent', 400);
  }
  if (parentCategory) {
    parent = await Category.findById(parentCategory);
    if (!parent) {
      throw createControllerError('Parent category not found', 404);
    }
  }

  isActive = body.isActive !== undefined && body.isActive !== null
    ? body.isActive
    : body.is_active;

  Object.assign(
    category,
    cleanObject({
      name: body.name,
      slug: body.slug,
      description: body.description,
      icon: body.icon,
      image: body.image,
      parentCategory: parentCategory,
      level: body.level,
      sortOrder: body.sortOrder,
      isActive: isActive,
      source: body.source,
    })
  );
  await category.save();

  return category;
};

module.exports.deleteCategory = async function(categoryId) {
  var category = await Category.findById(categoryId);
  var counts;
  var productCount;
  var childCount;

  if (!category) {
    return false;
  }

  counts = await Promise.all([
    Product.countDocuments({ category: category._id }),
    Category.countDocuments({ parentCategory: category._id }),
  ]);
  productCount = counts[0];
  childCount = counts[1];
  if (productCount > 0 || childCount > 0) {
    throw createControllerError(
      'Category still has related products or subcategories',
      409,
      { productCount: productCount, childCount: childCount }
    );
  }

  await category.deleteOne();
  return true;
};
