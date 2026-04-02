const { EscrowTransaction, Order, OrderItem, Product } = require('../schemas');
const { ensureSufficientAvailableBalance, getAvailableBalance } = require('../lib/wallet');
const {
  ensureEscrowRecord,
  holdEscrowForOrder,
  refundEscrowToBuyer,
  releaseEscrowToSeller,
  scheduleEscrowAutoRelease,
} = require('../lib/escrowService');
const {
  asyncHandler,
  buildPaginationMeta,
  parsePagination,
  sendError,
  sendSuccess,
} = require('../lib/http');

const getRelatedUserId = (value) => value?._id || value;

const canAccessOrder = (order, req) =>
  (req.userRoles || []).includes('admin') ||
  String(getRelatedUserId(order.buyer)) === String(req.user._id) ||
  String(getRelatedUserId(order.seller)) === String(req.user._id);

const normalizeShippingAddress = (payload = {}) => ({
  fullName: String(payload.fullName || '').trim(),
  phone: String(payload.phone || '').trim(),
  province: String(payload.province || '').trim(),
  district: String(payload.district || '').trim(),
  ward: String(payload.ward || '').trim(),
  address: String(payload.address || payload.fullAddress || payload.street || '').trim(),
  city: String(payload.city || payload.province || '').trim(),
  zipCode: String(payload.zipCode || payload.postalCode || '').trim(),
});

const loadOrderEscrow = async (order) => {
  if (!order?.escrowTransaction) return null;
  return EscrowTransaction.findById(order.escrowTransaction);
};

exports.listOrders = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = {};
  const canViewAll = (req.userRoles || []).includes('admin') && req.query.scope === 'all';
  if (!canViewAll) {
    filter.$or = [{ buyer: req.user._id }, { seller: req.user._id }];
  }
  if (req.query.status) {
    filter.status = req.query.status;
  }

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate('buyer', 'username fullName')
      .populate('seller', 'username fullName')
      .populate('product', 'title price thumbnailImage')
      .populate('escrowTransaction')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Order.countDocuments(filter),
  ]);

  return sendSuccess(res, orders, buildPaginationMeta(page, limit, total));
});

exports.getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('buyer', 'username fullName')
    .populate('seller', 'username fullName')
    .populate('product', 'title price thumbnailImage')
    .populate('escrowTransaction');

  if (!order) {
    return sendError(res, 'Order not found', 404);
  }
  if (!canAccessOrder(order, req)) {
    return sendError(res, 'Forbidden', 403);
  }

  const items = await OrderItem.find({ order: order._id });
  return sendSuccess(res, { order, items });
});

exports.createOrder = asyncHandler(async (req, res) => {
  const { productId, quantity = 1, paymentType = 'cod', shippingMethod = 'delivery' } = req.body;
  const product = await Product.findById(productId);
  if (!product) {
    return sendError(res, 'Product not found', 404);
  }
  if (product.status !== 'active') {
    return sendError(res, 'Product is not available for ordering', 400);
  }
  if (String(product.seller) === String(req.user._id)) {
    return sendError(res, 'Cannot order your own product', 400);
  }

  const purchasePrice = Number(product.buyNowPrice || product.price || 0);
  if (purchasePrice <= 0) {
    return sendError(res, 'Product does not support buy-now ordering', 400);
  }

  const shippingAddress = normalizeShippingAddress(req.body.shippingAddress);
  if (!shippingAddress.fullName || !shippingAddress.phone || !shippingAddress.province || !shippingAddress.district || !shippingAddress.address) {
    return sendError(res, 'Shipping address is required', 400);
  }

  const subtotal = purchasePrice * Number(quantity || 1);
  const shippingFee = Number(req.body.shippingFee || 0);
  const platformFee = Number(req.body.platformFee || 0);
  const totalAmount = subtotal + shippingFee + platformFee;

  if (paymentType === 'wallet') {
    ensureSufficientAvailableBalance(
      req.user,
      totalAmount,
      `Insufficient wallet balance. Available: ${getAvailableBalance(req.user)}`
    );
  }

  const order = await Order.create({
    buyer: req.user._id,
    seller: product.seller,
    product: product._id,
    auction: req.body.auctionId,
    type: req.body.type || 'buy_now',
    paymentType,
    shippingMethod,
    price: purchasePrice,
    quantity,
    subtotal,
    shippingFee,
    platformFee,
    totalAmount,
    shippingAddressRef: req.body.shippingAddressId,
    shippingAddress,
    shipping: {
      method: shippingMethod,
      carrier: req.body.carrier,
      shippingFee,
      trackingNumber: req.body.trackingNumber,
      status: req.body.shippingStatus || 'pending',
    },
    status: req.body.status || 'negotiating',
    notes: req.body.notes,
    buyerNotes: req.body.buyerNotes,
  });

  const orderItem = await OrderItem.create({
    order: order._id,
    product: product._id,
    seller: product.seller,
    titleSnapshot: product.title,
    priceSnapshot: purchasePrice,
    quantity,
    total: subtotal,
    primaryImage: product.thumbnailImage || product.images?.[0] || null,
  });

  let escrowTransaction = null;
  if (paymentType === 'escrow' || paymentType === 'wallet') {
    escrowTransaction = await ensureEscrowRecord(order, {
      amount: totalAmount,
      feeAmount: platformFee,
      flowType: 'direct_purchase',
      fundingSource: paymentType === 'wallet' ? 'wallet' : 'external',
    });
  }

  return sendSuccess(res, { order, orderItem, escrowTransaction }, null, 201);
});

exports.updateOrderStatus = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    return sendError(res, 'Order not found', 404);
  }
  if (!canAccessOrder(order, req)) {
    return sendError(res, 'Forbidden', 403);
  }

  const nextStatus = req.body.status || order.status;
  const isAdmin = (req.userRoles || []).includes('admin');
  const isBuyer = String(order.buyer) === String(req.user._id);
  const isSeller = String(order.seller) === String(req.user._id);

  if (!isAdmin) {
    const buyerAllowed = new Set(['cancelled', 'completed']);
    const sellerAllowed = new Set(['processing', 'shipping', 'delivered', 'cancelled']);
    if (nextStatus !== order.status) {
      if (isBuyer && !buyerAllowed.has(nextStatus)) {
        return sendError(res, 'Buyer cannot update to this order status', 403);
      }
      if (isSeller && !sellerAllowed.has(nextStatus)) {
        return sendError(res, 'Seller cannot update to this order status', 403);
      }
    }
  }

  order.status = nextStatus;
  if (req.body.shippingMethod) {
    order.shippingMethod = req.body.shippingMethod;
    order.shipping.method = req.body.shippingMethod;
  }
  if (req.body.shippingAddressId !== undefined) {
    order.shippingAddressRef = req.body.shippingAddressId || null;
  }
  if (req.body.shippingAddress) {
    order.shippingAddress = {
      ...order.shippingAddress.toObject(),
      ...normalizeShippingAddress(req.body.shippingAddress),
    };
  }
  if (req.body.shipping) {
    order.shipping = { ...order.shipping.toObject(), ...req.body.shipping };
  }
  if (req.body.notes !== undefined) order.notes = req.body.notes;
  if (req.body.buyerNotes !== undefined) order.buyerNotes = req.body.buyerNotes;
  if (req.body.sellerNotes !== undefined) order.sellerNotes = req.body.sellerNotes;

  let escrow = await loadOrderEscrow(order);

  if (order.status === 'processing') {
    order.sellerConfirmedAt = order.sellerConfirmedAt || new Date();
    if (!order.paidAt && (order.paymentType === 'wallet' || order.paymentType === 'escrow')) {
      escrow = await holdEscrowForOrder(order, {
        flowType: order.type === 'auction_win' ? 'auction_win' : order.type === 'auction_buy_now' ? 'auction_buy_now' : 'direct_purchase',
        description: 'Funds moved from buyer wallet into escrow after seller confirmation',
      });
      order.paidAt = order.paidAt || new Date();
    }
  }
  if (order.status === 'paid' && !order.paidAt) {
    order.paidAt = new Date();
  }
  if (order.status === 'shipping') {
    order.shippedAt = order.shippedAt || new Date();
    order.shipping.status = 'shipping';
    order.shipping.sentAt = order.shipping.sentAt || new Date();
  }
  if (order.status === 'delivered') {
    order.deliveredAt = order.deliveredAt || new Date();
    order.shipping.status = 'delivered';
    order.shipping.deliveredAt = order.shipping.deliveredAt || new Date();
    if (escrow?.status === 'held') {
      await scheduleEscrowAutoRelease(order, 5);
    }
  }
  if (order.status === 'completed') {
    order.buyerConfirmedAt = order.buyerConfirmedAt || new Date();
    if (escrow?.status === 'held') {
      escrow = await releaseEscrowToSeller(escrow, order, {
        description: 'Buyer confirmed received item',
      });
    }
    order.completedAt = order.completedAt || new Date();
  }
  if (order.status === 'cancelled') {
    if (escrow?.status === 'held') {
      escrow = await refundEscrowToBuyer(escrow, order, {
        description: 'Order cancelled and wallet funds refunded to buyer',
      });
    }
    order.cancelledAt = order.cancelledAt || new Date();
  }
  await order.save();

  return sendSuccess(res, order);
});

exports.deleteOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    return sendError(res, 'Order not found', 404);
  }
  if (!canAccessOrder(order, req)) {
    return sendError(res, 'Forbidden', 403);
  }
  await Order.deleteOne({ _id: order._id });
  await OrderItem.deleteMany({ order: order._id });
  await EscrowTransaction.findOneAndDelete({ order: order._id });
  return sendSuccess(res, { deleted: true });
});
