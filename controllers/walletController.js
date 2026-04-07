var schemas = require('../schemas');
var walletLib = require('../lib/wallet');
var momoLib = require('../lib/momo');
var notificationLib = require('../lib/notifications');

var User = schemas.User;
var WalletTransaction = schemas.WalletTransaction;
var buildPaginationMeta = require('../lib/http').buildPaginationMeta;
var parsePagination = require('../lib/http').parsePagination;
var getAvailableBalance = walletLib.getAvailableBalance;
var topUpWallet = walletLib.topUpWallet;
var createWalletTopUp = momoLib.createWalletTopUp;
var handleMomoCallback = momoLib.handleMomoCallback;
var createNotification = notificationLib.createNotification;

var createControllerError = function(message, status, details) {
  var error = new Error(message);
  error.status = status || 400;
  if (details !== undefined) {
    error.details = details;
  }
  return error;
};

var requireAdmin = function(actor) {
  if ((actor.userRoles || []).indexOf('admin') === -1) {
    throw createControllerError('Forbidden', 403);
  }
};

var buildWalletSummary = function(user) {
  return {
    balance: Number(user.balance || 0),
    lockedBalance: Number(user.lockedBalance || 0),
    availableBalance: getAvailableBalance(user),
  };
};

var extractCallbackPayload = function(request) {
  if (request.method === 'GET') {
    return request.query || {};
  }
  return request.body || {};
};

var buildRedirectUrl = function(baseUrl, status, orderId) {
  var separator = baseUrl.indexOf('?') === -1 ? '?' : '&';
  return baseUrl +
    separator +
    'status=' + encodeURIComponent(status) +
    '&orderId=' + encodeURIComponent(orderId || '');
};

var creditMomoTopUpIfNeeded = async function(payment) {
  var existing;
  var user;

  if (!payment || payment.status !== 'success') {
    return null;
  }

  existing = await WalletTransaction.findOne({
    'metadata.momoOrderId': payment.orderId,
    type: 'top_up',
  }).lean();

  if (existing) {
    return null;
  }

  user = await topUpWallet({
    userId: payment.user,
    amount: payment.amount,
    description: 'MoMo wallet top up (' + payment.orderId + ')',
    metadata: {
      source: 'momo',
      momoOrderId: payment.orderId,
      momoTransId: payment.transId || '',
      momoRequestId: payment.requestId,
    },
  });

  await createNotification({
    userId: payment.user,
    title: 'Nap vi thanh cong',
    message: 'Ban da nap ' +
      Number(payment.amount).toLocaleString('vi-VN') +
      ' VND vao vi.',
    type: 'wallet_top_up',
    refType: 'wallet',
    refId: String(payment.orderId),
    metadata: {
      momoOrderId: payment.orderId,
      momoTransId: payment.transId || '',
    },
  });

  return user;
};

module.exports.getWalletSummary = async function(user) {
  return buildWalletSummary(user);
};

module.exports.listWalletTransactions = async function(userId, query) {
  var pagination = parsePagination(query || {});
  var page = pagination.page;
  var limit = pagination.limit;
  var skip = pagination.skip;
  var filter = { user: userId };
  var results = await Promise.all([
    WalletTransaction.find(filter)
      .populate('order', 'orderCode status totalAmount')
      .populate('auction', 'status endAt buyNowPrice')
      .populate('escrowTransaction', 'status amount autoReleaseAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    WalletTransaction.countDocuments(filter),
  ]);

  return {
    data: results[0],
    meta: buildPaginationMeta(page, limit, results[1]),
  };
};

module.exports.topUpWallet = async function(body, user) {
  var amount = Number(body.amount || 0);
  var updatedUser = await topUpWallet({
    userId: user._id,
    amount: amount,
    description: body.description || 'Manual wallet top up',
    metadata: {
      source: body.source || 'manual',
      receiptCode: body.receiptCode || '',
    },
  });

  return buildWalletSummary(updatedUser);
};

module.exports.createMomoTopUp = async function(body, user) {
  var amount = Number(body.amount || 0);
  var result;

  if (!Number.isFinite(amount) || amount < 10000) {
    throw createControllerError('Minimum top up amount is 10,000 VND', 400);
  }

  result = await createWalletTopUp({
    userId: user._id,
    amount: amount,
  });

  return {
    payUrl: result.payUrl,
    deeplink: result.deeplink,
    orderId: result.orderId,
    requestId: result.requestId,
    momoResponse: result.response,
  };
};

module.exports.momoReturn = async function(request) {
  var payload = extractCallbackPayload(request);
  var callbackResult = await handleMomoCallback({ payload: payload, source: 'return' });
  var payment = callbackResult.payment;
  var status = callbackResult.status;
  var redirectBase = process.env.MOMO_RETURN_REDIRECT_URL || '';

  await creditMomoTopUpIfNeeded(payment);

  return {
    redirectUrl: redirectBase ? buildRedirectUrl(redirectBase, status, payment.orderId) : '',
    data: {
      status: status,
      orderId: payment.orderId,
      resultCode: payment.resultCode,
    },
  };
};

module.exports.momoIpn = async function(request) {
  var payload = extractCallbackPayload(request);
  var callbackResult = await handleMomoCallback({ payload: payload, source: 'ipn' });
  var payment = callbackResult.payment;
  var status = callbackResult.status;

  await creditMomoTopUpIfNeeded(payment);

  return {
    resultCode: 0,
    message: status === 'success' ? 'Success' : 'Processed',
  };
};

module.exports.listWalletUsers = async function(query, actor) {
  var pagination;
  var page;
  var limit;
  var skip;
  var search;
  var filter;
  var results;
  var items;
  var total;
  var data;

  requireAdmin(actor);

  pagination = parsePagination(query || {});
  page = pagination.page;
  limit = pagination.limit;
  skip = pagination.skip;
  search = String((query && query.q) || '').trim();
  filter = {};

  if (search) {
    filter = {
      $or: [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { fullName: { $regex: search, $options: 'i' } },
      ],
    };
  }

  results = await Promise.all([
    User.find(filter)
      .populate('roles', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    User.countDocuments(filter),
  ]);
  items = results[0];
  total = results[1];

  data = items.map(function(user) {
    return {
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
    };
  });

  return {
    data: data,
    meta: buildPaginationMeta(page, limit, total),
  };
};

module.exports.listAllWalletTransactions = async function(query, actor) {
  var pagination;
  var page;
  var limit;
  var skip;
  var filter = {};
  var results;

  requireAdmin(actor);

  pagination = parsePagination(query || {});
  page = pagination.page;
  limit = pagination.limit;
  skip = pagination.skip;

  if (query && query.userId) {
    filter.user = query.userId;
  }

  results = await Promise.all([
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

  return {
    data: results[0],
    meta: buildPaginationMeta(page, limit, results[1]),
  };
};

module.exports.adminTopUpWallet = async function(body, actor) {
  var userId;
  var amount;
  var user;

  requireAdmin(actor);

  userId = body.userId;
  if (!userId) {
    throw createControllerError('userId is required', 400);
  }

  amount = Number(body.amount || 0);
  user = await topUpWallet({
    userId: userId,
    amount: amount,
    description: body.description || 'Admin top up',
    metadata: {
      source: 'admin',
      adminUserId: actor.user && actor.user._id,
      receiptCode: body.receiptCode || '',
    },
  });

  return {
    _id: user._id,
    balance: Number(user.balance || 0),
    lockedBalance: Number(user.lockedBalance || 0),
    availableBalance: getAvailableBalance(user),
  };
};
