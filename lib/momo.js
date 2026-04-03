const axios = require('axios');
const crypto = require('crypto');
const { MomoPayment } = require('../schemas');

const toAmount = (value) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getConfig = () => ({
  endpoint: process.env.MOMO_ENDPOINT || 'https://test-payment.momo.vn/v2/gateway/api/create',
  partnerCode: process.env.MOMO_PARTNER_CODE || 'MOMO',
  accessKey: process.env.MOMO_ACCESS_KEY || '',
  secretKey: process.env.MOMO_SECRET_KEY || '',
  redirectUrl: process.env.MOMO_REDIRECT_URL || 'http://localhost:8080/api/wallet/momo/return',
  ipnUrl: process.env.MOMO_IPN_URL || 'http://localhost:8080/api/wallet/momo/ipn',
  requestType: process.env.MOMO_REQUEST_TYPE || 'payWithCC',
});

const signHmac = (raw, secretKey) =>
  crypto.createHmac('sha256', secretKey).update(raw, 'utf8').digest('hex');

const buildCreateSignature = ({
  accessKey,
  amount,
  extraData,
  ipnUrl,
  orderId,
  orderInfo,
  partnerCode,
  redirectUrl,
  requestId,
  requestType,
  secretKey,
}) => {
  const rawHash =
    `accessKey=${accessKey}` +
    `&amount=${amount}` +
    `&extraData=${extraData}` +
    `&ipnUrl=${ipnUrl}` +
    `&orderId=${orderId}` +
    `&orderInfo=${orderInfo}` +
    `&partnerCode=${partnerCode}` +
    `&redirectUrl=${redirectUrl}` +
    `&requestId=${requestId}` +
    `&requestType=${requestType}`;
  return signHmac(rawHash, secretKey);
};

const buildRawHash = (keys, payload) =>
  keys.map((key) => `${key}=${payload[key] ?? ''}`).join('&');

const verifyCallbackSignature = (payload, secretKey) => {
  if (!payload || !payload.signature) {
    return false;
  }

  const legacyFields = [
    'accessKey',
    'amount',
    'extraData',
    'message',
    'orderId',
    'orderInfo',
    'orderType',
    'partnerCode',
    'payType',
    'requestId',
    'responseTime',
    'resultCode',
    'transId',
  ];

  const returnFields = [
    'partnerCode',
    'orderId',
    'requestId',
    'amount',
    'orderInfo',
    'orderType',
    'transId',
    'resultCode',
    'message',
    'payType',
    'responseTime',
    'extraData',
  ];

  const legacyRawHash = legacyFields
    .filter((key) => payload[key] !== undefined && payload[key] !== null)
    .map((key) => `${key}=${payload[key]}`)
    .join('&');

  const returnRawHash = buildRawHash(returnFields, payload);

  const candidates = [legacyRawHash, returnRawHash].filter((item) => item);
  return candidates.some((raw) => signHmac(raw, secretKey) === payload.signature);
};

const createWalletTopUp = async ({ userId, amount }) => {
  const config = getConfig();
  const normalizedAmount = toAmount(amount);
  if (normalizedAmount <= 0) {
    const error = new Error('Top up amount must be greater than 0');
    error.status = 400;
    throw error;
  }
  if (!config.accessKey || !config.secretKey) {
    const error = new Error('MoMo config is missing');
    error.status = 500;
    throw error;
  }

  const amountStr = String(Math.round(normalizedAmount));
  const requestId = crypto.randomUUID();
  const orderId = `WALLET_${userId}_${Date.now()}`;
  const orderInfo = `Wallet top up for user ${userId}`;
  const extraData = '';
  const signature = buildCreateSignature({
    accessKey: config.accessKey,
    amount: amountStr,
    extraData,
    ipnUrl: config.ipnUrl,
    orderId,
    orderInfo,
    partnerCode: config.partnerCode,
    redirectUrl: config.redirectUrl,
    requestId,
    requestType: config.requestType,
    secretKey: config.secretKey,
  });

  const body = {
    partnerCode: config.partnerCode,
    partnerName: 'Marketplace',
    storeId: 'WalletTopup',
    requestId,
    amount: Number(amountStr),
    orderId,
    orderInfo,
    redirectUrl: config.redirectUrl,
    ipnUrl: config.ipnUrl,
    lang: 'vi',
    extraData,
    requestType: config.requestType,
    signature,
  };

  const response = await axios.post(config.endpoint, body, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 15000,
  });

  const data = response?.data || {};
  await MomoPayment.create({
    user: userId,
    amount: normalizedAmount,
    orderId,
    requestId,
    requestType: config.requestType,
    status: 'pending',
    payUrl: data.payUrl || '',
    deeplink: data.deeplink || data.deeplinkWebInApp || '',
    rawResponse: data,
  });

  return {
    orderId,
    requestId,
    payUrl: data.payUrl || '',
    deeplink: data.deeplink || data.deeplinkWebInApp || '',
    response: data,
  };
};

const normalizeCallbackPayload = (payload = {}) => ({
  ...payload,
  amount: payload.amount !== undefined ? Number(payload.amount) : payload.amount,
  resultCode:
    payload.resultCode !== undefined ? Number(payload.resultCode) : payload.resultCode,
  transId: payload.transId !== undefined ? String(payload.transId) : payload.transId,
});

const handleMomoCallback = async ({ payload, source }) => {
  const config = getConfig();
  const normalized = normalizeCallbackPayload(payload);
  const skipSignature = String(process.env.MOMO_SKIP_SIGNATURE || '').toLowerCase() === 'true';
  if (!skipSignature) {
    const isSignatureValid = verifyCallbackSignature(normalized, config.secretKey);
    if (!isSignatureValid) {
      const error = new Error('Invalid MoMo signature');
      error.status = 400;
      throw error;
    }
  }

  const payment = await MomoPayment.findOne({ orderId: normalized.orderId });
  if (!payment) {
    const error = new Error('Payment not found');
    error.status = 404;
    throw error;
  }

  if (payment.status === 'success') {
    return { payment, status: 'already_success' };
  }

  const resultCode = Number(normalized.resultCode || 0);
  const status = resultCode === 0 ? 'success' : 'failed';
  payment.status = status;
  payment.resultCode = resultCode;
  payment.transId = normalized.transId || '';
  payment.rawResponse = { ...(payment.rawResponse || {}), callback: normalized, source };
  await payment.save();

  return { payment, status };
};

module.exports = {
  createWalletTopUp,
  handleMomoCallback,
};
