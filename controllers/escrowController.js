const { EscrowTransaction, Order } = require('../schemas');
const {
  asyncHandler,
  buildPaginationMeta,
  parsePagination,
  sendError,
  sendSuccess,
} = require('../lib/http');

const canAccessEscrow = (escrow, req) =>
  (req.userRoles || []).includes('admin') ||
  String(escrow.buyer) === String(req.user._id) ||
  String(escrow.seller) === String(req.user._id);

const syncOrderEscrow = async (escrow) => {
  const order = await Order.findById(escrow.order);
  if (!order) {
    return null;
  }

  order.escrow.amount = escrow.amount;
  order.escrow.status = escrow.status;

  if (escrow.status === 'held') {
    order.status = order.status === 'pending_payment' ? 'paid' : order.status;
  }

  if (escrow.status === 'released') {
    order.escrow.releasedAt = escrow.releasedAt;
    order.status = 'completed';
    order.completedAt = escrow.releasedAt || new Date();
  }

  if (escrow.status === 'refunded') {
    order.status = 'cancelled';
    order.cancelledAt = escrow.refundedAt || new Date();
  }

  if (escrow.status === 'disputed') {
    order.status = 'disputed';
  }

  await order.save();
  return order;
};

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
  const escrow = await EscrowTransaction.findById(req.params.id);
  if (!escrow) {
    return sendError(res, 'Escrow transaction not found', 404);
  }
  if (!canAccessEscrow(escrow, req)) {
    return sendError(res, 'Forbidden', 403);
  }

  escrow.status = nextStatus;
  if (noteField && req.body.reason) {
    escrow[noteField] = req.body.reason;
  }
  if (req.body.notes !== undefined) {
    escrow.resolutionNotes = req.body.notes;
  }
  if (timestampField) {
    escrow[timestampField] = new Date();
  }
  if (nextStatus !== 'disputed') {
    escrow.resolvedAt = new Date();
  }

  await escrow.save();
  const order = await syncOrderEscrow(escrow);

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
