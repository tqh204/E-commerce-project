var crypto = require('crypto');

var ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'dev-access-secret-change-me';
var ACCESS_TOKEN_EXPIRES_IN = Number(process.env.ACCESS_TOKEN_EXPIRES_IN || 60 * 60);
var REFRESH_TOKEN_TTL_DAYS = Number(process.env.REFRESH_TOKEN_TTL_DAYS || 30);

var encodeBase64Url = function(value) {
  return Buffer.from(value).toString('base64url');
};

var decodeBase64Url = function(value) {
  return Buffer.from(value, 'base64url').toString('utf8');
};

var hashPassword = function(password) {
  var salt = crypto.randomBytes(16).toString('hex');
  var iterations = 310000;
  var hash = crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256').toString('hex');
  return 'pbkdf2$' + iterations + '$' + salt + '$' + hash;
};

var verifyPassword = function(password, storedHash) {
  if (!storedHash) {
    return false;
  }

  var parts = storedHash.split('$');
  var scheme = parts[0];
  var iterationsText = parts[1];
  var salt = parts[2];
  var expectedHash = parts[3];
  if (scheme !== 'pbkdf2' || !iterationsText || !salt || !expectedHash) {
    return false;
  }

  var iterations = Number(iterationsText);
  var hash = crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(expectedHash));
};

var signPayload = function(payload) {
  return crypto.createHmac('sha256', ACCESS_TOKEN_SECRET).update(payload).digest('base64url');
};

var signAccessToken = function(payload, expiresInSeconds) {
  var tokenExpiry = expiresInSeconds === undefined ? ACCESS_TOKEN_EXPIRES_IN : expiresInSeconds;
  var header = encodeBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  var now = Math.floor(Date.now() / 1000);
  var bodyPayload = {
    sub: payload.sub,
    roles: payload.roles,
    email: payload.email,
    iat: now,
    exp: now + tokenExpiry,
  };
  var body = encodeBase64Url(JSON.stringify(bodyPayload));
  var unsignedToken = header + '.' + body;
  return unsignedToken + '.' + signPayload(unsignedToken);
};

var verifyAccessToken = function(token) {
  var parts = String(token || '').split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid token format');
  }

  var header = parts[0];
  var payload = parts[1];
  var signature = parts[2];
  var unsignedToken = header + '.' + payload;
  var expectedSignature = signPayload(unsignedToken);

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    throw new Error('Invalid token signature');
  }

  var decoded = JSON.parse(decodeBase64Url(payload));
  var now = Math.floor(Date.now() / 1000);
  if (decoded.exp && decoded.exp < now) {
    throw new Error('Token expired');
  }

  return decoded;
};

var generateRefreshToken = function() {
  return crypto.randomBytes(48).toString('hex');
};

var hashToken = function(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
};

var getRefreshTokenExpiry = function() {
  var expiry = new Date();
  expiry.setDate(expiry.getDate() + REFRESH_TOKEN_TTL_DAYS);
  return expiry;
};

module.exports = {
  ACCESS_TOKEN_EXPIRES_IN: ACCESS_TOKEN_EXPIRES_IN,
  REFRESH_TOKEN_TTL_DAYS: REFRESH_TOKEN_TTL_DAYS,
  hashPassword: hashPassword,
  verifyPassword: verifyPassword,
  signAccessToken: signAccessToken,
  verifyAccessToken: verifyAccessToken,
  generateRefreshToken: generateRefreshToken,
  hashToken: hashToken,
  getRefreshTokenExpiry: getRefreshTokenExpiry,
};
