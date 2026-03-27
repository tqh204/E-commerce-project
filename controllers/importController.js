const { ImportBatch } = require('../schemas');
const { importFromChotot } = require('../lib/chototImport');
const {
  asyncHandler,
  buildPaginationMeta,
  parsePagination,
  sendError,
  sendSuccess,
} = require('../lib/http');

exports.importChotot = asyncHandler(async (req, res) => {
  if (!req.body.categoryUrl && req.body.mode !== 'api') {
    return sendError(res, 'categoryUrl is required for html import', 400);
  }

  const result = await importFromChotot({
    categoryUrl: req.body.categoryUrl,
    categoryName: req.body.categoryName || 'Chotot',
    maxPages: Number(req.body.maxPages || 1),
    keyword: req.body.keyword,
    mode: req.body.mode || 'html',
    createdBy: req.user._id,
  });

  return sendSuccess(res, result, null, 201);
});

exports.listImportBatches = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const [batches, total] = await Promise.all([
    ImportBatch.find().populate('createdBy', 'username fullName').sort({ createdAt: -1 }).skip(skip).limit(limit),
    ImportBatch.countDocuments(),
  ]);

  return sendSuccess(res, batches, buildPaginationMeta(page, limit, total));
});

exports.getImportBatchById = asyncHandler(async (req, res) => {
  const batch = await ImportBatch.findById(req.params.id).populate('createdBy', 'username fullName');
  if (!batch) {
    return sendError(res, 'Import batch not found', 404);
  }

  return sendSuccess(res, batch);
});
