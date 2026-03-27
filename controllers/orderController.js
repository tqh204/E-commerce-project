const { EscrowTransaction, Order, OrderItem, Product } = require('../schemas');
const {
  asyncHandler,
  buildPaginationMeta,
  parsePagination,
  sendError,
  sendSuccess,
} = require('../lib/http');

const canAccessOrder = (order, req) =>
  (req.userRoles || []).includes('admin') ||
  String(order.buyer) === String(req.user._id) ||
  String(order.seller) === String(req.user._id);

exports.listOrders = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = {};
  if (!(req.userRoles || []).includes('admin')) {
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
  const { productId, quantity = 1, paymentType = 'escrow', shippingMethod = 'delivery' } = req.body;
  const product = await Product.findById(productId);
  if (!product) {
    return sendError(res, 'Product not found', 404);
  }
  if (String(product.seller) === String(req.user._id)) {
    return sendError(res, 'Cannot order your own product', 400);
  }

  const subtotal = product.price * Number(quantity || 1);
  const shippingFee = Number(req.body.shippingFee || 0);
  const platformFee = Number(req.body.platformFee || 0);

  const order = await Order.create({
    buyer: req.user._id,
    seller: product.seller,
    product: product._id,
    auction: req.body.auctionId,
    type: req.body.type || 'fixed_price',
    paymentType,
    shippingMethod,
    price: product.price,
    quantity,
    subtotal,
    shippingFee,
    platformFee,
    totalAmount: subtotal + shippingFee + platformFee,
    shippingAddressRef: req.body.shippingAddressId,
    shippingAddress: req.body.shippingAddress || {},
    shipping: {
      method: shippingMethod,
      carrier: req.body.carrier,
      shippingFee,
      trackingNumber: req.body.trackingNumber,
      status: req.body.shippingStatus || 'pending',
    },
    status: req.body.status || 'pending_payment',
    notes: req.body.notes,
    buyerNotes: req.body.buyerNotes,
  });

  const orderItem = await OrderItem.create({
    order: order._id,
    product: product._id,
    seller: product.seller,
    titleSnapshot: product.title,
    priceSnapshot: product.price,
    quantity,
    total: subtotal,
    primaryImage: product.thumbnailImage || product.images?.[0] || null,
  });

  let escrowTransaction = null;
  if (paymentType === 'escrow') {
    escrowTransaction = await EscrowTransaction.create({
      order: order._id,
      buyer: req.user._id,
      seller: product.seller,
      amount: subtotal,
      feeAmount: platformFee,
      status: 'pending',
    });
    order.escrowTransaction = escrowTransaction._id;
    await order.save();
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

  order.status = req.body.status || order.status;
  if (req.body.shipping) {
    order.shipping = { ...order.shipping.toObject(), ...req.body.shipping };
  }
  if (req.body.notes !== undefined) order.notes = req.body.notes;
  if (req.body.buyerNotes !== undefined) order.buyerNotes = req.body.buyerNotes;
  if (req.body.sellerNotes !== undefined) order.sellerNotes = req.body.sellerNotes;
  await order.save();

  return sendSuccess(res, order);
});

exports.deleteOrder = asyncHandler(async (req, res) => {
  const order = await Order.findByIdAndDelete(req.params.id);
  if (!order) {
    return sendError(res, 'Order not found', 404);
  }
  await OrderItem.deleteMany({ order: order._id });
  await EscrowTransaction.findOneAndDelete({ order: order._id });
  return sendSuccess(res, { deleted: true });
});
