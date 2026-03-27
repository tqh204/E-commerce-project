const mongoose = require('mongoose');
const { emailValidator, phoneValidator } = require('./validators');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 30,
      match: /^[a-z0-9_-]+$/,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      validate: emailValidator,
    },
    passwordHash: {
      type: String,
      required: true,
      minlength: 6,
      maxlength: 255,
      select: false,
      alias: 'password',
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    phone: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      validate: phoneValidator,
    },
    bio: {
      type: String,
      maxlength: 500,
      default: '',
    },
    avatarUrl: {
      type: String,
      default: null,
      alias: 'avatar',
    },
    avatarMedia: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Media',
      default: null,
    },
    roles: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Role',
      },
    ],
    balance: {
      type: Number,
      default: 0,
      min: 0,
    },
    ratingAvg: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
      alias: 'rating',
    },
    ratingCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalSold: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalBought: {
      type: Number,
      default: 0,
      min: 0,
    },
    defaultAddress: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Address',
      default: null,
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'suspended', 'banned'],
      default: 'active',
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLoginAt: {
      type: Date,
      default: null,
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

userSchema.index({ roles: 1, status: 1 });

module.exports = mongoose.models.User || mongoose.model('User', userSchema);

