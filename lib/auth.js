const crypto = require('crypto');

const ACCESS_TOKEN_SECRET =
  process.env.ACCESS_TOKEN_SECRET || 'dev-access-secret-change-me';
const ACCESS_TOKEN_EXPIRES_IN = Number(process.env.ACCESS_TOKEN_EXPIRES_IN || 60 * 60);
const REFRESH_TOKEN_TTL_DAYS = Number(process.env.REFRESH_TOKEN_TTL_DAYS || 30);

const encodeBase64Url = (value) => Buffer.from(value).toString('base64url');
const decodeBase64Url = (value) => Buffer.from(value, 'base64url').toString('utf8');

const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const iterations = 310000;
  const hash = crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256').toString('hex');
  return `pbkdf2$${iterations}$${salt}$${hash}`;
};

const verifyPassword = (password, storedHash) => {
  if (!storedHash) {
    return false;
  }

  const [scheme, iterationsText, salt, expectedHash] = storedHash.split('$');
  if (scheme !== 'pbkdf2' || !iterationsText || !salt || !expectedHash) {
    return false;
  }

  const iterations = Number(iterationsText);
  const hash = crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(expectedHash));
};

const signPayload = (payload) =>
  crypto.createHmac('sha256', ACCESS_TOKEN_SECRET).update(payload).digest('base64url');

const signAccessToken = (payload, expiresInSeconds = ACCESS_TOKEN_EXPIRES_IN) => {
  const header = encodeBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const body = encodeBase64Url(
    JSON.stringify({
      ...payload,
      iat: now,
      exp: now + expiresInSeconds,
    })
  );
  const unsignedToken = `${header}.${body}`;
  return `${unsignedToken}.${signPayload(unsignedToken)}`;
};

const verifyAccessToken = (token) => {
  const parts = `${token || ''}`.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid token format');
  }

  const [header, payload, signature] = parts;
  const unsignedToken = `${header}.${payload}`;
  const expectedSignature = signPayload(unsignedToken);

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    throw new Error('Invalid token signature');
  }

  const decoded = JSON.parse(decodeBase64Url(payload));
  const now = Math.floor(Date.now() / 1000);
  if (decoded.exp && decoded.exp < now) {
    throw new Error('Token expired');
  }

  return decoded;
};

const generateRefreshToken = () => crypto.randomBytes(48).toString('hex');
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const getRefreshTokenExpiry = () => {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + REFRESH_TOKEN_TTL_DAYS);
  return expiry;
};

module.exports = {
  ACCESS_TOKEN_EXPIRES_IN,
  REFRESH_TOKEN_TTL_DAYS,
  hashPassword,
  verifyPassword,
  signAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  hashToken,
  getRefreshTokenExpiry,
};
