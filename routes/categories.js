const express = require('express');
const controller = require('../controllers/categoryController');
const { requireAnyRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', controller.listCategories);
router.get('/:id', controller.getCategoryById);
router.post('/', requireAnyRole('admin', 'moderator'), controller.createCategory);
router.put('/:id', requireAnyRole('admin', 'moderator'), controller.updateCategory);
router.delete('/:id', requireAnyRole('admin', 'moderator'), controller.deleteCategory);

module.exports = router;
