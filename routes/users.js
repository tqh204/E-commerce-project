const express = require('express');
const controller = require('../controllers/userController');
const { requireAnyRole, requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAnyRole('admin'), controller.listUsers);
router.get('/:id', requireAuth, controller.getUserById);
router.put('/:id', requireAuth, controller.updateUser);
router.delete('/:id', requireAnyRole('admin'), controller.deleteUser);

module.exports = router;
