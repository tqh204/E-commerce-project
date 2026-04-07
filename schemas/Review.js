var mongoose = require('mongoose');
var validators = require('./validators');

var arrayLengthValidator = validators.arrayLengthValidator;

var reviewSchema = new mongoose.Schema(
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
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reviewee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    score: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      maxlength: 1000,
      default: '',
    },
    mediaIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Media',
      },
    ],
    images: {
      type: [String],
      default: [],
      validate: arrayLengthValidator(0, 10),
    },
    sellerResponse: {
      content: {
        type: String,
        maxlength: 1000,
        default: '',
      },
      respondedAt: {
        type: Date,
        default: null,
      },
    },
    isVisible: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

reviewSchema.index({ order: 1, reviewer: 1 }, { unique: true });
reviewSchema.index({ product: 1, score: -1 });
reviewSchema.index({ reviewee: 1, score: -1 });

module.exports = mongoose.models.Review || mongoose.model('Review', reviewSchema);
