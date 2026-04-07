var schemas = require('../schemas');
var walletLib = require('./wallet');

var EscrowTransaction = schemas.EscrowTransaction;
var Order = schemas.Order;
var debitWalletFunds = walletLib.debitWalletFunds;
var consumeWalletReserve = walletLib.consumeWalletReserve;
var creditWalletFunds = walletLib.creditWalletFunds;

var toAmount = function(value) {
  var parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

var getEscrowAmountForOrder = function(order) {
  return Math.max(toAmount(order.totalAmount || order.subtotal), 0);
};

var syncOrderEscrowSnapshot = async function(order, escrow) {
  order.escrowTransaction = escrow._id;
  order.escrow.amount = escrow.amount;
  order.escrow.status = escrow.status;
  order.escrow.releasedAt = escrow.releasedAt || null;
  await order.save();
  return order;
};

var ensureEscrowRecord = async function(order, overrides) {
  var patch = overrides || {};
  var escrow = order.escrowTransaction
    ? await EscrowTransaction.findById(order.escrowTransaction)
    : await EscrowTransaction.findOne({ order: order._id });

  if (!escrow) {
    escrow = await EscrowTransaction.create({
      order: order._id,
      buyer: order.buyer,
      seller: order.seller,
      amount: getEscrowAmountForOrder(order),
      feeAmount: toAmount(order.platformFee),
      fundingSource: order.paymentType === 'wallet' ? 'wallet' : 'external',
      flowType: patch.flowType || (order.type === 'auction_win' ? 'auction_win' : order.type === 'auction_buy_now' ? 'auction_buy_now' : 'direct_purchase'),
      status: 'pending',
    });
  }

  Object.assign(escrow, patch);
  escrow.amount = getEscrowAmountForOrder(order);
  escrow.feeAmount = toAmount(order.platformFee);
  escrow.fundingSource = order.paymentType === 'wallet' ? 'wallet' : 'external';
  await escrow.save();
  await syncOrderEscrowSnapshot(order, escrow);
  return escrow;
};

var holdEscrowForOrder = async function(order, options) {
  var config = options || {};
  var flowType = config.flowType === undefined ? 'direct_purchase' : config.flowType;
  var description = config.description === undefined ? 'Wallet funds moved into escrow' : config.description;
  var consumeReserve = config.consumeReserve === undefined ? null : config.consumeReserve;
  var escrow = await ensureEscrowRecord(order, { flowType: flowType });

  if (escrow.status === 'held') {
    return escrow;
  }

  if (escrow.fundingSource === 'wallet') {
    if (consumeReserve) {
      await consumeWalletReserve({
        userId: order.buyer,
        reservedAmount: consumeReserve.reservedAmount,
        debitAmount: escrow.amount,
        order: order._id,
        auction: consumeReserve.auction || order.auction || null,
        escrowTransaction: escrow._id,
        bid: consumeReserve.bid || null,
        description: description,
        metadata: { source: 'auction_winner_hold' },
      });
    } else {
      await debitWalletFunds({
        userId: order.buyer,
        amount: escrow.amount,
        order: order._id,
        auction: order.auction || null,
        escrowTransaction: escrow._id,
        description: description,
        metadata: { source: flowType },
      });
    }
  }

  escrow.status = 'held';
  escrow.heldAt = new Date();
  escrow.autoReleaseAt = null;
  escrow.resolvedAt = null;
  await escrow.save();

  order.status = order.status === 'negotiating' || order.status === 'pending_payment' ? 'processing' : order.status;
  order.paidAt = order.paidAt || new Date();
  await syncOrderEscrowSnapshot(order, escrow);
  return escrow;
};

var scheduleEscrowAutoRelease = async function(order, days) {
  var releaseDays = days === undefined ? 5 : days;
  var escrow = await ensureEscrowRecord(order);
  var deliveredAt;

  if (escrow.status !== 'held') {
    return escrow;
  }

  deliveredAt = order.deliveredAt || new Date();
  escrow.autoReleaseAt = new Date(new Date(deliveredAt).getTime() + releaseDays * 24 * 60 * 60 * 1000);
  await escrow.save();
  await syncOrderEscrowSnapshot(order, escrow);
  return escrow;
};

var releaseEscrowToSeller = async function(escrow, order, options) {
  var config = options || {};
  var description = config.description === undefined ? 'Escrow released to seller' : config.description;

  if (escrow.status === 'released') {
    return escrow;
  }

  if (escrow.fundingSource === 'wallet') {
    await creditWalletFunds({
      userId: escrow.seller,
      amount: escrow.amount,
      type: 'escrow_release',
      order: order._id,
      auction: order.auction || null,
      escrowTransaction: escrow._id,
      description: description,
      metadata: { source: escrow.flowType },
    });
  }

  escrow.status = 'released';
  escrow.releasedAt = new Date();
  escrow.resolvedAt = new Date();
  escrow.autoReleaseAt = null;
  await escrow.save();

  order.status = 'completed';
  order.completedAt = order.completedAt || escrow.releasedAt;
  order.buyerConfirmedAt = order.buyerConfirmedAt || escrow.releasedAt;
  await syncOrderEscrowSnapshot(order, escrow);
  return escrow;
};

var refundEscrowToBuyer = async function(escrow, order, options) {
  var config = options || {};
  var description = config.description === undefined ? 'Escrow refunded to buyer' : config.description;

  if (escrow.status === 'refunded') {
    return escrow;
  }

  if (escrow.fundingSource === 'wallet') {
    await creditWalletFunds({
      userId: escrow.buyer,
      amount: escrow.amount,
      type: 'escrow_refund',
      order: order._id,
      auction: order.auction || null,
      escrowTransaction: escrow._id,
      description: description,
      metadata: { source: escrow.flowType },
    });
  }

  escrow.status = 'refunded';
  escrow.refundedAt = new Date();
  escrow.resolvedAt = new Date();
  escrow.autoReleaseAt = null;
  await escrow.save();

  order.status = 'cancelled';
  order.cancelledAt = order.cancelledAt || escrow.refundedAt;
  await syncOrderEscrowSnapshot(order, escrow);
  return escrow;
};

var loadEscrowBundle = async function(escrowId) {
  var escrow = await EscrowTransaction.findById(escrowId);
  var order;

  if (!escrow) {
    return { escrow: null, order: null };
  }

  order = await Order.findById(escrow.order);
  return { escrow: escrow, order: order };
};

module.exports = {
  ensureEscrowRecord: ensureEscrowRecord,
  getEscrowAmountForOrder: getEscrowAmountForOrder,
  holdEscrowForOrder: holdEscrowForOrder,
  scheduleEscrowAutoRelease: scheduleEscrowAutoRelease,
  releaseEscrowToSeller: releaseEscrowToSeller,
  refundEscrowToBuyer: refundEscrowToBuyer,
  loadEscrowBundle: loadEscrowBundle,
};
