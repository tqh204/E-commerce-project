const express = require('express');
const controller = require('../controllers/walletController');
const { requireAuth, requireAnyRole } = require('../middleware/auth');

const router = express.Router();

router.post('/momo/ipn', controller.momoIpn);
router.get('/momo/return', controller.momoReturn);

router.use(requireAuth);
router.get('/', controller.getWalletSummary);
router.get('/transactions', controller.listWalletTransactions);
router.post('/top-up', controller.topUpWallet);
router.post('/momo/top-up', controller.createMomoTopUp);
router.get('/admin/users', requireAnyRole('admin'), controller.listWalletUsers);
router.get('/admin/transactions', requireAnyRole('admin'), controller.listAllWalletTransactions);
router.post('/admin/top-up', requireAnyRole('admin'), controller.adminTopUpWallet);

module.exports = router;
