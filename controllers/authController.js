var schemas = require('../schemas');
var authLib = require('../lib/auth');
var rolesLib = require('../lib/roles');
var validatorLib = require('../schemas/validators');

var RefreshToken = schemas.RefreshToken;
var User = schemas.User;
var generateRefreshToken = authLib.generateRefreshToken;
var getRefreshTokenExpiry = authLib.getRefreshTokenExpiry;
var hashPassword = authLib.hashPassword;
var hashToken = authLib.hashToken;
var signAccessToken = authLib.signAccessToken;
var verifyPassword = authLib.verifyPassword;
var ensureSystemRoles = rolesLib.ensureSystemRoles;
var isStrongPassword = validatorLib.isStrongPassword;
var passwordRuleMessage = validatorLib.passwordRuleMessage;

var createControllerError = function(message, status, details) {
  var error = new Error(message);
  error.status = status || 400;
  if (details !== undefined) {
    error.details = details;
  }
  return error;
};

var sanitizeUser = function(user) {
  var data = user.toObject({ virtuals: true });
  delete data.passwordHash;
  return data;
};

var issueTokens = async function(user, req) {
  var hydratedUser = await User.findById(user._id).populate('roles', 'name permissions');
  var roleNames = (hydratedUser.roles || []).map(function(role) {
    return role.name;
  });
  var accessToken = signAccessToken({
    sub: String(hydratedUser._id),
    roles: roleNames,
    email: hydratedUser.email,
  });
  var refreshToken = generateRefreshToken();

  await RefreshToken.create({
    user: hydratedUser._id,
    tokenHash: hashToken(refreshToken),
    deviceInfo: {
      userAgent: req.headers['user-agent'] || '',
      platform: req.headers['sec-ch-ua-platform'] || '',
      appVersion: req.headers['x-app-version'] || '',
    },
    ipAddress: req.ip,
    expiresAt: getRefreshTokenExpiry(),
  });

  return {
    accessToken: accessToken,
    refreshToken: refreshToken,
    user: sanitizeUser(hydratedUser),
  };
};

module.exports.register = async function(payload, req) {
  var username = String(payload.username || '').trim();
  var email = String(payload.email || '').trim().toLowerCase();
  var password = payload.password;
  var fullName = String(payload.fullName || '').trim();
  var phone = payload.phone;
  var existingUser;
  var rolesByName;
  var defaultRole;
  var user;

  if (!username || !email || !password || !fullName) {
    throw createControllerError('username, email, password, fullName are required', 400);
  }
  if (!isStrongPassword(password)) {
    throw createControllerError(passwordRuleMessage, 400);
  }

  existingUser = await User.findOne({
    $or: [{ email: email }, { username: username.toLowerCase() }],
  });
  if (existingUser) {
    throw createControllerError('User already exists', 409);
  }

  rolesByName = await ensureSystemRoles();
  defaultRole = rolesByName.user;
  if (!defaultRole) {
    throw createControllerError('Default user role is missing', 500);
  }

  user = await User.create({
    username: username,
    email: email,
    passwordHash: hashPassword(password),
    fullName: fullName,
    phone: phone,
    roles: [defaultRole._id],
  });

  return issueTokens(user, req);
};

module.exports.login = async function(payload, req) {
  var identifier = payload.identifier;
  var email = payload.email;
  var username = payload.username;
  var password = payload.password;
  var loginValue = String(identifier || email || username || '').trim().toLowerCase();
  var user;

  if (!loginValue || !password) {
    throw createControllerError('identifier and password are required', 400);
  }

  user = await User.findOne({
    $or: [{ email: loginValue }, { username: loginValue }],
  })
    .select('+passwordHash')
    .populate('roles', 'name permissions');

  if (!user || !verifyPassword(password, user.passwordHash)) {
    throw createControllerError('Invalid credentials', 401);
  }

  user.lastLoginAt = new Date();
  await user.save();

  return issueTokens(user, req);
};

module.exports.refresh = async function(refreshToken) {
  var tokenValue = String(refreshToken || '').trim();
  var tokenHashValue;
  var refreshTokenDoc;
  var user;
  var accessToken;

  if (!tokenValue) {
    throw createControllerError('refreshToken is required', 400);
  }

  tokenHashValue = hashToken(tokenValue);
  refreshTokenDoc = await RefreshToken.findOne({ tokenHash: tokenHashValue }).populate('user');
  if (!refreshTokenDoc || refreshTokenDoc.revokedAt || refreshTokenDoc.expiresAt < new Date()) {
    throw createControllerError('Refresh token is invalid or expired', 401);
  }

  refreshTokenDoc.lastUsedAt = new Date();
  await refreshTokenDoc.save();

  user = await User.findById(refreshTokenDoc.user._id).populate('roles', 'name permissions');
  accessToken = signAccessToken({
    sub: String(user._id),
    roles: (user.roles || []).map(function(role) {
      return role.name;
    }),
    email: user.email,
  });

  return {
    accessToken: accessToken,
    refreshToken: tokenValue,
    user: sanitizeUser(user),
  };
};

module.exports.logout = async function(refreshToken) {
  var tokenValue = String(refreshToken || '').trim();

  if (tokenValue) {
    await RefreshToken.findOneAndUpdate(
      { tokenHash: hashToken(tokenValue) },
      { revokedAt: new Date() }
    );
  }

  return { loggedOut: true };
};

module.exports.me = async function(userId) {
  var user = await User.findById(userId).populate('roles', 'name permissions');

  if (!user) {
    return null;
  }

  return sanitizeUser(user);
};
