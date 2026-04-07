var schemas = require('../schemas');
var authLib = require('../lib/auth');
var validators = require('../schemas/validators');
var httpLib = require('../lib/http');

var Role = schemas.Role;
var User = schemas.User;
var hashPassword = authLib.hashPassword;
var isStrongPassword = validators.isStrongPassword;
var passwordRuleMessage = validators.passwordRuleMessage;
var buildPaginationMeta = httpLib.buildPaginationMeta;
var cleanObject = httpLib.cleanObject;
var parsePagination = httpLib.parsePagination;

var createControllerError = function(message, status, details) {
  var error = new Error(message);
  error.status = status || 400;
  if (details !== undefined) {
    error.details = details;
  }
  return error;
};

var sanitizeUser = function(user, options) {
  var config = options || {};
  var privateView = Boolean(config.privateView);
  var data = user.toObject({ virtuals: true });

  delete data.passwordHash;

  if (!privateView) {
    delete data.email;
    delete data.phone;
    delete data.defaultAddress;
    delete data.balance;
    delete data.metadata;
    delete data.status;
    delete data.lastLoginAt;
  }

  return data;
};

var canManageAsAdmin = function(userRoles) {
  return (userRoles || []).indexOf('admin') !== -1;
};

var normalizeRoleNames = function(roles) {
  return (roles || [])
    .map(function(role) {
      return String(role || '').trim().toLowerCase();
    })
    .filter(function(role) {
      return ['user', 'admin'].indexOf(role) !== -1;
    });
};

var applyUserUpdate = async function(user, payload, permissions) {
  var body = payload || {};
  var patch = cleanObject({
    fullName: permissions.canEditProfile ? body.fullName : undefined,
    phone: permissions.canEditProfile ? body.phone : undefined,
    bio: permissions.canEditProfile ? body.bio : undefined,
    avatarUrl: permissions.canEditProfile ? body.avatarUrl : undefined,
    status: permissions.canModerate ? body.status : undefined,
    isVerified: permissions.canModerate ? body.isVerified : undefined,
    isActive: permissions.canModerate ? body.isActive : undefined,
  });
  var requestedRoles;
  var roles;

  if (permissions.canChangePassword && body.password) {
    if (!isStrongPassword(body.password)) {
      throw createControllerError(passwordRuleMessage, 400);
    }

    patch.passwordHash = hashPassword(body.password);
  }

  if (permissions.canManageRoles && Array.isArray(body.roles)) {
    requestedRoles = normalizeRoleNames(body.roles);
    roles = await Role.find({ name: { $in: requestedRoles } });
    patch.roles = roles.map(function(role) {
      return role._id;
    });
  }

  Object.assign(user, patch);
  await user.save();

  return User.findById(user._id).populate('roles', 'name permissions');
};

module.exports.listUsers = async function(query) {
  var pagination = parsePagination(query || {});
  var page = pagination.page;
  var limit = pagination.limit;
  var skip = pagination.skip;
  var filter = {};
  var role;
  var results;
  var users;
  var total;

  if (query && query.role) {
    role = await Role.findOne({ name: query.role });
    filter.roles = role ? role._id : null;
  }
  if (query && query.status) {
    filter.status = query.status;
  }

  results = await Promise.all([
    User.find(filter).populate('roles', 'name permissions').skip(skip).limit(limit).sort({ createdAt: -1 }),
    User.countDocuments(filter),
  ]);
  users = results[0];
  total = results[1];

  return {
    data: users.map(function(user) {
      return sanitizeUser(user, { privateView: true });
    }),
    meta: buildPaginationMeta(page, limit, total),
  };
};

module.exports.getCurrentProfile = async function(userId) {
  var user = await User.findById(userId).populate('roles', 'name permissions');

  if (!user) {
    return null;
  }

  return sanitizeUser(user, { privateView: true });
};

module.exports.updateCurrentProfile = async function(userId, body) {
  var user = await User.findById(userId);
  var hydrated;

  if (!user) {
    return null;
  }

  hydrated = await applyUserUpdate(user, body, {
    canEditProfile: true,
    canChangePassword: true,
    canModerate: false,
    canManageRoles: false,
  });

  return sanitizeUser(hydrated, { privateView: true });
};

module.exports.getUserById = async function(userId, viewer) {
  var user = await User.findById(userId).populate('roles', 'name permissions');
  var isSelf;
  var privateView;

  if (!user) {
    return null;
  }

  isSelf = viewer && viewer.user && String(viewer.user._id) === String(userId);
  privateView = isSelf || canManageAsAdmin(viewer && viewer.userRoles);
  return sanitizeUser(user, { privateView: privateView });
};

module.exports.updateUser = async function(userId, body, actor) {
  var isSelf = actor && actor.user && String(actor.user._id) === String(userId);
  var isAdmin = canManageAsAdmin(actor && actor.userRoles);
  var user;
  var hydrated;

  if (!isSelf && !isAdmin) {
    throw createControllerError('Forbidden', 403);
  }

  user = await User.findById(userId);
  if (!user) {
    return null;
  }

  hydrated = await applyUserUpdate(user, body, {
    canEditProfile: isSelf || isAdmin,
    canChangePassword: isSelf || isAdmin,
    canModerate: !isSelf && isAdmin,
    canManageRoles: isAdmin,
  });

  return sanitizeUser(hydrated, { privateView: true });
};

module.exports.deleteUser = async function(userId) {
  var user = await User.findByIdAndDelete(userId);

  if (!user) {
    return false;
  }

  return true;
};
