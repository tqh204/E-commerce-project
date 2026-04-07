var mongoose = require('mongoose');
var validators = require('./validators');

var arrayLengthValidator = validators.arrayLengthValidator;

var messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: '',
    },
    attachments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Media',
      },
    ],
    attachmentUrls: {
      type: [String],
      default: [],
      validate: arrayLengthValidator(0, 10),
    },
    messageType: {
      type: String,
      enum: ['text', 'image', 'system', 'bid_update', 'order_update'],
      default: 'text',
    },
    status: {
      type: String,
      enum: ['sending', 'sent', 'read', 'deleted'],
      default: 'sent',
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
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
    editedAt: {
      type: Date,
      default: null,
    },
    editedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
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

messageSchema.path('content').validate(function validateMessageBody(value) {
  var hasText;
  var hasAttachment;

  if (this.status === 'deleted') {
    return true;
  }

  hasText = Boolean((value || '').trim());
  hasAttachment = this.attachments.length > 0 || this.attachmentUrls.length > 0;
  return hasText || hasAttachment;
}, 'Message requires text or attachments');

messageSchema.index({ conversation: 1, createdAt: -1 });
messageSchema.index({ sender: 1, createdAt: -1 });

module.exports = mongoose.models.Message || mongoose.model('Message', messageSchema);
