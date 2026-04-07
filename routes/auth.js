var express = require('express');
var router = express.Router();
var authController = require('../controllers/authController');
var authMiddleware = require('../middleware/auth');
var httpLib = require('../lib/http');

var sendError = httpLib.sendError;
var sendSuccess = httpLib.sendSuccess;

var handleRouteError = function(res, error) {
  return sendError(res, error.message || 'Internal server error', error.status || 500, error.details);
};

var writeAuthCookies = function(res, tokens) {
  res.cookie('accessToken', tokens.accessToken, { httpOnly: true, sameSite: 'lax' });
  res.cookie('refreshToken', tokens.refreshToken, { httpOnly: true, sameSite: 'lax' });
};

router.post('/register', async function(req, res) {
  try {
    var tokens = await authController.register(req.body || {}, req);
    writeAuthCookies(res, tokens);
    return sendSuccess(res, tokens, null, 201);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.post('/login', async function(req, res) {
  try {
    var tokens = await authController.login(req.body || {}, req);
    writeAuthCookies(res, tokens);
    return sendSuccess(res, tokens);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.post('/refresh', async function(req, res) {
  try {
    var refreshToken = (req.body && req.body.refreshToken) || (req.cookies && req.cookies.refreshToken);
    var result = await authController.refresh(refreshToken);
    res.cookie('accessToken', result.accessToken, { httpOnly: true, sameSite: 'lax' });
    return sendSuccess(res, result);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.post('/logout', async function(req, res) {
  try {
    var refreshToken = (req.body && req.body.refreshToken) || (req.cookies && req.cookies.refreshToken);
    var result = await authController.logout(refreshToken);
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    return sendSuccess(res, result);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.get('/me', authMiddleware.requireAuth, async function(req, res) {
  try {
    var user = await authController.me(req.user && req.user._id);
    if (!user) {
      return sendError(res, 'User not found', 404);
    }
    return sendSuccess(res, user);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

module.exports = router;
