const express = require('express');
const controller = require('../controllers/userController');
const { optionalAuth, requireAnyRole, requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAnyRole('admin'), controller.listUsers);
router.get('/me/profile', requireAuth, controller.getCurrentProfile);
router.patch('/me/profile', requireAuth, controller.updateCurrentProfile);
router.get('/:id', optionalAuth, controller.getUserById);
router.put('/:id', requireAuth, controller.updateUser);
router.delete('/:id', requireAnyRole('admin'), controller.deleteUser);

module.exports = router;
