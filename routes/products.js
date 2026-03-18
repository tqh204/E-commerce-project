var express = require('express');
var router = express.Router();
var productController = require('../controllers/productController');

// GET tất cả sản phẩm
router.get('/', productController.getAllProducts);

// GET sản phẩm theo ID
router.get('/:id', productController.getProductById);

// POST thêm sản phẩm mới
router.post('/', productController.createProduct);

// PUT cập nhật sản phẩm
router.put('/:id', productController.updateProduct);

// DELETE xóa sản phẩm
router.delete('/:id', productController.deleteProduct);

module.exports = router;
