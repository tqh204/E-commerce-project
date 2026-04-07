var express = require('express');
var router = express.Router();
var walletController = require('../controllers/walletController');
var authMiddleware = require('../middleware/auth');
var httpLib = require('../lib/http');

var sendError = httpLib.sendError;
var sendSuccess = httpLib.sendSuccess;

var handleRouteError = function(res, error) {
  return sendError(res, error.message || 'Internal server error', error.status || 500, error.details);
};

var buildActor = function(req) {
  return {
    user: req.user,
    userRoles: req.userRoles || [],
  };
};

router.post('/momo/ipn', async function(req, res) {
  try {
    var result = await walletController.momoIpn(req);
    return res.json(result);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.get('/momo/return', async function(req, res) {
  try {
    var result = await walletController.momoReturn(req);
    if (result.redirectUrl) {
      return res.redirect(result.redirectUrl);
    }
    return sendSuccess(res, result.data);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.get('/', authMiddleware.requireAuth, async function(req, res) {
  try {
    var summary = await walletController.getWalletSummary(req.user);
    return sendSuccess(res, summary);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.get('/transactions', authMiddleware.requireAuth, async function(req, res) {
  try {
    var result = await walletController.listWalletTransactions(req.user._id, req.query || {});
    return sendSuccess(res, result.data, result.meta);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.post('/top-up', authMiddleware.requireAuth, async function(req, res) {
  try {
    var summary = await walletController.topUpWallet(req.body || {}, req.user);
    return sendSuccess(res, summary);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.post('/momo/top-up', authMiddleware.requireAuth, async function(req, res) {
  try {
    var result = await walletController.createMomoTopUp(req.body || {}, req.user);
    return sendSuccess(res, result);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.get('/admin/users', authMiddleware.requireAnyRole('admin'), async function(req, res) {
  try {
    var result = await walletController.listWalletUsers(req.query || {}, buildActor(req));
    return sendSuccess(res, result.data, result.meta);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.get('/admin/transactions', authMiddleware.requireAnyRole('admin'), async function(req, res) {
  try {
    var result = await walletController.listAllWalletTransactions(req.query || {}, buildActor(req));
    return sendSuccess(res, result.data, result.meta);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.post('/admin/top-up', authMiddleware.requireAnyRole('admin'), async function(req, res) {
  try {
    var summary = await walletController.adminTopUpWallet(req.body || {}, buildActor(req));
    return sendSuccess(res, summary);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

module.exports = router;
