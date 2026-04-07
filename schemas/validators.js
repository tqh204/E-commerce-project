var PHONE_REGEX = /^(\+84|0)\d{8,10}$/;
var EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
var SLUG_REGEX = /^[a-z0-9-]+$/;
var POSTAL_CODE_REGEX = /^\d{5,6}$/;
var PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

var arrayLengthValidator = function(min, max) {
  return {
    validator: function(value) {
      if (!Array.isArray(value)) {
        return min === 0;
      }

      return value.length >= min && value.length <= max;
    },
    message: 'Array length must be between ' + min + ' and ' + max,
  };
};

var coordinatesValidator = {
  validator: function(value) {
    var lng;
    var lat;

    if (!Array.isArray(value) || value.length === 0) {
      return true;
    }

    if (value.length !== 2) {
      return false;
    }

    lng = value[0];
    lat = value[1];
    return lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90;
  },
  message: 'Coordinates must be [longitude, latitude]',
};

var urlValidator = {
  validator: function(value) {
    if (!value) {
      return true;
    }

    if (String(value).indexOf('/') === 0) {
      return true;
    }

    try {
      new URL(value);
      return true;
    } catch (error) {
      return false;
    }
  },
  message: 'URL is invalid',
};

var emailValidator = {
  validator: function(value) {
    return !value || EMAIL_REGEX.test(value);
  },
  message: 'Email is invalid',
};

var phoneValidator = {
  validator: function(value) {
    return !value || PHONE_REGEX.test(value);
  },
  message: 'Phone number is invalid',
};

var passwordRuleMessage =
  'Mat khau phai co it nhat 8 ky tu, gom chu hoa, chu thuong, so va ky tu dac biet.';

var isStrongPassword = function(value) {
  return PASSWORD_REGEX.test(String(value || ''));
};

var slugify = function(value) {
  var input = value === undefined ? '' : value;

  return input
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
};

var generateCode = function(prefix) {
  var randomPart = Math.floor(Math.random() * 100000).toString();

  while (randomPart.length < 5) {
    randomPart = '0' + randomPart;
  }

  return prefix + '-' + Date.now() + '-' + randomPart;
};

var normalizeProductStatus = function(value) {
  var raw = String(value || '').trim().toLowerCase();
  var map = {
    draft: 'draft',
    pending: 'pending',
    active: 'active',
    sold: 'sold',
    hidden: 'hidden',
    rejected: 'rejected',
    archived: 'archived',
    'dang ban': 'active',
    'da ban': 'sold',
    an: 'hidden',
    duyet: 'pending',
  };

  return map[raw] || (value ? raw : 'draft');
};

var normalizeProductCondition = function(value) {
  var raw = String(value || '').trim().toLowerCase();
  var map = {
    new: 'new',
    like_new: 'like_new',
    good: 'good',
    fair: 'fair',
    poor: 'poor',
    for_parts: 'poor',
    unknown: 'poor',
    'nhu moi': 'like_new',
    tot: 'good',
    'binh thuong': 'fair',
    'co loi': 'poor',
  };

  return map[raw] || (value ? raw : 'good');
};

var normalizeOrderStatus = function(value) {
  var raw = String(value || '').trim().toLowerCase();
  var map = {
    negotiating: 'negotiating',
    pending_payment: 'pending_payment',
    paid: 'paid',
    processing: 'processing',
    shipping: 'shipping',
    delivered: 'delivered',
    completed: 'completed',
    cancelled: 'cancelled',
    disputed: 'disputed',
    'cho thuong luong': 'negotiating',
    'cho thanh toan': 'pending_payment',
    'cho gui hang': 'processing',
    'dang van chuyen': 'shipping',
    'da giao': 'delivered',
    'hoan thanh': 'completed',
    'da huy': 'cancelled',
    'tranh chap': 'disputed',
  };

  return map[raw] || (value ? raw : 'negotiating');
};

module.exports = {
  PHONE_REGEX: PHONE_REGEX,
  EMAIL_REGEX: EMAIL_REGEX,
  SLUG_REGEX: SLUG_REGEX,
  POSTAL_CODE_REGEX: POSTAL_CODE_REGEX,
  PASSWORD_REGEX: PASSWORD_REGEX,
  arrayLengthValidator: arrayLengthValidator,
  coordinatesValidator: coordinatesValidator,
  urlValidator: urlValidator,
  emailValidator: emailValidator,
  phoneValidator: phoneValidator,
  passwordRuleMessage: passwordRuleMessage,
  isStrongPassword: isStrongPassword,
  slugify: slugify,
  generateCode: generateCode,
  normalizeProductStatus: normalizeProductStatus,
  normalizeProductCondition: normalizeProductCondition,
  normalizeOrderStatus: normalizeOrderStatus,
};
