var express = require('express');
var router = express.Router();
var escrowController = require('../controllers/escrowController');
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
    var result = await escrowController.listEscrows(req.query || {}, buildActor(req));
    return sendSuccess(res, result.data, result.meta);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.get('/:id', authMiddleware.requireAuth, async function(req, res) {
  try {
    var escrow = await escrowController.getEscrowById(req.params.id, buildActor(req));
    if (!escrow) {
      return sendError(res, 'Escrow transaction not found', 404);
    }
    return sendSuccess(res, escrow);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.patch('/:id/hold', authMiddleware.requireAuth, async function(req, res) {
  try {
    var result = await escrowController.holdEscrow(req.params.id, req.body || {}, buildActor(req));
    if (!result) {
      return sendError(res, 'Escrow transaction not found', 404);
    }
    return sendSuccess(res, result);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.patch('/:id/release', authMiddleware.requireAuth, async function(req, res) {
  try {
    var result = await escrowController.releaseEscrow(req.params.id, req.body || {}, buildActor(req));
    if (!result) {
      return sendError(res, 'Escrow transaction not found', 404);
    }
    return sendSuccess(res, result);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.patch('/:id/refund', authMiddleware.requireAuth, async function(req, res) {
  try {
    var result = await escrowController.refundEscrow(req.params.id, req.body || {}, buildActor(req));
    if (!result) {
      return sendError(res, 'Escrow transaction not found', 404);
    }
    return sendSuccess(res, result);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.patch('/:id/dispute', authMiddleware.requireAuth, async function(req, res) {
  try {
    var result = await escrowController.disputeEscrow(req.params.id, req.body || {}, buildActor(req));
    if (!result) {
      return sendError(res, 'Escrow transaction not found', 404);
    }
    return sendSuccess(res, result);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

module.exports = router;
