const { User, WalletTransaction } = require('../schemas');
const { asyncHandler, buildPaginationMeta, parsePagination, sendSuccess } = require('../lib/http');
const { getAvailableBalance, topUpWallet } = require('../lib/wallet');
const { createWalletTopUp, handleMomoCallback } = require('../lib/momo');
const { createNotification } = require('../lib/notifications');
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

exports.createMomoTopUp = asyncHandler(async (req, res) => {
  const amount = Number(req.body.amount || 0);
  if (!Number.isFinite(amount) || amount < 10000) {
    const error = new Error('Minimum top up amount is 10,000 VND');
    error.status = 400;
    throw error;
  }

  const result = await createWalletTopUp({
    userId: req.user._id,
    amount,
  });

  return sendSuccess(res, {
    payUrl: result.payUrl,
    deeplink: result.deeplink,
    orderId: result.orderId,
    requestId: result.requestId,
    momoResponse: result.response,
  });
});

const extractCallbackPayload = (req) => {
  if (req.method === 'GET') {
    return req.query || {};
  }
  return req.body || {};
};

const creditMomoTopUpIfNeeded = async (payment) => {
  if (!payment || payment.status !== 'success') {
    return null;
  }

  const existing = await WalletTransaction.findOne({
    'metadata.momoOrderId': payment.orderId,
    type: 'top_up',
  }).lean();
  if (existing) {
    return null;
  }

  const user = await topUpWallet({
    userId: payment.user,
    amount: payment.amount,
    description: `MoMo wallet top up (${payment.orderId})`,
    metadata: {
      source: 'momo',
      momoOrderId: payment.orderId,
      momoTransId: payment.transId || '',
      momoRequestId: payment.requestId,
    },
  });

  await createNotification({
    userId: payment.user,
    title: 'Nạp ví thành công',
    message: `Bạn đã nạp ${Number(payment.amount).toLocaleString('vi-VN')} VND vào ví.`,
    type: 'wallet_top_up',
    refType: 'wallet',
    refId: String(payment.orderId),
    metadata: { momoOrderId: payment.orderId, momoTransId: payment.transId || '' },
  });

  return user;
};

exports.momoReturn = asyncHandler(async (req, res) => {
  const payload = extractCallbackPayload(req);
  const { payment, status } = await handleMomoCallback({ payload, source: 'return' });
  await creditMomoTopUpIfNeeded(payment);

  const redirectBase = process.env.MOMO_RETURN_REDIRECT_URL || '';
  if (redirectBase) {
    const url = new URL(redirectBase);
    url.searchParams.set('status', status);
    url.searchParams.set('orderId', payment.orderId);
    return res.redirect(url.toString());
  }

  return sendSuccess(res, {
    status,
    orderId: payment.orderId,
    resultCode: payment.resultCode,
  });
});

exports.momoIpn = asyncHandler(async (req, res) => {
  const payload = extractCallbackPayload(req);
  const { payment, status } = await handleMomoCallback({ payload, source: 'ipn' });
  await creditMomoTopUpIfNeeded(payment);

  return res.json({
    resultCode: 0,
    message: status === 'success' ? 'Success' : 'Processed',
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
