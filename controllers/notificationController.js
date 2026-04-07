var schemas = require('../schemas');
var httpLib = require('../lib/http');
var notificationLib = require('../lib/notifications');

var Notification = schemas.Notification;
var buildPaginationMeta = httpLib.buildPaginationMeta;
var parsePagination = httpLib.parsePagination;
var markAllNotificationsRead = notificationLib.markAllNotificationsRead;
var markNotificationRead = notificationLib.markNotificationRead;

module.exports.listNotifications = async function(userId, query) {
  var pagination = parsePagination(query || {});
  var page = pagination.page;
  var limit = pagination.limit;
  var skip = pagination.skip;
  var filter = { user: userId };
  var results = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Notification.countDocuments(filter),
  ]);

  return {
    data: results[0],
    meta: buildPaginationMeta(page, limit, results[1]),
  };
};

module.exports.markNotificationRead = async function(notificationId, userId) {
  return markNotificationRead(notificationId, userId);
};

module.exports.markAllRead = async function(userId) {
  var result = await markAllNotificationsRead(userId);
  return { updated: result.modifiedCount || 0 };
};
