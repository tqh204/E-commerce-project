var express = require('express');
var router = express.Router();
var productController = require('../controllers/productController');
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

router.get('/', authMiddleware.optionalAuth, async function(req, res) {
  try {
    var result = await productController.getAllProducts(req.query || {}, buildActor(req));
    return sendSuccess(res, result.data, result.meta);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.get('/:id', authMiddleware.optionalAuth, async function(req, res) {
  try {
    var product = await productController.getProductById(req.params.id, buildActor(req));
    if (!product) {
      return sendError(res, 'Product not found', 404);
    }
    return sendSuccess(res, product);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.post('/', authMiddleware.requireAnyRole('user', 'admin'), async function(req, res) {
  try {
    var product = await productController.createProduct(req.body || {}, buildActor(req));
    return sendSuccess(res, product, null, 201);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.put('/:id', authMiddleware.requireAuth, async function(req, res) {
  try {
    var product = await productController.updateProduct(req.params.id, req.body || {}, buildActor(req));
    if (!product) {
      return sendError(res, 'Product not found', 404);
    }
    return sendSuccess(res, product);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.delete('/:id', authMiddleware.requireAuth, async function(req, res) {
  try {
    var deleted = await productController.deleteProduct(req.params.id, buildActor(req));
    if (!deleted) {
      return sendError(res, 'Product not found', 404);
    }
    return sendSuccess(res, { deleted: true });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

module.exports = router;
