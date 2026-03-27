const mongoose = require('mongoose');

const asyncHandler = (handler) => async (req, res, next) => {
  try {
    await handler(req, res, next);
  } catch (error) {
    next(error);
  }
};

const sendSuccess = (res, data, meta, status = 200) => {
  const payload = { success: true, data };
  if (meta) {
    payload.meta = meta;
  }
  return res.status(status).json(payload);
};

const sendError = (res, message, status = 400, details) => {
  const payload = { success: false, message };
  if (details) {
    payload.details = details;
  }
  return res.status(status).json(payload);
};

const parsePagination = (query) => {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 100);
  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

const buildPaginationMeta = (page, limit, total) => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit) || 1,
});

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const cleanObject = (object) =>
  Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined));

module.exports = {
  asyncHandler,
  sendSuccess,
  sendError,
  parsePagination,
  buildPaginationMeta,
  isValidObjectId,
  cleanObject,
};
