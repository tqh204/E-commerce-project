const PHONE_REGEX = /^(\+84|0)\d{8,10}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SLUG_REGEX = /^[a-z0-9-]+$/;
const POSTAL_CODE_REGEX = /^\d{5,6}$/;

const arrayLengthValidator = (min, max) => ({
  validator(value) {
    if (!Array.isArray(value)) {
      return min === 0;
    }

    return value.length >= min && value.length <= max;
  },
  message: `Array length must be between ${min} and ${max}`,
});

const coordinatesValidator = {
  validator(value) {
    if (!Array.isArray(value) || value.length === 0) {
      return true;
    }

    if (value.length !== 2) {
      return false;
    }

    const [lng, lat] = value;
    return lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90;
  },
  message: 'Coordinates must be [longitude, latitude]',
};

const urlValidator = {
  validator(value) {
    if (!value) {
      return true;
    }

    if (String(value).startsWith('/')) {
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

const emailValidator = {
  validator(value) {
    return !value || EMAIL_REGEX.test(value);
  },
  message: 'Email is invalid',
};

const phoneValidator = {
  validator(value) {
    return !value || PHONE_REGEX.test(value);
  },
  message: 'Phone number is invalid',
};

const slugify = (value = '') =>
  value
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

const generateCode = (prefix) =>
  `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)
    .toString()
    .padStart(5, '0')}`;

const normalizeProductStatus = (value) => {
  const raw = `${value || ''}`.trim().toLowerCase();
  const map = {
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

const normalizeProductCondition = (value) => {
  const raw = `${value || ''}`.trim().toLowerCase();
  const map = {
    new: 'new',
    like_new: 'like_new',
    good: 'good',
    fair: 'fair',
    for_parts: 'for_parts',
    unknown: 'unknown',
    'nhu moi': 'like_new',
    tot: 'good',
    'binh thuong': 'fair',
    'co loi': 'for_parts',
  };

  return map[raw] || (value ? raw : 'unknown');
};

const normalizeOrderStatus = (value) => {
  const raw = `${value || ''}`.trim().toLowerCase();
  const map = {
    pending_payment: 'pending_payment',
    paid: 'paid',
    processing: 'processing',
    shipping: 'shipping',
    delivered: 'delivered',
    completed: 'completed',
    cancelled: 'cancelled',
    disputed: 'disputed',
    'cho thanh toan': 'pending_payment',
    'cho gui hang': 'processing',
    'dang van chuyen': 'shipping',
    'da giao': 'delivered',
    'hoan thanh': 'completed',
    'da huy': 'cancelled',
    'tranh chap': 'disputed',
  };

  return map[raw] || (value ? raw : 'pending_payment');
};

module.exports = {
  PHONE_REGEX,
  EMAIL_REGEX,
  SLUG_REGEX,
  POSTAL_CODE_REGEX,
  arrayLengthValidator,
  coordinatesValidator,
  urlValidator,
  emailValidator,
  phoneValidator,
  slugify,
  generateCode,
  normalizeProductStatus,
  normalizeProductCondition,
  normalizeOrderStatus,
};
