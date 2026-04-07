var axios = require('axios');
var crypto = require('crypto');
var schemas = require('../schemas');

var MomoPayment = schemas.MomoPayment;

var toAmount = function(value) {
  var parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

var getConfig = function() {
  return {
    endpoint: process.env.MOMO_ENDPOINT || 'https://test-payment.momo.vn/v2/gateway/api/create',
    partnerCode: process.env.MOMO_PARTNER_CODE || 'MOMO',
    accessKey: process.env.MOMO_ACCESS_KEY || '',
    secretKey: process.env.MOMO_SECRET_KEY || '',
    redirectUrl: process.env.MOMO_REDIRECT_URL || 'http://localhost:8080/api/wallet/momo/return',
    ipnUrl: process.env.MOMO_IPN_URL || 'http://localhost:8080/api/wallet/momo/ipn',
    requestType: process.env.MOMO_REQUEST_TYPE || 'payWithCC',
  };
};

var signHmac = function(raw, secretKey) {
  return crypto.createHmac('sha256', secretKey).update(raw, 'utf8').digest('hex');
};

var buildCreateSignature = function(options) {
  var rawHash =
    'accessKey=' + options.accessKey +
    '&amount=' + options.amount +
    '&extraData=' + options.extraData +
    '&ipnUrl=' + options.ipnUrl +
    '&orderId=' + options.orderId +
    '&orderInfo=' + options.orderInfo +
    '&partnerCode=' + options.partnerCode +
    '&redirectUrl=' + options.redirectUrl +
    '&requestId=' + options.requestId +
    '&requestType=' + options.requestType;

  return signHmac(rawHash, options.secretKey);
};

var buildRawHash = function(keys, payload) {
  var pairs = [];
  var index;
  var key;
  var value;

  for (index = 0; index < keys.length; index += 1) {
    key = keys[index];
    value = payload[key];
    if (value === undefined || value === null) {
      value = '';
    }
    pairs.push(key + '=' + value);
  }

  return pairs.join('&');
};

var verifyCallbackSignature = function(payload, secretKey) {
  var legacyFields;
  var returnFields;
  var legacyParts = [];
  var legacyRawHash;
  var returnRawHash;
  var candidates = [];
  var index;
  var key;

  if (!payload || !payload.signature) {
    return false;
  }

  legacyFields = [
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

  returnFields = [
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

  for (index = 0; index < legacyFields.length; index += 1) {
    key = legacyFields[index];
    if (payload[key] !== undefined && payload[key] !== null) {
      legacyParts.push(key + '=' + payload[key]);
    }
  }

  legacyRawHash = legacyParts.join('&');
  returnRawHash = buildRawHash(returnFields, payload);

  if (legacyRawHash) {
    candidates.push(legacyRawHash);
  }
  if (returnRawHash) {
    candidates.push(returnRawHash);
  }

  for (index = 0; index < candidates.length; index += 1) {
    if (signHmac(candidates[index], secretKey) === payload.signature) {
      return true;
    }
  }

  return false;
};

var buildRandomId = function() {
  return crypto.randomBytes(16).toString('hex');
};

var createWalletTopUp = async function(options) {
  var userId = options.userId;
  var amount = options.amount;
  var config = getConfig();
  var normalizedAmount = toAmount(amount);
  var error;
  var amountStr;
  var requestId;
  var orderId;
  var orderInfo;
  var extraData = '';
  var signature;
  var body;
  var response;
  var data;

  if (normalizedAmount <= 0) {
    error = new Error('Top up amount must be greater than 0');
    error.status = 400;
    throw error;
  }
  if (!config.accessKey || !config.secretKey) {
    error = new Error('MoMo config is missing');
    error.status = 500;
    throw error;
  }

  amountStr = String(Math.round(normalizedAmount));
  requestId = buildRandomId();
  orderId = 'WALLET_' + userId + '_' + Date.now();
  orderInfo = 'Wallet top up for user ' + userId;
  signature = buildCreateSignature({
    accessKey: config.accessKey,
    amount: amountStr,
    extraData: extraData,
    ipnUrl: config.ipnUrl,
    orderId: orderId,
    orderInfo: orderInfo,
    partnerCode: config.partnerCode,
    redirectUrl: config.redirectUrl,
    requestId: requestId,
    requestType: config.requestType,
    secretKey: config.secretKey,
  });

  body = {
    partnerCode: config.partnerCode,
    partnerName: 'Marketplace',
    storeId: 'WalletTopup',
    requestId: requestId,
    amount: Number(amountStr),
    orderId: orderId,
    orderInfo: orderInfo,
    redirectUrl: config.redirectUrl,
    ipnUrl: config.ipnUrl,
    lang: 'vi',
    extraData: extraData,
    requestType: config.requestType,
    signature: signature,
  };

  response = await axios.post(config.endpoint, body, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 15000,
  });

  data = response && response.data ? response.data : {};
  await MomoPayment.create({
    user: userId,
    amount: normalizedAmount,
    orderId: orderId,
    requestId: requestId,
    requestType: config.requestType,
    status: 'pending',
    payUrl: data.payUrl || '',
    deeplink: data.deeplink || data.deeplinkWebInApp || '',
    rawResponse: data,
  });

  return {
    orderId: orderId,
    requestId: requestId,
    payUrl: data.payUrl || '',
    deeplink: data.deeplink || data.deeplinkWebInApp || '',
    response: data,
  };
};

var normalizeCallbackPayload = function(payload) {
  var source = payload || {};
  var normalized = {};
  var key;

  for (key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      normalized[key] = source[key];
    }
  }

  if (source.amount !== undefined) {
    normalized.amount = Number(source.amount);
  }
  if (source.resultCode !== undefined) {
    normalized.resultCode = Number(source.resultCode);
  }
  if (source.transId !== undefined) {
    normalized.transId = String(source.transId);
  }

  return normalized;
};

var handleMomoCallback = async function(options) {
  var payload = options.payload;
  var source = options.source;
  var config = getConfig();
  var normalized = normalizeCallbackPayload(payload);
  var skipSignature = String(process.env.MOMO_SKIP_SIGNATURE || '').toLowerCase() === 'true';
  var isSignatureValid;
  var payment;
  var resultCode;
  var status;
  var nextRawResponse = {};
  var key;
  var error;

  if (!skipSignature) {
    isSignatureValid = verifyCallbackSignature(normalized, config.secretKey);
    if (!isSignatureValid) {
      error = new Error('Invalid MoMo signature');
      error.status = 400;
      throw error;
    }
  }

  payment = await MomoPayment.findOne({ orderId: normalized.orderId });
  if (!payment) {
    error = new Error('Payment not found');
    error.status = 404;
    throw error;
  }

  if (payment.status === 'success') {
    return { payment: payment, status: 'already_success' };
  }

  resultCode = Number(normalized.resultCode || 0);
  status = resultCode === 0 ? 'success' : 'failed';
  payment.status = status;
  payment.resultCode = resultCode;
  payment.transId = normalized.transId || '';

  if (payment.rawResponse) {
    for (key in payment.rawResponse) {
      if (Object.prototype.hasOwnProperty.call(payment.rawResponse, key)) {
        nextRawResponse[key] = payment.rawResponse[key];
      }
    }
  }
  nextRawResponse.callback = normalized;
  nextRawResponse.source = source;
  payment.rawResponse = nextRawResponse;
  await payment.save();

  return { payment: payment, status: status };
};

module.exports = {
  createWalletTopUp: createWalletTopUp,
  handleMomoCallback: handleMomoCallback,
};
