var schemas = require('../schemas');
var authLib = require('../lib/auth');
var httpLib = require('../lib/http');

var User = schemas.User;
var verifyAccessToken = authLib.verifyAccessToken;
var asyncHandler = httpLib.asyncHandler;
var sendError = httpLib.sendError;

var extractAccessToken = function(req) {
  var authHeader = req.headers.authorization || '';

  if (authHeader.indexOf('Bearer ') === 0) {
    return authHeader.slice(7).trim();
  }

  if (req.cookies && req.cookies.accessToken) {
    return req.cookies.accessToken;
  }

  return req.query.accessToken || null;
};

var requireAuth = asyncHandler(async function(req, res, next) {
  var token = extractAccessToken(req);
  var payload;
  var user;

  if (!token) {
    return sendError(res, 'Authentication required', 401);
  }

  try {
    payload = verifyAccessToken(token);
  } catch (error) {
    return sendError(res, error.message, 401);
  }

  user = await User.findById(payload.sub).populate('roles', 'name permissions');
  if (!user || !user.isActive) {
    return sendError(res, 'User not found or inactive', 401);
  }

  req.user = user;
  req.auth = payload;
  req.userRoles = (user.roles || []).map(function(role) {
    return role.name;
  });
  return next();
});

var optionalAuth = asyncHandler(async function(req, res, next) {
  var token = extractAccessToken(req);
  var payload;
  var user;

  if (!token) {
    return next();
  }

  try {
    payload = verifyAccessToken(token);
    user = await User.findById(payload.sub).populate('roles', 'name permissions');
    if (user && user.isActive) {
      req.user = user;
      req.auth = payload;
      req.userRoles = (user.roles || []).map(function(role) {
        return role.name;
      });
    }
  } catch (error) {
    // Ignore optional auth failure.
  }

  return next();
});

var hasAnyRole = function(req, allowedRoles) {
  var roles = allowedRoles || [];
  var userRoles = req.userRoles || [];
  var roleIndex;
  var currentRole;

  for (roleIndex = 0; roleIndex < roles.length; roleIndex += 1) {
    currentRole = roles[roleIndex];
    if (userRoles.indexOf(currentRole) !== -1) {
      return true;
    }
  }

  return false;
};

var requireAnyRole = function() {
  var allowedRoles = Array.prototype.slice.call(arguments);
  return [
    requireAuth,
    function(req, res, next) {
      if (hasAnyRole(req, allowedRoles)) {
        return next();
      }

      return sendError(res, 'Forbidden', 403);
    },
  ];
};

var isAdmin = function(req) {
  return (req.userRoles || []).indexOf('admin') !== -1;
};

module.exports = {
  requireAuth: requireAuth,
  optionalAuth: optionalAuth,
  requireAnyRole: requireAnyRole,
  hasAnyRole: hasAnyRole,
  isAdmin: isAdmin,
};
