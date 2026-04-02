const { EscrowTransaction, Order } = require('../schemas');
const {
  debitWalletFunds,
  consumeWalletReserve,
  creditWalletFunds,
} = require('./wallet');

const toAmount = (value) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getEscrowAmountForOrder = (order) => Math.max(toAmount(order.totalAmount || order.subtotal), 0);

const syncOrderEscrowSnapshot = async (order, escrow) => {
  order.escrowTransaction = escrow._id;
  order.escrow.amount = escrow.amount;
  order.escrow.status = escrow.status;
  order.escrow.releasedAt = escrow.releasedAt || null;
  await order.save();
  return order;
};

const ensureEscrowRecord = async (order, overrides = {}) => {
  let escrow = order.escrowTransaction
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
      flowType: overrides.flowType || (order.type === 'auction_win' ? 'auction_win' : order.type === 'auction_buy_now' ? 'auction_buy_now' : 'direct_purchase'),
      status: 'pending',
    });
  }

  Object.assign(escrow, overrides);
  escrow.amount = getEscrowAmountForOrder(order);
  escrow.feeAmount = toAmount(order.platformFee);
  escrow.fundingSource = order.paymentType === 'wallet' ? 'wallet' : 'external';
  await escrow.save();
  await syncOrderEscrowSnapshot(order, escrow);
  return escrow;
};

const holdEscrowForOrder = async (order, options = {}) => {
  const {
    flowType = 'direct_purchase',
    description = 'Wallet funds moved into escrow',
    consumeReserve = null,
  } = options;

  const escrow = await ensureEscrowRecord(order, { flowType });
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
        description,
        metadata: { source: 'auction_winner_hold' },
      });
    } else {
      await debitWalletFunds({
        userId: order.buyer,
        amount: escrow.amount,
        order: order._id,
        auction: order.auction || null,
        escrowTransaction: escrow._id,
        description,
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

const scheduleEscrowAutoRelease = async (order, days = 5) => {
  const escrow = await ensureEscrowRecord(order);
  if (escrow.status !== 'held') {
    return escrow;
  }

  const deliveredAt = order.deliveredAt || new Date();
  escrow.autoReleaseAt = new Date(new Date(deliveredAt).getTime() + days * 24 * 60 * 60 * 1000);
  await escrow.save();
  await syncOrderEscrowSnapshot(order, escrow);
  return escrow;
};

const releaseEscrowToSeller = async (escrow, order, options = {}) => {
  const { description = 'Escrow released to seller' } = options;
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
      description,
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

const refundEscrowToBuyer = async (escrow, order, options = {}) => {
  const { description = 'Escrow refunded to buyer' } = options;
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
      description,
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

const loadEscrowBundle = async (escrowId) => {
  const escrow = await EscrowTransaction.findById(escrowId);
  if (!escrow) return { escrow: null, order: null };
  const order = await Order.findById(escrow.order);
  return { escrow, order };
};

module.exports = {
  ensureEscrowRecord,
  getEscrowAmountForOrder,
  holdEscrowForOrder,
  scheduleEscrowAutoRelease,
  releaseEscrowToSeller,
  refundEscrowToBuyer,
  loadEscrowBundle,
};
