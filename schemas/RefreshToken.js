const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    deviceInfo: {
      userAgent: {
        type: String,
        default: '',
      },
      platform: {
        type: String,
        default: '',
      },
      appVersion: {
        type: String,
        default: '',
      },
    },
    ipAddress: {
      type: String,
      default: '',
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    lastUsedAt: {
      type: Date,
      default: null,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

refreshTokenSchema.index({ user: 1, expiresAt: 1 });
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports =
  mongoose.models.RefreshToken || mongoose.model('RefreshToken', refreshTokenSchema);

