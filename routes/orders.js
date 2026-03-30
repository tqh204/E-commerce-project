const express = require('express');
const controller = require('../controllers/orderController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);
router.get('/', controller.listOrders);
router.get('/:id', controller.getOrderById);
router.post('/', controller.createOrder);
router.patch('/:id/status', controller.updateOrderStatus);
router.delete('/:id', controller.deleteOrder);

module.exports = router;
