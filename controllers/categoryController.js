const { Category } = require('../schemas');
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
    Category.find(filter).sort({ sortOrder: 1, name: 1 }).skip(skip).limit(limit),
    Category.countDocuments(filter),
  ]);

  return sendSuccess(res, categories, buildPaginationMeta(page, limit, total));
});

exports.getCategoryById = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) {
    return sendError(res, 'Category not found', 404);
  }

  return sendSuccess(res, category);
});

exports.createCategory = asyncHandler(async (req, res) => {
  const category = await Category.create({
    name: req.body.name,
    slug: req.body.slug,
    description: req.body.description,
    icon: req.body.icon,
    image: req.body.image,
    parentCategory: req.body.parentCategory,
    level: req.body.level,
    sortOrder: req.body.sortOrder,
    isActive: req.body.isActive,
    source: req.body.source,
  });

  return sendSuccess(res, category, null, 201);
});

exports.updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) {
    return sendError(res, 'Category not found', 404);
  }

  Object.assign(
    category,
    cleanObject({
      name: req.body.name,
      slug: req.body.slug,
      description: req.body.description,
      icon: req.body.icon,
      image: req.body.image,
      parentCategory: req.body.parentCategory,
      level: req.body.level,
      sortOrder: req.body.sortOrder,
      isActive: req.body.isActive,
      source: req.body.source,
    })
  );
  await category.save();

  return sendSuccess(res, category);
});

exports.deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findByIdAndDelete(req.params.id);
  if (!category) {
    return sendError(res, 'Category not found', 404);
  }

  return sendSuccess(res, { deleted: true });
});
