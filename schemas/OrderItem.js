const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    titleSnapshot: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    priceSnapshot: {
      type: Number,
      required: true,
      min: 0,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    primaryImage: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

orderItemSchema.pre('validate', function ensureTotal() {
  if (!this.total && this.priceSnapshot && this.quantity) {
    this.total = this.priceSnapshot * this.quantity;
  }
});

orderItemSchema.index({ order: 1 });
orderItemSchema.index({ product: 1 });

module.exports = mongoose.models.OrderItem || mongoose.model('OrderItem', orderItemSchema);

