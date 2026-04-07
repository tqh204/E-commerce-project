var mongoose = require('mongoose');

var asyncHandler = function(handler) {
  return async function(req, res, next) {
    try {
      await handler(req, res, next);
    } catch (error) {
      next(error);
    }
  };
};

var sendSuccess = function(res, data, meta, status) {
  var responseStatus = status === undefined ? 200 : status;
  var payload = { success: true, data: data };
  if (meta) {
    payload.meta = meta;
  }
  return res.status(responseStatus).json(payload);
};

var sendError = function(res, message, status, details) {
  var responseStatus = status === undefined ? 400 : status;
  var payload = { success: false, message: message };
  if (details) {
    payload.details = details;
  }
  return res.status(responseStatus).json(payload);
};

var parsePagination = function(query) {
  var page = Math.max(Number(query.page) || 1, 1);
  var limit = Math.min(Math.max(Number(query.limit) || 10, 1), 100);
  return {
    page: page,
    limit: limit,
    skip: (page - 1) * limit,
  };
};

var buildPaginationMeta = function(page, limit, total) {
  return {
    page: page,
    limit: limit,
    total: total,
    totalPages: Math.ceil(total / limit) || 1,
  };
};

var isValidObjectId = function(value) {
  return mongoose.Types.ObjectId.isValid(value);
};

var cleanObject = function(object) {
  var result = {};
  Object.keys(object).forEach(function(key) {
    if (object[key] !== undefined) {
      result[key] = object[key];
    }
  });
  return result;
};

module.exports = {
  asyncHandler: asyncHandler,
  sendSuccess: sendSuccess,
  sendError: sendError,
  parsePagination: parsePagination,
  buildPaginationMeta: buildPaginationMeta,
  isValidObjectId: isValidObjectId,
  cleanObject: cleanObject,
};
