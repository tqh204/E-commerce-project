var schemas = require('../schemas');
var socketLib = require('./socket');

var Notification = schemas.Notification;
var emitNotification = socketLib.emitNotification;

var createNotification = async function(options) {
  var userId = options.userId;
  var title = options.title;
  var message = options.message;
  var type = options.type === undefined ? 'system' : options.type;
  var refType = options.refType === undefined ? null : options.refType;
  var refId = options.refId === undefined ? null : options.refId;
  var metadata = options.metadata === undefined ? {} : options.metadata;
  var notification;

  if (!userId || !title || !message) {
    return null;
  }

  notification = await Notification.create({
    user: userId,
    title: title,
    message: message,
    type: type,
    refType: refType,
    refId: refId,
    metadata: metadata,
  });

  emitNotification(String(userId), notification);
  return notification;
};

var markNotificationRead = async function(notificationId, userId) {
  if (!notificationId || !userId) {
    return null;
  }

  return Notification.findOneAndUpdate(
    { _id: notificationId, user: userId, isRead: false },
    { $set: { isRead: true, readAt: new Date() } },
    { new: true }
  );
};

var markAllNotificationsRead = async function(userId) {
  if (!userId) {
    return { modifiedCount: 0 };
  }

  return Notification.updateMany(
    { user: userId, isRead: false },
    { $set: { isRead: true, readAt: new Date() } }
  );
};

module.exports = {
  createNotification: createNotification,
  markNotificationRead: markNotificationRead,
  markAllNotificationsRead: markAllNotificationsRead,
};
