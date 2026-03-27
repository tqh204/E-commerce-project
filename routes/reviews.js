const express = require('express');
const controller = require('../controllers/reviewController');
const { optionalAuth, requireAuth, requireAnyRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', optionalAuth, controller.listReviews);
router.get('/:id', optionalAuth, controller.getReviewById);
router.post('/', requireAuth, controller.createReview);
router.patch('/:id/respond', requireAuth, controller.respondToReview);
router.patch('/:id/visibility', requireAnyRole('admin'), controller.updateVisibility);

module.exports = router;
