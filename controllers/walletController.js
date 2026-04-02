const { User, WalletTransaction } = require('../schemas');
const { asyncHandler, buildPaginationMeta, parsePagination, sendSuccess } = require('../lib/http');
const { getAvailableBalance, topUpWallet } = require('../lib/wallet');
const { isAdmin } = require('../middleware/auth');

const requireAdmin = (req) => {
  if (!isAdmin(req)) {
    const error = new Error('Forbidden');
    error.status = 403;
    throw error;
  }
};

exports.getWalletSummary = asyncHandler(async (req, res) => {
  const user = req.user;
  return sendSuccess(res, {
    balance: Number(user.balance || 0),
    lockedBalance: Number(user.lockedBalance || 0),
    availableBalance: getAvailableBalance(user),
  });
});

exports.listWalletTransactions = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = { user: req.user._id };

  const [items, total] = await Promise.all([
    WalletTransaction.find(filter)
      .populate('order', 'orderCode status totalAmount')
      .populate('auction', 'status endAt buyNowPrice')
      .populate('escrowTransaction', 'status amount autoReleaseAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    WalletTransaction.countDocuments(filter),
  ]);

  return sendSuccess(res, items, buildPaginationMeta(page, limit, total));
});

exports.topUpWallet = asyncHandler(async (req, res) => {
  const amount = Number(req.body.amount || 0);
  const user = await topUpWallet({
    userId: req.user._id,
    amount,
    description: req.body.description || 'Manual wallet top up',
    metadata: {
      source: req.body.source || 'manual',
      receiptCode: req.body.receiptCode || '',
    },
  });

  return sendSuccess(res, {
    balance: Number(user.balance || 0),
    lockedBalance: Number(user.lockedBalance || 0),
    availableBalance: getAvailableBalance(user),
  });
});

exports.listWalletUsers = asyncHandler(async (req, res) => {
  requireAdmin(req);
  const { page, limit, skip } = parsePagination(req.query);
  const query = String(req.query.q || '').trim();

  const filter = query
    ? {
        $or: [
          { username: { $regex: query, $options: 'i' } },
          { email: { $regex: query, $options: 'i' } },
          { fullName: { $regex: query, $options: 'i' } },
        ],
      }
    : {};

  const [items, total] = await Promise.all([
    User.find(filter)
      .populate('roles', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    User.countDocuments(filter),
  ]);

  const data = items.map((user) => ({
    _id: user._id,
    username: user.username,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    roles: user.roles,
    balance: Number(user.balance || 0),
    lockedBalance: Number(user.lockedBalance || 0),
    availableBalance: getAvailableBalance(user),
    isActive: Boolean(user.isActive),
    isVerified: Boolean(user.isVerified),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }));

  return sendSuccess(res, data, buildPaginationMeta(page, limit, total));
});

exports.listAllWalletTransactions = asyncHandler(async (req, res) => {
  requireAdmin(req);
  const { page, limit, skip } = parsePagination(req.query);
  const filter = {};

  if (req.query.userId) {
    filter.user = req.query.userId;
  }

  const [items, total] = await Promise.all([
    WalletTransaction.find(filter)
      .populate('user', 'fullName username email balance lockedBalance')
      .populate('order', 'orderCode status totalAmount')
      .populate('auction', 'status endAt buyNowPrice')
      .populate('escrowTransaction', 'status amount autoReleaseAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    WalletTransaction.countDocuments(filter),
  ]);

  return sendSuccess(res, items, buildPaginationMeta(page, limit, total));
});

exports.adminTopUpWallet = asyncHandler(async (req, res) => {
  requireAdmin(req);
  const userId = req.body.userId;
  if (!userId) {
    const error = new Error('userId is required');
    error.status = 400;
    throw error;
  }

  const amount = Number(req.body.amount || 0);
  const user = await topUpWallet({
    userId,
    amount,
    description: req.body.description || 'Admin top up',
    metadata: {
      source: 'admin',
      adminUserId: req.user._id,
      receiptCode: req.body.receiptCode || '',
    },
  });

  return sendSuccess(res, {
    _id: user._id,
    balance: Number(user.balance || 0),
    lockedBalance: Number(user.lockedBalance || 0),
    availableBalance: getAvailableBalance(user),
  });
});
