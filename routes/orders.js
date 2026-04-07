var express = require('express');
var router = express.Router();
var orderController = require('../controllers/orderController');
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
    var result = await orderController.listOrders(req.query || {}, buildActor(req));
    return sendSuccess(res, result.data, result.meta);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.get('/:id', authMiddleware.requireAuth, async function(req, res) {
  try {
    var result = await orderController.getOrderById(req.params.id, buildActor(req));
    if (!result) {
      return sendError(res, 'Order not found', 404);
    }
    return sendSuccess(res, result);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.post('/', authMiddleware.requireAuth, async function(req, res) {
  try {
    var result = await orderController.createOrder(req.body || {}, buildActor(req));
    return sendSuccess(res, result, null, 201);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.patch('/:id/status', authMiddleware.requireAuth, async function(req, res) {
  try {
    var order = await orderController.updateOrderStatus(req.params.id, req.body || {}, buildActor(req));
    if (!order) {
      return sendError(res, 'Order not found', 404);
    }
    return sendSuccess(res, order);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.delete('/:id', authMiddleware.requireAuth, async function(req, res) {
  try {
    var deleted = await orderController.deleteOrder(req.params.id, buildActor(req));
    if (!deleted) {
      return sendError(res, 'Order not found', 404);
    }
    return sendSuccess(res, { deleted: true });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

module.exports = router;
