const mongoose = require('mongoose');
const { urlValidator } = require('./validators');

const importBatchSchema = new mongoose.Schema(
  {
    source: {
      type: String,
      enum: ['chotot', 'ebay', 'manual', 'other'],
      default: 'chotot',
    },
    sourceCategory: {
      type: String,
      default: '',
    },
    query: {
      type: String,
      default: '',
    },
    sourceUrl: {
      type: String,
      default: null,
      validate: urlValidator,
    },
    status: {
      type: String,
      enum: ['queued', 'running', 'completed', 'failed', 'partial'],
      default: 'queued',
    },
    startedAt: {
      type: Date,
      default: null,
    },
    finishedAt: {
      type: Date,
      default: null,
    },
    totalFetched: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalInserted: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalUpdated: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalSkipped: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalFailed: {
      type: Number,
      default: 0,
      min: 0,
    },
    errorItems: {
      type: [
        {
          itemId: String,
          message: String,
        },
      ],
      default: [],
    },
    notes: {
      type: String,
      maxlength: 2000,
      default: '',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

importBatchSchema.index({ source: 1, status: 1, createdAt: -1 });

module.exports =
  mongoose.models.ImportBatch || mongoose.model('ImportBatch', importBatchSchema);
