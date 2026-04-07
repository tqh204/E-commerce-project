var express = require('express');
var router = express.Router();
var reviewController = require('../controllers/reviewController');
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
    var result = await reviewController.listReviews(req.query || {});
    return sendSuccess(res, result.data, result.meta);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.get('/:id', authMiddleware.optionalAuth, async function(req, res) {
  try {
    var review = await reviewController.getReviewById(req.params.id);
    if (!review) {
      return sendError(res, 'Review not found', 404);
    }
    return sendSuccess(res, review);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.post('/', authMiddleware.requireAuth, async function(req, res) {
  try {
    var review = await reviewController.createReview(req.body || {}, buildActor(req));
    return sendSuccess(res, review, null, 201);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.patch('/:id/respond', authMiddleware.requireAuth, async function(req, res) {
  try {
    var review = await reviewController.respondToReview(req.params.id, req.body || {}, buildActor(req));
    if (!review) {
      return sendError(res, 'Review not found', 404);
    }
    return sendSuccess(res, review);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.patch('/:id/visibility', authMiddleware.requireAnyRole('admin'), async function(req, res) {
  try {
    var review = await reviewController.updateVisibility(req.params.id, req.body || {}, buildActor(req));
    if (!review) {
      return sendError(res, 'Review not found', 404);
    }
    return sendSuccess(res, review);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

module.exports = router;
