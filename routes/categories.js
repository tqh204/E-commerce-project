const express = require('express');
const controller = require('../controllers/categoryController');
const { requireAnyRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', controller.listCategories);
router.get('/:id', controller.getCategoryById);
router.post('/', requireAnyRole('admin'), controller.createCategory);
router.put('/:id', requireAnyRole('admin'), controller.updateCategory);
router.delete('/:id', requireAnyRole('admin'), controller.deleteCategory);

module.exports = router;
