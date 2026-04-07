var express = require('express');
var router = express.Router();
var importController = require('../controllers/importController');
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

router.post('/chotot', authMiddleware.requireAnyRole('admin'), async function(req, res) {
  try {
    var result = await importController.importChotot(req.body || {}, buildActor(req));
    return sendSuccess(res, result, null, 201);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.get('/batches', authMiddleware.requireAnyRole('admin'), async function(req, res) {
  try {
    var result = await importController.listImportBatches(req.query || {});
    return sendSuccess(res, result.data, result.meta);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.get('/batches/:id', authMiddleware.requireAnyRole('admin'), async function(req, res) {
  try {
    var batch = await importController.getImportBatchById(req.params.id);
    if (!batch) {
      return sendError(res, 'Import batch not found', 404);
    }
    return sendSuccess(res, batch);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

module.exports = router;
