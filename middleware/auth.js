const { User } = require('../schemas');
const { verifyAccessToken } = require('../lib/auth');
const { asyncHandler, sendError } = require('../lib/http');

const extractAccessToken = (req) => {
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }

  return req.cookies?.accessToken || req.query.accessToken || null;
};

const requireAuth = asyncHandler(async (req, res, next) => {
  const token = extractAccessToken(req);
  if (!token) {
    return sendError(res, 'Authentication required', 401);
  }

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (error) {
    return sendError(res, error.message, 401);
  }

  const user = await User.findById(payload.sub).populate('roles', 'name permissions');
  if (!user || !user.isActive) {
    return sendError(res, 'User not found or inactive', 401);
  }

  req.user = user;
  req.auth = payload;
  req.userRoles = (user.roles || []).map((role) => role.name);
  return next();
});

const optionalAuth = asyncHandler(async (req, res, next) => {
  const token = extractAccessToken(req);
  if (!token) {
    return next();
  }

  try {
    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub).populate('roles', 'name permissions');
    if (user && user.isActive) {
      req.user = user;
      req.auth = payload;
      req.userRoles = (user.roles || []).map((role) => role.name);
    }
  } catch (error) {
    // Ignore optional auth failure.
  }

  return next();
});

const requireAnyRole = (...allowedRoles) => [
  requireAuth,
  (req, res, next) => {
    const roleSet = new Set(req.userRoles || []);
    if (allowedRoles.some((role) => roleSet.has(role))) {
      return next();
    }

    return sendError(res, 'Forbidden', 403);
  },
];

const isAdmin = (req) => (req.userRoles || []).includes('admin');

module.exports = {
  requireAuth,
  optionalAuth,
  requireAnyRole,
  isAdmin,
};
