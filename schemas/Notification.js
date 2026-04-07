var mongoose = require('mongoose');

var notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      maxlength: 140,
    },
    message: {
      type: String,
      required: true,
      maxlength: 500,
    },
    type: {
      type: String,
      default: 'system',
      maxlength: 60,
    },
    refType: {
      type: String,
      default: null,
      maxlength: 60,
    },
    refId: {
      type: String,
      default: null,
      maxlength: 100,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ user: 1, createdAt: -1 });

module.exports =
  mongoose.models.Notification || mongoose.model('Notification', notificationSchema);

