const express = require('express');
const controller = require('../controllers/addressController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);
router.get('/', controller.listAddresses);
router.get('/:id', controller.getAddressById);
router.post('/', controller.createAddress);
router.put('/:id', controller.updateAddress);
router.delete('/:id', controller.deleteAddress);

module.exports = router;
