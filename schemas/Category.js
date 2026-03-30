const mongoose = require('mongoose');
const { slugify, SLUG_REGEX } = require('./validators');

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    slug: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      match: SLUG_REGEX,
    },
    description: {
      type: String,
      maxlength: 1000,
      default: '',
    },
    icon: {
      type: String,
      default: null,
    },
    image: {
      type: String,
      default: null,
    },
    parentCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
      alias: 'parent_id',
    },
    level: {
      type: Number,
      default: 0,
      min: 0,
    },
    sortOrder: {
      type: Number,
      default: 0,
      min: 0,
      alias: 'order',
    },
    path: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
      alias: 'is_active',
    },
    source: {
      type: String,
      enum: ['manual', 'chotot', 'ebay', 'other'],
      default: 'manual',
    },
    sourceExternalId: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

categorySchema.pre('validate', function setDerivedFields() {
  if (!this.slug && this.name) {
    this.slug = slugify(this.name);
  }

  if (!this.path && this.slug) {
    this.path = this.slug;
  }
});

categorySchema.index({ parentCategory: 1, sortOrder: 1 });

module.exports = mongoose.models.Category || mongoose.model('Category', categorySchema);

