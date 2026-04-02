const { EscrowTransaction } = require('../schemas');
const {
  asyncHandler,
  buildPaginationMeta,
  parsePagination,
  sendError,
  sendSuccess,
} = require('../lib/http');
const {
  holdEscrowForOrder,
  loadEscrowBundle,
  refundEscrowToBuyer,
  releaseEscrowToSeller,
} = require('../lib/escrowService');

const canAccessEscrow = (escrow, req) =>
  (req.userRoles || []).includes('admin') ||
  String(escrow.buyer) === String(req.user._id) ||
  String(escrow.seller) === String(req.user._id);

exports.listEscrows = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = {};

  if (!(req.userRoles || []).includes('admin')) {
    filter.$or = [{ buyer: req.user._id }, { seller: req.user._id }];
  }

  if (req.query.status) {
    filter.status = req.query.status;
  }

  const [escrows, total] = await Promise.all([
    EscrowTransaction.find(filter)
      .populate('order', 'orderCode status totalAmount')
      .populate('buyer', 'username fullName')
      .populate('seller', 'username fullName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    EscrowTransaction.countDocuments(filter),
  ]);

  return sendSuccess(res, escrows, buildPaginationMeta(page, limit, total));
});

exports.getEscrowById = asyncHandler(async (req, res) => {
  const escrow = await EscrowTransaction.findById(req.params.id)
    .populate('order')
    .populate('buyer', 'username fullName')
    .populate('seller', 'username fullName');

  if (!escrow) {
    return sendError(res, 'Escrow transaction not found', 404);
  }
  if (!canAccessEscrow(escrow, req)) {
    return sendError(res, 'Forbidden', 403);
  }

  return sendSuccess(res, escrow);
});

const updateEscrowStatus = async ({ req, res, nextStatus, noteField = null, timestampField = null }) => {
  const bundle = await loadEscrowBundle(req.params.id);
  if (!bundle.escrow) {
    return sendError(res, 'Escrow transaction not found', 404);
  }
  if (!canAccessEscrow(bundle.escrow, req)) {
    return sendError(res, 'Forbidden', 403);
  }

  const { escrow, order } = bundle;
  if (!order) {
    return sendError(res, 'Order linked to escrow was not found', 404);
  }

  if (nextStatus === 'held') {
    const heldEscrow = await holdEscrowForOrder(order, {
      flowType: escrow.flowType,
      description: req.body.reason || 'Escrow manually held',
    });
    if (req.body.notes !== undefined) {
      heldEscrow.resolutionNotes = req.body.notes;
      await heldEscrow.save();
    }
    return sendSuccess(res, { escrow: heldEscrow, order });
  }

  if (noteField && req.body.reason) {
    escrow[noteField] = req.body.reason;
  }
  if (req.body.notes !== undefined) {
    escrow.resolutionNotes = req.body.notes;
  }
  if (timestampField) {
    escrow[timestampField] = new Date();
  }

  if (nextStatus === 'released') {
    const released = await releaseEscrowToSeller(escrow, order, {
      description: req.body.reason || 'Escrow released',
    });
    return sendSuccess(res, { escrow: released, order });
  }

  if (nextStatus === 'refunded') {
    const refunded = await refundEscrowToBuyer(escrow, order, {
      description: req.body.reason || 'Escrow refunded',
    });
    return sendSuccess(res, { escrow: refunded, order });
  }

  escrow.status = nextStatus;
  escrow.resolvedAt = nextStatus === 'disputed' ? null : new Date();
  await escrow.save();
  if (nextStatus === 'disputed') {
    order.status = 'disputed';
    await order.save();
  }

  return sendSuccess(res, { escrow, order });
};

exports.holdEscrow = asyncHandler(async (req, res) =>
  updateEscrowStatus({ req, res, nextStatus: 'held', timestampField: 'heldAt' })
);

exports.releaseEscrow = asyncHandler(async (req, res) =>
  updateEscrowStatus({ req, res, nextStatus: 'released', timestampField: 'releasedAt' })
);

exports.refundEscrow = asyncHandler(async (req, res) =>
  updateEscrowStatus({
    req,
    res,
    nextStatus: 'refunded',
    timestampField: 'refundedAt',
    noteField: 'resolutionNotes',
  })
);

exports.disputeEscrow = asyncHandler(async (req, res) =>
  updateEscrowStatus({
    req,
    res,
    nextStatus: 'disputed',
    timestampField: 'disputeOpenedAt',
    noteField: 'disputeReason',
  })
);
