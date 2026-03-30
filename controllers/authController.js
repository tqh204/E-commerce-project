const { RefreshToken, User } = require('../schemas');
const {
  generateRefreshToken,
  getRefreshTokenExpiry,
  hashPassword,
  hashToken,
  signAccessToken,
  verifyPassword,
} = require('../lib/auth');
const { asyncHandler, sendError, sendSuccess } = require('../lib/http');
const { ensureSystemRoles } = require('../lib/roles');
const { isStrongPassword, passwordRuleMessage } = require('../schemas/validators');

const sanitizeUser = (user) => {
  const data = user.toObject({ virtuals: true });
  delete data.passwordHash;
  return data;
};

const issueTokens = async (user, req) => {
  const hydratedUser = await User.findById(user._id).populate('roles', 'name permissions');
  const roleNames = (hydratedUser.roles || []).map((role) => role.name);
  const accessToken = signAccessToken({
    sub: String(hydratedUser._id),
    roles: roleNames,
    email: hydratedUser.email,
  });
  const refreshToken = generateRefreshToken();

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
    accessToken,
    refreshToken,
    user: sanitizeUser(hydratedUser),
  };
};

exports.register = asyncHandler(async (req, res) => {
  const { username, email, password, fullName, phone } = req.body;
  if (!username || !email || !password || !fullName) {
    return sendError(res, 'username, email, password, fullName are required', 400);
  }
  if (!isStrongPassword(password)) {
    return sendError(res, passwordRuleMessage, 400);
  }

  const existingUser = await User.findOne({
    $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }],
  });
  if (existingUser) {
    return sendError(res, 'User already exists', 409);
  }

  const rolesByName = await ensureSystemRoles();
  const requestedRoles = Array.isArray(req.body.roles)
    ? req.body.roles
    : req.body.role
      ? [req.body.role]
      : [];
  const allowedSelfServiceRoles = new Set(['buyer', 'seller']);
  const selectedRoleNames = [
    ...new Set(
      requestedRoles
        .map((role) => `${role || ''}`.trim().toLowerCase())
        .filter((role) => allowedSelfServiceRoles.has(role))
    ),
  ];
  if (!selectedRoleNames.length) {
    selectedRoleNames.push('buyer');
  }

  const selectedRoles = selectedRoleNames
    .map((name) => rolesByName[name])
    .filter(Boolean);

  const user = await User.create({
    username,
    email,
    passwordHash: hashPassword(password),
    fullName,
    phone,
    roles: selectedRoles.map((role) => role._id),
  });

  const tokens = await issueTokens(user, req);
  res.cookie('accessToken', tokens.accessToken, { httpOnly: true, sameSite: 'lax' });
  res.cookie('refreshToken', tokens.refreshToken, { httpOnly: true, sameSite: 'lax' });
  return sendSuccess(res, tokens, null, 201);
});

exports.login = asyncHandler(async (req, res) => {
  const { identifier, email, username, password } = req.body;
  const loginValue = identifier || email || username;
  if (!loginValue || !password) {
    return sendError(res, 'identifier and password are required', 400);
  }

  const user = await User.findOne({
    $or: [{ email: loginValue.toLowerCase() }, { username: loginValue.toLowerCase() }],
  })
    .select('+passwordHash')
    .populate('roles', 'name permissions');

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return sendError(res, 'Invalid credentials', 401);
  }

  user.lastLoginAt = new Date();
  await user.save();

  const tokens = await issueTokens(user, req);
  res.cookie('accessToken', tokens.accessToken, { httpOnly: true, sameSite: 'lax' });
  res.cookie('refreshToken', tokens.refreshToken, { httpOnly: true, sameSite: 'lax' });
  return sendSuccess(res, tokens);
});

exports.refresh = asyncHandler(async (req, res) => {
  const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;
  if (!refreshToken) {
    return sendError(res, 'refreshToken is required', 400);
  }

  const tokenHash = hashToken(refreshToken);
  const refreshTokenDoc = await RefreshToken.findOne({ tokenHash }).populate('user');
  if (!refreshTokenDoc || refreshTokenDoc.revokedAt || refreshTokenDoc.expiresAt < new Date()) {
    return sendError(res, 'Refresh token is invalid or expired', 401);
  }

  refreshTokenDoc.lastUsedAt = new Date();
  await refreshTokenDoc.save();

  const user = await User.findById(refreshTokenDoc.user._id).populate('roles', 'name permissions');
  const accessToken = signAccessToken({
    sub: String(user._id),
    roles: (user.roles || []).map((role) => role.name),
    email: user.email,
  });

  res.cookie('accessToken', accessToken, { httpOnly: true, sameSite: 'lax' });
  return sendSuccess(res, { accessToken, refreshToken, user: sanitizeUser(user) });
});

exports.logout = asyncHandler(async (req, res) => {
  const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;
  if (refreshToken) {
    await RefreshToken.findOneAndUpdate(
      { tokenHash: hashToken(refreshToken) },
      { revokedAt: new Date() }
    );
  }

  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  return sendSuccess(res, { loggedOut: true });
});

exports.me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate('roles', 'name permissions');
  return sendSuccess(res, sanitizeUser(user));
});
