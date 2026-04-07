var express = require('express');
var router = express.Router();
var notificationController = require('../controllers/notificationController');
var authMiddleware = require('../middleware/auth');
var httpLib = require('../lib/http');

var sendError = httpLib.sendError;
var sendSuccess = httpLib.sendSuccess;

var handleRouteError = function(res, error) {
  return sendError(res, error.message || 'Internal server error', error.status || 500, error.details);
};

router.get('/', authMiddleware.requireAuth, async function(req, res) {
  try {
    var result = await notificationController.listNotifications(req.user._id, req.query || {});
    return sendSuccess(res, result.data, result.meta);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.patch('/:id/read', authMiddleware.requireAuth, async function(req, res) {
  try {
    var notification = await notificationController.markNotificationRead(req.params.id, req.user._id);
    return sendSuccess(res, notification || { updated: false });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.patch('/read-all', authMiddleware.requireAuth, async function(req, res) {
  try {
    var result = await notificationController.markAllRead(req.user._id);
    return sendSuccess(res, result);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

module.exports = router;
