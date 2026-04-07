var mongoose = require('mongoose');

var bidSchema = new mongoose.Schema(
  {
    auction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Auction',
      required: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      default: null,
    },
    bidder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    reservedAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxAutoBid: {
      type: Number,
      default: null,
      min: 0,
    },
    source: {
      type: String,
      enum: ['manual', 'proxy'],
      default: 'manual',
    },
    status: {
      type: String,
      enum: ['active', 'outbid', 'won', 'cancelled'],
      default: 'active',
    },
    isWinning: {
      type: Boolean,
      default: false,
    },
    placedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

bidSchema.index({ auction: 1, createdAt: -1 });
bidSchema.index({ bidder: 1, createdAt: -1 });

module.exports = mongoose.models.Bid || mongoose.model('Bid', bidSchema);

