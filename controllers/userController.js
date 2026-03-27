const { Role, User } = require('../schemas');
const { hashPassword } = require('../lib/auth');
const {
  asyncHandler,
  buildPaginationMeta,
  cleanObject,
  parsePagination,
  sendError,
  sendSuccess,
} = require('../lib/http');

const sanitizeUser = (user) => {
  const data = user.toObject({ virtuals: true });
  delete data.passwordHash;
  return data;
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
    users.map(sanitizeUser),
    buildPaginationMeta(page, limit, total)
  );
});

exports.getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).populate('roles', 'name permissions');
  if (!user) {
    return sendError(res, 'User not found', 404);
  }

  return sendSuccess(res, sanitizeUser(user));
});

exports.updateUser = asyncHandler(async (req, res) => {
  const isSelf = String(req.user._id) === req.params.id;
  const isAdmin = (req.userRoles || []).includes('admin');
  if (!isSelf && !isAdmin) {
    return sendError(res, 'Forbidden', 403);
  }

  const user = await User.findById(req.params.id);
  if (!user) {
    return sendError(res, 'User not found', 404);
  }

  const payload = cleanObject({
    fullName: req.body.fullName,
    phone: req.body.phone,
    bio: req.body.bio,
    avatarUrl: req.body.avatarUrl,
    status: isAdmin ? req.body.status : undefined,
    isVerified: isAdmin ? req.body.isVerified : undefined,
    isActive: isAdmin ? req.body.isActive : undefined,
  });

  if (req.body.password) {
    payload.passwordHash = hashPassword(req.body.password);
  }

  if (isAdmin && Array.isArray(req.body.roles)) {
    const roles = await Role.find({ name: { $in: req.body.roles } });
    payload.roles = roles.map((role) => role._id);
  }

  Object.assign(user, payload);
  await user.save();

  const hydrated = await User.findById(user._id).populate('roles', 'name permissions');
  return sendSuccess(res, sanitizeUser(hydrated));
});

exports.deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) {
    return sendError(res, 'User not found', 404);
  }

  return sendSuccess(res, { deleted: true });
});
