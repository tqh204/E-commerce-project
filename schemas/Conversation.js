var mongoose = require('mongoose');

var conversationSchema = new mongoose.Schema(
  {
    participants: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      ],
      required: true,
      validate: {
        validator(value) {
          return Array.isArray(value) && value.length >= 2;
        },
        message: 'Conversation requires at least two participants',
      },
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      default: null,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
    },
    type: {
      type: String,
      enum: ['direct', 'product', 'order', 'support'],
      default: 'product',
    },
    subject: {
      type: String,
      maxlength: 200,
      default: '',
    },
    lastMessageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
    lastMessage: {
      type: String,
      maxlength: 1000,
      default: '',
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
    lastMessageBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    readBy: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        readAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

conversationSchema.index({ participants: 1, lastMessageAt: -1 });
conversationSchema.index({ product: 1, type: 1 });

module.exports =
  mongoose.models.Conversation || mongoose.model('Conversation', conversationSchema);

