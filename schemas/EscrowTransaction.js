var mongoose = require('mongoose');

var escrowTransactionSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      unique: true,
    },
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'VND',
      uppercase: true,
    },
    feeAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    fundingSource: {
      type: String,
      enum: ['wallet', 'external'],
      default: 'wallet',
    },
    flowType: {
      type: String,
      enum: ['direct_purchase', 'auction_win', 'auction_buy_now'],
      default: 'direct_purchase',
    },
    provider: {
      type: String,
      default: 'internal',
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'held', 'released', 'refunded', 'disputed'],
      default: 'pending',
    },
    heldAt: {
      type: Date,
      default: null,
    },
    releasedAt: {
      type: Date,
      default: null,
    },
    refundedAt: {
      type: Date,
      default: null,
    },
    disputeOpenedAt: {
      type: Date,
      default: null,
    },
    autoReleaseAt: {
      type: Date,
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    disputeReason: {
      type: String,
      maxlength: 1000,
      default: '',
    },
    resolutionNotes: {
      type: String,
      maxlength: 1000,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

escrowTransactionSchema.index({ buyer: 1, seller: 1, status: 1 });

module.exports =
  mongoose.models.EscrowTransaction ||
  mongoose.model('EscrowTransaction', escrowTransactionSchema);

