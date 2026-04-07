var express = require('express');
var router = express.Router();
var categoryController = require('../controllers/categoryController');
var authMiddleware = require('../middleware/auth');
var httpLib = require('../lib/http');

var sendError = httpLib.sendError;
var sendSuccess = httpLib.sendSuccess;

var handleRouteError = function(res, error) {
  return sendError(res, error.message || 'Internal server error', error.status || 500, error.details);
};

router.get('/', async function(req, res) {
  try {
    var result = await categoryController.listCategories(req.query || {});
    return sendSuccess(res, result.data, result.meta);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.get('/:id', async function(req, res) {
  try {
    var category = await categoryController.getCategoryById(req.params.id);
    if (!category) {
      return sendError(res, 'Category not found', 404);
    }
    return sendSuccess(res, category);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.post('/', authMiddleware.requireAnyRole('admin'), async function(req, res) {
  try {
    var category = await categoryController.createCategory(req.body || {});
    return sendSuccess(res, category, null, 201);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.put('/:id', authMiddleware.requireAnyRole('admin'), async function(req, res) {
  try {
    var category = await categoryController.updateCategory(req.params.id, req.body || {});
    if (!category) {
      return sendError(res, 'Category not found', 404);
    }
    return sendSuccess(res, category);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.delete('/:id', authMiddleware.requireAnyRole('admin'), async function(req, res) {
  try {
    var deleted = await categoryController.deleteCategory(req.params.id);
    if (!deleted) {
      return sendError(res, 'Category not found', 404);
    }
    return sendSuccess(res, { deleted: true });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

module.exports = router;
