var express = require('express');
var router = express.Router();
var userController = require('../controllers/userController');
var authMiddleware = require('../middleware/auth');
var httpLib = require('../lib/http');

var sendError = httpLib.sendError;
var sendSuccess = httpLib.sendSuccess;

var handleRouteError = function(res, error) {
  return sendError(res, error.message || 'Internal server error', error.status || 500, error.details);
};

router.get('/', authMiddleware.requireAnyRole('admin'), async function(req, res) {
  try {
    var result = await userController.listUsers(req.query || {});
    return sendSuccess(res, result.data, result.meta);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.get('/me/profile', authMiddleware.requireAuth, async function(req, res) {
  try {
    var profile = await userController.getCurrentProfile(req.user && req.user._id);
    if (!profile) {
      return sendError(res, 'User not found', 404);
    }
    return sendSuccess(res, profile);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.patch('/me/profile', authMiddleware.requireAuth, async function(req, res) {
  try {
    var profile = await userController.updateCurrentProfile(req.user && req.user._id, req.body || {});
    if (!profile) {
      return sendError(res, 'User not found', 404);
    }
    return sendSuccess(res, profile);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.get('/:id', authMiddleware.optionalAuth, async function(req, res) {
  try {
    var user = await userController.getUserById(req.params.id, {
      user: req.user,
      userRoles: req.userRoles || [],
    });
    if (!user) {
      return sendError(res, 'User not found', 404);
    }
    return sendSuccess(res, user);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.put('/:id', authMiddleware.requireAuth, async function(req, res) {
  try {
    var user = await userController.updateUser(req.params.id, req.body || {}, {
      user: req.user,
      userRoles: req.userRoles || [],
    });
    if (!user) {
      return sendError(res, 'User not found', 404);
    }
    return sendSuccess(res, user);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.delete('/:id', authMiddleware.requireAnyRole('admin'), async function(req, res) {
  try {
    var deleted = await userController.deleteUser(req.params.id);
    if (!deleted) {
      return sendError(res, 'User not found', 404);
    }
    return sendSuccess(res, { deleted: true });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

module.exports = router;
