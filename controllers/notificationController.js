const { Notification } = require('../schemas');
const { asyncHandler, buildPaginationMeta, parsePagination, sendSuccess } = require('../lib/http');
const { markAllNotificationsRead, markNotificationRead } = require('../lib/notifications');

exports.listNotifications = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = { user: req.user._id };

  const [items, total] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Notification.countDocuments(filter),
  ]);

  return sendSuccess(res, items, buildPaginationMeta(page, limit, total));
});

exports.markNotificationRead = asyncHandler(async (req, res) => {
  const notification = await markNotificationRead(req.params.id, req.user._id);
  return sendSuccess(res, notification || { updated: false });
});

exports.markAllRead = asyncHandler(async (req, res) => {
  const result = await markAllNotificationsRead(req.user._id);
  return sendSuccess(res, { updated: result.modifiedCount || 0 });
});
