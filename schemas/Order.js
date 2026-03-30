const mongoose = require('mongoose');
const {
  generateCode,
  normalizeOrderStatus,
  phoneValidator,
  POSTAL_CODE_REGEX,
} = require('./validators');

const orderSchema = new mongoose.Schema(
  {
    orderCode: {
      type: String,
      unique: true,
      sparse: true,
      alias: 'orderNumber',
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
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      default: null,
    },
    auction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Auction',
      default: null,
    },
    type: {
      type: String,
      enum: ['fixed_price', 'buy_now', 'auction_win'],
      default: 'buy_now',
    },
    paymentType: {
      type: String,
      enum: ['cod', 'wallet', 'escrow'],
      default: 'cod',
    },
    shippingMethod: {
      type: String,
      enum: ['meetup', 'delivery', 'pickup'],
      default: 'delivery',
    },
    currency: {
      type: String,
      default: 'VND',
      uppercase: true,
      trim: true,
    },
    price: {
      type: Number,
      min: 0,
      default: 0,
    },
    quantity: {
      type: Number,
      min: 1,
      default: 1,
      validate: {
        validator: Number.isInteger,
        message: 'Quantity must be an integer',
      },
    },
    subtotal: {
      type: Number,
      min: 0,
      default: 0,
    },
    shippingFee: {
      type: Number,
      min: 0,
      default: 0,
    },
    platformFee: {
      type: Number,
      min: 0,
      default: 0,
    },
    totalAmount: {
      type: Number,
      min: 0,
      default: 0,
    },
    shippingAddressRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Address',
      default: null,
    },
    shippingAddress: {
      fullName: {
        type: String,
        maxlength: 100,
        default: '',
      },
      phone: {
        type: String,
        default: '',
        validate: phoneValidator,
      },
      province: {
        type: String,
        default: '',
      },
      district: {
        type: String,
        default: '',
      },
      ward: {
        type: String,
        default: '',
      },
      address: {
        type: String,
        maxlength: 500,
        default: '',
      },
      city: {
        type: String,
        default: '',
      },
      zipCode: {
        type: String,
        default: '',
        match: POSTAL_CODE_REGEX,
      },
    },
    shipping: {
      method: {
        type: String,
        enum: ['meetup', 'delivery', 'pickup'],
        default: 'delivery',
      },
      carrier: {
        type: String,
        default: '',
      },
      shippingFee: {
        type: Number,
        min: 0,
        default: 0,
      },
      trackingNumber: {
        type: String,
        default: '',
      },
      status: {
        type: String,
        enum: ['pending', 'shipping', 'delivered', 'failed', 'returned'],
        default: 'pending',
      },
      sentAt: {
        type: Date,
        default: null,
      },
      deliveredAt: {
        type: Date,
        default: null,
      },
    },
    escrowTransaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EscrowTransaction',
      default: null,
    },
    escrow: {
      amount: {
        type: Number,
        min: 0,
        default: 0,
      },
      status: {
        type: String,
        enum: ['pending', 'held', 'released', 'disputed', 'refunded'],
        default: 'pending',
      },
      releasedAt: {
        type: Date,
        default: null,
      },
    },
    status: {
      type: String,
      enum: [
        'negotiating',
        'pending_payment',
        'paid',
        'processing',
        'shipping',
        'delivered',
        'completed',
        'cancelled',
        'disputed',
      ],
      default: 'negotiating',
      set: normalizeOrderStatus,
    },
    notes: {
      type: String,
      maxlength: 1000,
      default: '',
    },
    buyerNotes: {
      type: String,
      maxlength: 1000,
      default: '',
    },
    sellerNotes: {
      type: String,
      maxlength: 1000,
      default: '',
    },
    paidAt: {
      type: Date,
      default: null,
    },
    shippedAt: {
      type: Date,
      default: null,
    },
    deliveredAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancellationReason: {
      type: String,
      maxlength: 1000,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

orderSchema.pre('validate', function deriveOrderFields() {
  if (!this.orderCode) {
    this.orderCode = generateCode('ORD');
  }

  if (!this.subtotal && this.price && this.quantity) {
    this.subtotal = this.price * this.quantity;
  }

  this.shippingMethod = this.shipping?.method || this.shippingMethod;
  this.shipping.shippingFee = this.shipping.shippingFee || this.shippingFee;
  this.totalAmount = this.subtotal + this.shippingFee + this.platformFee;
});

orderSchema.index({ buyer: 1, status: 1, createdAt: -1 });
orderSchema.index({ seller: 1, status: 1, createdAt: -1 });

module.exports = mongoose.models.Order || mongoose.model('Order', orderSchema);

