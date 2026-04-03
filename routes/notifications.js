const express = require('express');
const controller = require('../controllers/notificationController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);
router.get('/', controller.listNotifications);
router.patch('/:id/read', controller.markNotificationRead);
router.patch('/read-all', controller.markAllRead);

module.exports = router;
