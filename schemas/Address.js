var mongoose = require('mongoose');
var validators = require('./validators');

var coordinatesValidator = validators.coordinatesValidator;
var phoneValidator = validators.phoneValidator;
var POSTAL_CODE_REGEX = validators.POSTAL_CODE_REGEX;

var locationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
    },
    coordinates: {
      type: [Number],
      required: true,
      validate: coordinatesValidator,
    },
  },
  {
    _id: false,
  }
);

var addressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    label: {
      type: String,
      enum: ['home', 'work', 'warehouse', 'pickup', 'other'],
      default: 'home',
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      validate: phoneValidator,
    },
    countryCode: {
      type: String,
      default: 'VN',
      uppercase: true,
    },
    country: {
      type: String,
      default: 'Vietnam',
    },
    province: {
      type: String,
      required: true,
      trim: true,
    },
    district: {
      type: String,
      required: true,
      trim: true,
    },
    ward: {
      type: String,
      default: '',
      trim: true,
    },
    street: {
      type: String,
      default: '',
      trim: true,
      maxlength: 255,
    },
    fullAddress: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    postalCode: {
      type: String,
      default: '',
      match: POSTAL_CODE_REGEX,
    },
    location: {
      type: locationSchema,
      default: null,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    notes: {
      type: String,
      maxlength: 500,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

addressSchema.index({ user: 1, isDefault: 1 });
addressSchema.index({ location: '2dsphere' });

module.exports = mongoose.models.Address || mongoose.model('Address', addressSchema);
