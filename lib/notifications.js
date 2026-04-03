const { Notification } = require('../schemas');
const { emitNotification } = require('./socket');

const createNotification = async ({
  userId,
  title,
  message,
  type = 'system',
  refType = null,
  refId = null,
  metadata = {},
}) => {
  if (!userId || !title || !message) {
    return null;
  }

  const notification = await Notification.create({
    user: userId,
    title,
    message,
    type,
    refType,
    refId,
    metadata,
  });

  emitNotification(String(userId), notification);
  return notification;
};

const markNotificationRead = async (notificationId, userId) => {
  if (!notificationId || !userId) {
    return null;
  }

  return Notification.findOneAndUpdate(
    { _id: notificationId, user: userId, isRead: false },
    { $set: { isRead: true, readAt: new Date() } },
    { new: true }
  );
};

const markAllNotificationsRead = async (userId) => {
  if (!userId) {
    return { modifiedCount: 0 };
  }

  return Notification.updateMany(
    { user: userId, isRead: false },
    { $set: { isRead: true, readAt: new Date() } }
  );
};

module.exports = {
  createNotification,
  markNotificationRead,
  markAllNotificationsRead,
};
