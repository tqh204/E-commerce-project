const express = require('express');
const controller = require('../controllers/auctionController');
const { optionalAuth, requireAnyRole, requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', optionalAuth, controller.listAuctions);
router.get('/:id', optionalAuth, controller.getAuctionById);
router.post('/', requireAnyRole('seller', 'admin'), controller.createAuction);
router.put('/:id', requireAuth, controller.updateAuction);
router.post('/:id/bids', requireAuth, controller.placeBid);
router.post('/:id/open', requireAuth, controller.openAuction);
router.post('/:id/close', requireAuth, controller.closeAuction);
router.delete('/:id', requireAuth, controller.deleteAuction);

module.exports = router;
