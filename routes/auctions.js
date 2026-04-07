var express = require('express');
var router = express.Router();
var auctionController = require('../controllers/auctionController');
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
    var result = await auctionController.listAuctions(req.query || {});
    return sendSuccess(res, result.data, result.meta);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.get('/:id', authMiddleware.optionalAuth, async function(req, res) {
  try {
    var result = await auctionController.getAuctionById(req.params.id);
    if (!result) {
      return sendError(res, 'Auction not found', 404);
    }
    return sendSuccess(res, result);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.post('/', authMiddleware.requireAnyRole('user', 'admin'), async function(req, res) {
  try {
    var auction = await auctionController.createAuction(req.body || {}, buildActor(req));
    return sendSuccess(res, auction, null, 201);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.put('/:id', authMiddleware.requireAuth, async function(req, res) {
  try {
    var auction = await auctionController.updateAuction(req.params.id, req.body || {}, buildActor(req));
    if (!auction) {
      return sendError(res, 'Auction not found', 404);
    }
    return sendSuccess(res, auction);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.post('/:id/bids', authMiddleware.requireAuth, async function(req, res) {
  try {
    var bid = await auctionController.placeBid(req.params.id, req.body || {}, buildActor(req));
    if (!bid) {
      return sendError(res, 'Auction not found', 404);
    }
    return sendSuccess(res, bid, null, 201);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.post('/:id/buy-now', authMiddleware.requireAuth, async function(req, res) {
  try {
    var result = await auctionController.buyNow(req.params.id, buildActor(req));
    if (!result) {
      return sendError(res, 'Auction not found', 404);
    }
    return sendSuccess(res, result);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.post('/:id/open', authMiddleware.requireAuth, async function(req, res) {
  try {
    var auction = await auctionController.openAuction(req.params.id, buildActor(req));
    if (!auction) {
      return sendError(res, 'Auction not found', 404);
    }
    return sendSuccess(res, auction);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.post('/:id/close', authMiddleware.requireAuth, async function(req, res) {
  try {
    var result = await auctionController.closeAuction(req.params.id, req.body || {}, buildActor(req));
    if (!result) {
      return sendError(res, 'Auction not found', 404);
    }
    return sendSuccess(res, result);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.delete('/:id', authMiddleware.requireAuth, async function(req, res) {
  try {
    var deleted = await auctionController.deleteAuction(req.params.id, buildActor(req));
    if (!deleted) {
      return sendError(res, 'Auction not found', 404);
    }
    return sendSuccess(res, { deleted: true });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

module.exports = router;
