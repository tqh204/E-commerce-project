const { Category, Product } = require('../schemas');
const {
  asyncHandler,
  buildPaginationMeta,
  cleanObject,
  parsePagination,
  sendError,
  sendSuccess,
} = require('../lib/http');

exports.listCategories = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = {};
  if (req.query.parentCategory) {
    filter.parentCategory = req.query.parentCategory;
  }
  if (req.query.isActive !== undefined) {
    filter.isActive = req.query.isActive === 'true';
  }

  const [categories, total] = await Promise.all([
    Category.find(filter)
      .populate('parentCategory', 'name slug')
      .sort({ sortOrder: 1, name: 1 })
      .skip(skip)
      .limit(limit),
    Category.countDocuments(filter),
  ]);

  const categoryIds = categories.map((category) => category._id);
  const productCounts = categoryIds.length
    ? await Product.aggregate([
        { $match: { category: { $in: categoryIds } } },
        { $group: { _id: '$category', total: { $sum: 1 } } },
      ])
    : [];
  const productCountMap = new Map(
    productCounts.map((item) => [String(item._id), item.total])
  );
  const categoriesWithCounts = categories.map((category) => ({
    ...category.toObject(),
    productCount: productCountMap.get(String(category._id)) || 0,
  }));

  return sendSuccess(res, categoriesWithCounts, buildPaginationMeta(page, limit, total));
});

exports.getCategoryById = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id).populate('parentCategory', 'name slug');
  if (!category) {
    return sendError(res, 'Category not found', 404);
  }

  return sendSuccess(res, category);
});

exports.createCategory = asyncHandler(async (req, res) => {
  const parentCategory = req.body.parentCategory || req.body.parent_id || null;
  if (parentCategory) {
    const parent = await Category.findById(parentCategory);
    if (!parent) {
      return sendError(res, 'Parent category not found', 404);
    }
  }
  const category = await Category.create({
    name: req.body.name,
    slug: req.body.slug,
    description: req.body.description,
    icon: req.body.icon,
    image: req.body.image,
    parentCategory,
    level: req.body.level,
    sortOrder: req.body.sortOrder,
    isActive: req.body.isActive ?? req.body.is_active,
    source: req.body.source,
  });

  return sendSuccess(res, category, null, 201);
});

exports.updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) {
    return sendError(res, 'Category not found', 404);
  }

  const parentCategory = req.body.parentCategory || req.body.parent_id;
  if (parentCategory && String(parentCategory) === String(category._id)) {
    return sendError(res, 'Category cannot be its own parent', 400);
  }
  if (parentCategory) {
    const parent = await Category.findById(parentCategory);
    if (!parent) {
      return sendError(res, 'Parent category not found', 404);
    }
  }

  Object.assign(
    category,
    cleanObject({
      name: req.body.name,
      slug: req.body.slug,
      description: req.body.description,
      icon: req.body.icon,
      image: req.body.image,
      parentCategory,
      level: req.body.level,
      sortOrder: req.body.sortOrder,
      isActive: req.body.isActive ?? req.body.is_active,
      source: req.body.source,
    })
  );
  await category.save();

  return sendSuccess(res, category);
});

exports.deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) {
    return sendError(res, 'Category not found', 404);
  }

  const [productCount, childCount] = await Promise.all([
    Product.countDocuments({ category: category._id }),
    Category.countDocuments({ parentCategory: category._id }),
  ]);
  if (productCount > 0 || childCount > 0) {
    return sendError(
      res,
      'Category still has related products or subcategories',
      409,
      { productCount, childCount }
    );
  }

  await category.deleteOne();

  return sendSuccess(res, { deleted: true });
});
