const mongoose = require('mongoose');
const {
  arrayLengthValidator,
  coordinatesValidator,
  normalizeProductCondition,
  normalizeProductStatus,
  slugify,
  urlValidator,
} = require('./validators');

const productSchema = new mongoose.Schema(
  {
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      alias: 'sellerId',
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
      alias: 'categoryId',
    },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
      maxlength: 200,
      alias: 'name',
    },
    slug: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      minlength: 10,
      maxlength: 5000,
    },
    saleType: {
      type: String,
      enum: ['fixed_price', 'auction'],
      default: 'fixed_price',
    },
    price: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    startingBid: {
      type: Number,
      min: 0,
      default: 0,
    },
    currentBid: {
      type: Number,
      min: 0,
      default: 0,
    },
    buyNowPrice: {
      type: Number,
      min: 0,
      default: null,
    },
    bidStep: {
      type: Number,
      min: 1,
      default: 10000,
    },
    reservePrice: {
      type: Number,
      min: 0,
      default: null,
    },
    currency: {
      type: String,
      default: 'VND',
      uppercase: true,
      trim: true,
    },
    condition: {
      type: String,
      enum: ['new', 'like_new', 'good', 'fair', 'for_parts', 'unknown'],
      default: 'unknown',
      set: normalizeProductCondition,
    },
    status: {
      type: String,
      enum: ['draft', 'pending', 'active', 'sold', 'hidden', 'rejected', 'archived'],
      default: 'draft',
      set: normalizeProductStatus,
    },
    inventory: {
      type: Number,
      default: 1,
      min: 0,
    },
    fulfillmentType: {
      type: String,
      enum: ['meetup', 'shipping', 'both'],
      default: 'both',
    },
    images: {
      type: [String],
      default: [],
      validate: arrayLengthValidator(0, 20),
    },
    mediaIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Media',
      },
    ],
    thumbnailImage: {
      type: String,
      default: null,
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: undefined,
      },
      coordinates: {
        type: [Number],
        default: undefined,
        validate: coordinatesValidator,
      },
    },
    addressText: {
      type: String,
      maxlength: 500,
      default: '',
      alias: 'address',
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
    tags: {
      type: [String],
      default: [],
      validate: arrayLengthValidator(0, 20),
    },
    attributes: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    viewsCount: {
      type: Number,
      default: 0,
      min: 0,
      alias: 'views',
    },
    favoritesCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    source: {
      type: String,
      enum: ['manual', 'chotot', 'ebay', 'other'],
      default: 'manual',
    },
    sourceUrl: {
      type: String,
      default: null,
      validate: urlValidator,
    },
    sourceExternalId: {
      type: String,
      default: undefined,
    },
    importBatch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ImportBatch',
      default: null,
    },
    moderationNotes: {
      type: String,
      maxlength: 1000,
      default: '',
    },
    publishedAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    soldAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

productSchema.pre('validate', function setSlugAndThumbnail() {
  if (!this.slug && this.title) {
    this.slug = `${slugify(this.title)}-${String(this._id || '').slice(-6)}`;
  }

  if (!this.thumbnailImage && this.images.length > 0) {
    this.thumbnailImage = this.images[0];
  }
});

productSchema.index({ location: '2dsphere' }, { sparse: true });
productSchema.index({ title: 'text', description: 'text', tags: 'text' });
productSchema.index({ seller: 1, status: 1, saleType: 1 });
productSchema.index({ category: 1, status: 1, price: 1 });
productSchema.index({ source: 1, sourceExternalId: 1 }, { unique: true, partialFilterExpression: { sourceExternalId: { $exists: true } } });

module.exports = mongoose.models.Product || mongoose.model('Product', productSchema);


