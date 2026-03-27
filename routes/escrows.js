const express = require('express');
const controller = require('../controllers/escrowController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);
router.get('/', controller.listEscrows);
router.get('/:id', controller.getEscrowById);
router.patch('/:id/hold', controller.holdEscrow);
router.patch('/:id/release', controller.releaseEscrow);
router.patch('/:id/refund', controller.refundEscrow);
router.patch('/:id/dispute', controller.disputeEscrow);

module.exports = router;
