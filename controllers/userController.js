const { Role, User } = require('../schemas');
const { hashPassword } = require('../lib/auth');
const { isStrongPassword, passwordRuleMessage } = require('../schemas/validators');
const {
  asyncHandler,
  buildPaginationMeta,
  cleanObject,
  parsePagination,
  sendError,
  sendSuccess,
} = require('../lib/http');

const sanitizeUser = (user, options = {}) => {
  const { privateView = false } = options;
  const data = user.toObject({ virtuals: true });
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

const canManageAsAdmin = (req) => (req.userRoles || []).includes('admin');

const applyUserUpdate = async (user, req, permissions) => {
  const payload = cleanObject({
    fullName: permissions.canEditProfile ? req.body.fullName : undefined,
    phone: permissions.canEditProfile ? req.body.phone : undefined,
    bio: permissions.canEditProfile ? req.body.bio : undefined,
    avatarUrl: permissions.canEditProfile ? req.body.avatarUrl : undefined,
    status: permissions.canModerate ? req.body.status : undefined,
    isVerified: permissions.canModerate ? req.body.isVerified : undefined,
    isActive: permissions.canModerate ? req.body.isActive : undefined,
  });

  if (permissions.canChangePassword && req.body.password) {
    if (!isStrongPassword(req.body.password)) {
      const error = new Error(passwordRuleMessage);
      error.status = 400;
      throw error;
    }
    payload.passwordHash = hashPassword(req.body.password);
  }

  if (permissions.canManageRoles && Array.isArray(req.body.roles)) {
    const requestedRoles = req.body.roles
      .map((role) => `${role || ''}`.trim().toLowerCase())
      .filter((role) => ['user', 'admin'].includes(role));
    const roles = await Role.find({ name: { $in: requestedRoles } });
    payload.roles = roles.map((role) => role._id);
  }

  Object.assign(user, payload);
  await user.save();

  return User.findById(user._id).populate('roles', 'name permissions');
};

exports.listUsers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = {};
  if (req.query.role) {
    const role = await Role.findOne({ name: req.query.role });
    filter.roles = role ? role._id : null;
  }
  if (req.query.status) {
    filter.status = req.query.status;
  }

  const [users, total] = await Promise.all([
    User.find(filter).populate('roles', 'name permissions').skip(skip).limit(limit).sort({ createdAt: -1 }),
    User.countDocuments(filter),
  ]);

  return sendSuccess(
    res,
    users.map((user) => sanitizeUser(user, { privateView: true })),
    buildPaginationMeta(page, limit, total)
  );
});

exports.getCurrentProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate('roles', 'name permissions');
  return sendSuccess(res, sanitizeUser(user, { privateView: true }));
});

exports.updateCurrentProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    return sendError(res, 'User not found', 404);
  }

  const hydrated = await applyUserUpdate(user, req, {
    canEditProfile: true,
    canChangePassword: true,
    canModerate: false,
    canManageRoles: false,
  });

  return sendSuccess(res, sanitizeUser(hydrated, { privateView: true }));
});

exports.getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).populate('roles', 'name permissions');
  if (!user) {
    return sendError(res, 'User not found', 404);
  }

  const isSelf = req.user && String(req.user._id) === req.params.id;
  const privateView = isSelf || canManageAsAdmin(req);
  return sendSuccess(res, sanitizeUser(user, { privateView }));
});

exports.updateUser = asyncHandler(async (req, res) => {
  const isSelf = String(req.user._id) === req.params.id;
  const isAdmin = canManageAsAdmin(req);
  if (!isSelf && !isAdmin) {
    return sendError(res, 'Forbidden', 403);
  }

  const user = await User.findById(req.params.id);
  if (!user) {
    return sendError(res, 'User not found', 404);
  }

  const hydrated = await applyUserUpdate(user, req, {
    canEditProfile: isSelf || isAdmin,
    canChangePassword: isSelf || isAdmin,
    canModerate: !isSelf && isAdmin,
    canManageRoles: isAdmin,
  });

  return sendSuccess(res, sanitizeUser(hydrated, { privateView: true }));
});

exports.deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) {
    return sendError(res, 'User not found', 404);
  }

  return sendSuccess(res, { deleted: true });
});
