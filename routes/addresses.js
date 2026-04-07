var express = require('express');
var router = express.Router();
var addressController = require('../controllers/addressController');
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

router.get('/', authMiddleware.requireAuth, async function(req, res) {
  try {
    var addresses = await addressController.listAddresses(buildActor(req), req.query || {});
    return sendSuccess(res, addresses);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.get('/:id', authMiddleware.requireAuth, async function(req, res) {
  try {
    var address = await addressController.getAddressById(req.params.id, buildActor(req));
    if (!address) {
      return sendError(res, 'Address not found', 404);
    }
    return sendSuccess(res, address);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.post('/', authMiddleware.requireAuth, async function(req, res) {
  try {
    var address = await addressController.createAddress(req.body || {}, buildActor(req));
    return sendSuccess(res, address, null, 201);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.put('/:id', authMiddleware.requireAuth, async function(req, res) {
  try {
    var address = await addressController.updateAddress(req.params.id, req.body || {}, buildActor(req));
    if (!address) {
      return sendError(res, 'Address not found', 404);
    }
    return sendSuccess(res, address);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.delete('/:id', authMiddleware.requireAuth, async function(req, res) {
  try {
    var deleted = await addressController.deleteAddress(req.params.id, buildActor(req));
    if (!deleted) {
      return sendError(res, 'Address not found', 404);
    }
    return sendSuccess(res, { deleted: true });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

module.exports = router;
