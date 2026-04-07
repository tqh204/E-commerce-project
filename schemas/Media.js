var mongoose = require('mongoose');
var validators = require('./validators');

var urlValidator = validators.urlValidator;

var mediaSchema = new mongoose.Schema(
  {
    uploader: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    ownerType: {
      type: String,
      enum: ['user', 'product', 'message', 'category', 'review', 'import'],
      required: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    type: {
      type: String,
      enum: ['image', 'video', 'file'],
      default: 'image',
    },
    storageProvider: {
      type: String,
      enum: ['local', 'cloudinary', 's3', 'remote'],
      default: 'local',
    },
    url: {
      type: String,
      required: true,
      validate: urlValidator,
    },
    thumbnailUrl: {
      type: String,
      default: null,
      validate: urlValidator,
    },
    publicId: {
      type: String,
      default: null,
    },
    filename: {
      type: String,
      default: '',
    },
    originalName: {
      type: String,
      default: '',
    },
    mimeType: {
      type: String,
      default: '',
    },
    size: {
      type: Number,
      default: 0,
      min: 0,
    },
    width: {
      type: Number,
      default: null,
      min: 0,
    },
    height: {
      type: Number,
      default: null,
      min: 0,
    },
    duration: {
      type: Number,
      default: null,
      min: 0,
    },
    sortOrder: {
      type: Number,
      default: 0,
      min: 0,
    },
    isPrimary: {
      type: Boolean,
      default: false,
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

mediaSchema.index({ ownerType: 1, ownerId: 1, sortOrder: 1 });

module.exports = mongoose.models.Media || mongoose.model('Media', mediaSchema);
