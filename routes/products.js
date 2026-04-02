const express = require('express');
const controller = require('../controllers/productController');
const { optionalAuth, requireAnyRole, requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', optionalAuth, controller.getAllProducts);
router.get('/:id', optionalAuth, controller.getProductById);
router.post('/', requireAnyRole('user', 'admin'), controller.createProduct);
router.put('/:id', requireAuth, controller.updateProduct);
router.delete('/:id', requireAuth, controller.deleteProduct);

module.exports = router;
