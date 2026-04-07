var mongoose = require('mongoose');

var momoPaymentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    orderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    requestId: {
      type: String,
      required: true,
      index: true,
    },
    requestType: {
      type: String,
      default: 'payWithCC',
    },
    status: {
      type: String,
      enum: ['pending', 'success', 'failed'],
      default: 'pending',
    },
    resultCode: {
      type: Number,
      default: null,
    },
    transId: {
      type: String,
      default: '',
    },
    payUrl: {
      type: String,
      default: '',
    },
    deeplink: {
      type: String,
      default: '',
    },
    rawResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.models.MomoPayment || mongoose.model('MomoPayment', momoPaymentSchema);

