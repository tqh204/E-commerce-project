const mongoose = require('mongoose');

const auctionSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      unique: true,
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    startAt: {
      type: Date,
      required: true,
    },
    endAt: {
      type: Date,
      required: true,
    },
    startingBid: {
      type: Number,
      required: true,
      min: 0,
    },
    currentBid: {
      type: Number,
      default: 0,
      min: 0,
    },
    reservePrice: {
      type: Number,
      default: null,
      min: 0,
    },
    buyNowPrice: {
      type: Number,
      default: null,
      min: 0,
    },
    bidStep: {
      type: Number,
      default: 10000,
      min: 1,
    },
    winnerUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    winnerBid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bid',
      default: null,
    },
    totalBids: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastBidAt: {
      type: Date,
      default: null,
    },
    autoExtendMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },
    isReserveMet: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['scheduled', 'live', 'ended', 'cancelled'],
      default: 'scheduled',
    },
  },
  {
    timestamps: true,
  }
);

auctionSchema.path('endAt').validate(function validateTimeRange(value) {
  return !this.startAt || !value || value > this.startAt;
}, 'Auction end time must be after start time');

auctionSchema.index({ status: 1, endAt: 1 });
auctionSchema.index({ seller: 1, status: 1 });

module.exports = mongoose.models.Auction || mongoose.model('Auction', auctionSchema);
