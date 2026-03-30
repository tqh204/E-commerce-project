const express = require('express');
const controller = require('../controllers/importController');
const { requireAnyRole } = require('../middleware/auth');

const router = express.Router();

router.use(requireAnyRole('admin'));
router.post('/chotot', controller.importChotot);
router.get('/batches', controller.listImportBatches);
router.get('/batches/:id', controller.getImportBatchById);

module.exports = router;
