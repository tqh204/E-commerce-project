var schemas = require('../schemas');
var httpLib = require('../lib/http');
var escrowService = require('../lib/escrowService');

var EscrowTransaction = schemas.EscrowTransaction;
var buildPaginationMeta = httpLib.buildPaginationMeta;
var parsePagination = httpLib.parsePagination;
var holdEscrowForOrder = escrowService.holdEscrowForOrder;
var loadEscrowBundle = escrowService.loadEscrowBundle;
var refundEscrowToBuyer = escrowService.refundEscrowToBuyer;
var releaseEscrowToSeller = escrowService.releaseEscrowToSeller;

var createControllerError = function(message, status, details) {
  var error = new Error(message);
  error.status = status || 400;
  if (details !== undefined) {
    error.details = details;
  }
  return error;
};

var canAccessEscrow = function(escrow, actor) {
  return (actor.userRoles || []).indexOf('admin') !== -1 ||
    String(escrow.buyer) === String(actor.user && actor.user._id) ||
    String(escrow.seller) === String(actor.user && actor.user._id);
};

var updateEscrowStatus = async function(escrowId, body, actor, config) {
  var nextStatus = config.nextStatus;
  var noteField = config.noteField === undefined ? null : config.noteField;
  var timestampField = config.timestampField === undefined ? null : config.timestampField;
  var bundle = await loadEscrowBundle(escrowId);
  var escrow;
  var order;
  var heldEscrow;
  var released;
  var refunded;

  if (!bundle.escrow) {
    return null;
  }
  if (!canAccessEscrow(bundle.escrow, actor)) {
    throw createControllerError('Forbidden', 403);
  }

  escrow = bundle.escrow;
  order = bundle.order;
  if (!order) {
    throw createControllerError('Order linked to escrow was not found', 404);
  }

  if (nextStatus === 'held') {
    heldEscrow = await holdEscrowForOrder(order, {
      flowType: escrow.flowType,
      description: body.reason || 'Escrow manually held',
    });
    if (body.notes !== undefined) {
      heldEscrow.resolutionNotes = body.notes;
      await heldEscrow.save();
    }
    return { escrow: heldEscrow, order: order };
  }

  if (noteField && body.reason) {
    escrow[noteField] = body.reason;
  }
  if (body.notes !== undefined) {
    escrow.resolutionNotes = body.notes;
  }
  if (timestampField) {
    escrow[timestampField] = new Date();
  }

  if (nextStatus === 'released') {
    released = await releaseEscrowToSeller(escrow, order, {
      description: body.reason || 'Escrow released',
    });
    return { escrow: released, order: order };
  }

  if (nextStatus === 'refunded') {
    refunded = await refundEscrowToBuyer(escrow, order, {
      description: body.reason || 'Escrow refunded',
    });
    return { escrow: refunded, order: order };
  }

  escrow.status = nextStatus;
  escrow.resolvedAt = nextStatus === 'disputed' ? null : new Date();
  await escrow.save();
  if (nextStatus === 'disputed') {
    order.status = 'disputed';
    await order.save();
  }

  return { escrow: escrow, order: order };
};

module.exports.listEscrows = async function(query, actor) {
  var pagination = parsePagination(query || {});
  var page = pagination.page;
  var limit = pagination.limit;
  var skip = pagination.skip;
  var filter = {};
  var result;
  var escrows;
  var total;

  if ((actor.userRoles || []).indexOf('admin') === -1) {
    filter.$or = [{ buyer: actor.user._id }, { seller: actor.user._id }];
  }

  if (query && query.status) {
    filter.status = query.status;
  }

  result = await Promise.all([
    EscrowTransaction.find(filter)
      .populate('order', 'orderCode status totalAmount')
      .populate('buyer', 'username fullName')
      .populate('seller', 'username fullName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    EscrowTransaction.countDocuments(filter),
  ]);
  escrows = result[0];
  total = result[1];

  return {
    data: escrows,
    meta: buildPaginationMeta(page, limit, total),
  };
};

module.exports.getEscrowById = async function(escrowId, actor) {
  var escrow = await EscrowTransaction.findById(escrowId)
    .populate('order')
    .populate('buyer', 'username fullName')
    .populate('seller', 'username fullName');

  if (!escrow) {
    return null;
  }
  if (!canAccessEscrow(escrow, actor)) {
    throw createControllerError('Forbidden', 403);
  }

  return escrow;
};

module.exports.holdEscrow = async function(escrowId, body, actor) {
  return updateEscrowStatus(escrowId, body || {}, actor, {
    nextStatus: 'held',
    timestampField: 'heldAt',
  });
};

module.exports.releaseEscrow = async function(escrowId, body, actor) {
  return updateEscrowStatus(escrowId, body || {}, actor, {
    nextStatus: 'released',
    timestampField: 'releasedAt',
  });
};

module.exports.refundEscrow = async function(escrowId, body, actor) {
  return updateEscrowStatus(escrowId, body || {}, actor, {
    nextStatus: 'refunded',
    timestampField: 'refundedAt',
    noteField: 'resolutionNotes',
  });
};

module.exports.disputeEscrow = async function(escrowId, body, actor) {
  return updateEscrowStatus(escrowId, body || {}, actor, {
    nextStatus: 'disputed',
    timestampField: 'disputeOpenedAt',
    noteField: 'disputeReason',
  });
};
