var schemas = require('../schemas');
var chototImportLib = require('../lib/chototImport');
var httpLib = require('../lib/http');

var ImportBatch = schemas.ImportBatch;
var importFromChotot = chototImportLib.importFromChotot;
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

module.exports.importChotot = async function(body, actor) {
  if (!body.categoryUrl && body.mode !== 'api') {
    throw createControllerError('categoryUrl is required for html import', 400);
  }

  return importFromChotot({
    categoryUrl: body.categoryUrl,
    categoryName: body.categoryName || 'Chotot',
    maxPages: Number(body.maxPages || 1),
    keyword: body.keyword,
    mode: body.mode || 'html',
    createdBy: actor.user._id,
  });
};

module.exports.listImportBatches = async function(query) {
  var pagination = parsePagination(query || {});
  var page = pagination.page;
  var limit = pagination.limit;
  var skip = pagination.skip;
  var results = await Promise.all([
    ImportBatch.find()
      .populate('createdBy', 'username fullName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    ImportBatch.countDocuments(),
  ]);

  return {
    data: results[0],
    meta: buildPaginationMeta(page, limit, results[1]),
  };
};

module.exports.getImportBatchById = async function(batchId) {
  return ImportBatch.findById(batchId).populate('createdBy', 'username fullName');
};
