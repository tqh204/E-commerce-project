const PHONE_REGEX = /^(\+84|0)\d{8,10}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SLUG_REGEX = /^[a-z0-9-]+$/;
const POSTAL_CODE_REGEX = /^\d{5,6}$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

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

const passwordRuleMessage =
  'Mật khẩu phải có ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.';

const isStrongPassword = (value) => PASSWORD_REGEX.test(`${value || ''}`);

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

const normalizeOrderStatus = (value) => {
  const raw = `${value || ''}`.trim().toLowerCase();
  const map = {
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
  PHONE_REGEX,
  EMAIL_REGEX,
  SLUG_REGEX,
  POSTAL_CODE_REGEX,
  PASSWORD_REGEX,
  arrayLengthValidator,
  coordinatesValidator,
  urlValidator,
  emailValidator,
  phoneValidator,
  passwordRuleMessage,
  isStrongPassword,
  slugify,
  generateCode,
  normalizeProductStatus,
  normalizeProductCondition,
  normalizeOrderStatus,
};
