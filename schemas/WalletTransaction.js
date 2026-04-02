const mongoose = require('mongoose');

const walletTransactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: [
        'top_up',
        'auction_bid_reserve',
        'auction_bid_release',
        'escrow_hold',
        'escrow_release',
        'escrow_refund',
      ],
      required: true,
    },
    direction: {
      type: String,
      enum: ['credit', 'debit', 'lock', 'unlock'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    balanceBefore: {
      type: Number,
      required: true,
      min: 0,
    },
    balanceAfter: {
      type: Number,
      required: true,
      min: 0,
    },
    lockedBefore: {
      type: Number,
      default: 0,
      min: 0,
    },
    lockedAfter: {
      type: Number,
      default: 0,
      min: 0,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
    },
    auction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Auction',
      default: null,
    },
    escrowTransaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EscrowTransaction',
      default: null,
    },
    bid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bid',
      default: null,
    },
    description: {
      type: String,
      default: '',
      maxlength: 500,
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

walletTransactionSchema.index({ user: 1, createdAt: -1 });
walletTransactionSchema.index({ order: 1, createdAt: -1 });
walletTransactionSchema.index({ auction: 1, createdAt: -1 });

module.exports =
  mongoose.models.WalletTransaction ||
  mongoose.model('WalletTransaction', walletTransactionSchema);
