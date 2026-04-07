var schemas = require('../schemas');
var notificationLib = require('../lib/notifications');
var walletLib = require('../lib/wallet');
var escrowService = require('../lib/escrowService');
var httpLib = require('../lib/http');

var EscrowTransaction = schemas.EscrowTransaction;
var Order = schemas.Order;
var OrderItem = schemas.OrderItem;
var Product = schemas.Product;
var createNotification = notificationLib.createNotification;
var ensureSufficientAvailableBalance = walletLib.ensureSufficientAvailableBalance;
var getAvailableBalance = walletLib.getAvailableBalance;
var ensureEscrowRecord = escrowService.ensureEscrowRecord;
var holdEscrowForOrder = escrowService.holdEscrowForOrder;
var refundEscrowToBuyer = escrowService.refundEscrowToBuyer;
var releaseEscrowToSeller = escrowService.releaseEscrowToSeller;
var scheduleEscrowAutoRelease = escrowService.scheduleEscrowAutoRelease;
var buildPaginationMeta = httpLib.buildPaginationMeta;
var parsePagination = httpLib.parsePagination;

var createControllerError = function(message, status, details) {
  var error = new Error(message);
  error.status = status || 400;
  if (details !== undefined) {
    error.details = details;
  }
  return error;
};

var getRelatedUserId = function(value) {
  if (value && value._id) {
    return value._id;
  }
  return value;
};

var arrayContains = function(list, value) {
  return Array.isArray(list) && list.indexOf(value) !== -1;
};

var canAccessOrder = function(order, actor) {
  return arrayContains(actor.userRoles || [], 'admin') ||
    String(getRelatedUserId(order.buyer)) === String(actor.user && actor.user._id) ||
    String(getRelatedUserId(order.seller)) === String(actor.user && actor.user._id);
};

var normalizeShippingAddress = function(payload) {
  var data = payload || {};

  return {
    fullName: String(data.fullName || '').trim(),
    phone: String(data.phone || '').trim(),
    province: String(data.province || '').trim(),
    district: String(data.district || '').trim(),
    ward: String(data.ward || '').trim(),
    address: String(data.address || data.fullAddress || data.street || '').trim(),
    city: String(data.city || data.province || '').trim(),
    zipCode: String(data.zipCode || data.postalCode || '').trim(),
  };
};

var loadOrderEscrow = async function(order) {
  if (!order || !order.escrowTransaction) {
    return null;
  }
  return EscrowTransaction.findById(order.escrowTransaction);
};

var mergePlainObject = function(baseValue, patchValue) {
  var base = {};
  var patch = patchValue || {};
  var key;

  if (baseValue) {
    if (typeof baseValue.toObject === 'function') {
      base = baseValue.toObject();
    } else {
      base = baseValue;
    }
  }

  for (key in patch) {
    if (Object.prototype.hasOwnProperty.call(patch, key)) {
      base[key] = patch[key];
    }
  }

  return base;
};

var buildAvailableBalanceMessage = function(user) {
  return 'Insufficient wallet balance. Available: ' + getAvailableBalance(user);
};

module.exports.listOrders = async function(query, actor) {
  var pagination = parsePagination(query || {});
  var page = pagination.page;
  var limit = pagination.limit;
  var skip = pagination.skip;
  var filter = {};
  var canViewAll = arrayContains(actor.userRoles || [], 'admin') && query && query.scope === 'all';
  var results;

  if (!canViewAll) {
    filter.$or = [{ buyer: actor.user._id }, { seller: actor.user._id }];
  }
  if (query && query.status) {
    filter.status = query.status;
  }

  results = await Promise.all([
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

  return {
    data: results[0],
    meta: buildPaginationMeta(page, limit, results[1]),
  };
};

module.exports.getOrderById = async function(orderId, actor) {
  var order = await Order.findById(orderId)
    .populate('buyer', 'username fullName')
    .populate('seller', 'username fullName')
    .populate('product', 'title price thumbnailImage')
    .populate('escrowTransaction');
  var items;

  if (!order) {
    return null;
  }
  if (!canAccessOrder(order, actor)) {
    throw createControllerError('Forbidden', 403);
  }

  items = await OrderItem.find({ order: order._id });
  return { order: order, items: items };
};

module.exports.createOrder = async function(body, actor) {
  var productId = body.productId;
  var quantity = body.quantity === undefined ? 1 : body.quantity;
  var paymentType = body.paymentType || 'cod';
  var shippingMethod = body.shippingMethod || 'delivery';
  var product = await Product.findById(productId);
  var purchasePrice;
  var shippingAddress;
  var subtotal;
  var shippingFee;
  var platformFee;
  var totalAmount;
  var order;
  var orderItem;
  var escrowTransaction = null;

  if (!product) {
    throw createControllerError('Product not found', 404);
  }
  if (product.status !== 'active') {
    throw createControllerError('Product is not available for ordering', 400);
  }
  if (String(product.seller) === String(actor.user._id)) {
    throw createControllerError('Cannot order your own product', 400);
  }

  purchasePrice = Number(product.buyNowPrice || product.price || 0);
  if (purchasePrice <= 0) {
    throw createControllerError('Product does not support buy-now ordering', 400);
  }

  shippingAddress = normalizeShippingAddress(body.shippingAddress);
  if (!shippingAddress.fullName || !shippingAddress.phone || !shippingAddress.province ||
    !shippingAddress.district || !shippingAddress.address) {
    throw createControllerError('Shipping address is required', 400);
  }

  subtotal = purchasePrice * Number(quantity || 1);
  shippingFee = Number(body.shippingFee || 0);
  platformFee = Number(body.platformFee || 0);
  totalAmount = subtotal + shippingFee + platformFee;

  if (paymentType === 'wallet') {
    ensureSufficientAvailableBalance(actor.user, totalAmount, buildAvailableBalanceMessage(actor.user));
  }

  order = await Order.create({
    buyer: actor.user._id,
    seller: product.seller,
    product: product._id,
    auction: body.auctionId,
    type: body.type || 'buy_now',
    paymentType: paymentType,
    shippingMethod: shippingMethod,
    price: purchasePrice,
    quantity: quantity,
    subtotal: subtotal,
    shippingFee: shippingFee,
    platformFee: platformFee,
    totalAmount: totalAmount,
    shippingAddressRef: body.shippingAddressId,
    shippingAddress: shippingAddress,
    shipping: {
      method: shippingMethod,
      carrier: body.carrier,
      shippingFee: shippingFee,
      trackingNumber: body.trackingNumber,
      status: body.shippingStatus || 'pending',
    },
    status: body.status || 'negotiating',
    notes: body.notes,
    buyerNotes: body.buyerNotes,
  });

  orderItem = await OrderItem.create({
    order: order._id,
    product: product._id,
    seller: product.seller,
    titleSnapshot: product.title,
    priceSnapshot: purchasePrice,
    quantity: quantity,
    total: subtotal,
    primaryImage: product.thumbnailImage ||
      (Array.isArray(product.images) && product.images.length ? product.images[0] : null),
  });

  if (paymentType === 'escrow' || paymentType === 'wallet') {
    escrowTransaction = await ensureEscrowRecord(order, {
      amount: totalAmount,
      feeAmount: platformFee,
      flowType: 'direct_purchase',
      fundingSource: paymentType === 'wallet' ? 'wallet' : 'external',
    });
  }

  await Promise.all([
    createNotification({
      userId: order.buyer,
      title: 'Don hang moi',
      message: 'Ban da tao don hang ' + order.orderCode + '.',
      type: 'order_created',
      refType: 'order',
      refId: String(order._id),
      metadata: { orderCode: order.orderCode },
    }),
    createNotification({
      userId: order.seller,
      title: 'Co don hang moi',
      message: 'Ban nhan duoc don hang ' + order.orderCode + '.',
      type: 'order_created',
      refType: 'order',
      refId: String(order._id),
      metadata: { orderCode: order.orderCode },
    }),
  ]);

  return { order: order, orderItem: orderItem, escrowTransaction: escrowTransaction };
};

module.exports.updateOrderStatus = async function(orderId, body, actor) {
  var order = await Order.findById(orderId);
  var nextStatus;
  var isAdmin;
  var isBuyer;
  var isSeller;
  var buyerAllowed;
  var sellerAllowed;
  var previousStatus;
  var escrow;
  var statusLabel;

  if (!order) {
    return null;
  }
  if (!canAccessOrder(order, actor)) {
    throw createControllerError('Forbidden', 403);
  }

  nextStatus = body.status || order.status;
  isAdmin = arrayContains(actor.userRoles || [], 'admin');
  isBuyer = String(order.buyer) === String(actor.user._id);
  isSeller = String(order.seller) === String(actor.user._id);

  if (!isAdmin) {
    buyerAllowed = ['cancelled', 'completed'];
    sellerAllowed = ['processing', 'shipping', 'delivered', 'cancelled'];

    if (nextStatus !== order.status) {
      if (isBuyer && !arrayContains(buyerAllowed, nextStatus)) {
        throw createControllerError('Buyer cannot update to this order status', 403);
      }
      if (isSeller && !arrayContains(sellerAllowed, nextStatus)) {
        throw createControllerError('Seller cannot update to this order status', 403);
      }
    }
  }

  previousStatus = order.status;
  order.status = nextStatus;

  if (body.shippingMethod) {
    order.shippingMethod = body.shippingMethod;
    order.shipping.method = body.shippingMethod;
  }
  if (body.shippingAddressId !== undefined) {
    order.shippingAddressRef = body.shippingAddressId || null;
  }
  if (body.shippingAddress) {
    order.shippingAddress = mergePlainObject(
      order.shippingAddress,
      normalizeShippingAddress(body.shippingAddress)
    );
  }
  if (body.shipping) {
    order.shipping = mergePlainObject(order.shipping, body.shipping);
  }
  if (body.notes !== undefined) {
    order.notes = body.notes;
  }
  if (body.buyerNotes !== undefined) {
    order.buyerNotes = body.buyerNotes;
  }
  if (body.sellerNotes !== undefined) {
    order.sellerNotes = body.sellerNotes;
  }

  escrow = await loadOrderEscrow(order);

  if (order.status === 'processing') {
    order.sellerConfirmedAt = order.sellerConfirmedAt || new Date();
    if (!order.paidAt && (order.paymentType === 'wallet' || order.paymentType === 'escrow')) {
      escrow = await holdEscrowForOrder(order, {
        flowType:
          order.type === 'auction_win'
            ? 'auction_win'
            : order.type === 'auction_buy_now'
              ? 'auction_buy_now'
              : 'direct_purchase',
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
    if (escrow && escrow.status === 'held') {
      await scheduleEscrowAutoRelease(order, 5);
    }
  }
  if (order.status === 'completed') {
    order.buyerConfirmedAt = order.buyerConfirmedAt || new Date();
    if (escrow && escrow.status === 'held') {
      escrow = await releaseEscrowToSeller(escrow, order, {
        description: 'Buyer confirmed received item',
      });
    }
    order.completedAt = order.completedAt || new Date();
  }
  if (order.status === 'cancelled') {
    if (escrow && escrow.status === 'held') {
      escrow = await refundEscrowToBuyer(escrow, order, {
        description: 'Order cancelled and wallet funds refunded to buyer',
      });
    }
    order.cancelledAt = order.cancelledAt || new Date();
  }

  await order.save();

  if (previousStatus !== order.status) {
    statusLabel = order.status;
    await Promise.all([
      createNotification({
        userId: order.buyer,
        title: 'Cap nhat don hang',
        message: 'Don hang ' + order.orderCode + ' chuyen trang thai: ' + statusLabel + '.',
        type: 'order_status',
        refType: 'order',
        refId: String(order._id),
        metadata: { orderCode: order.orderCode, status: order.status },
      }),
      createNotification({
        userId: order.seller,
        title: 'Cap nhat don hang',
        message: 'Don hang ' + order.orderCode + ' chuyen trang thai: ' + statusLabel + '.',
        type: 'order_status',
        refType: 'order',
        refId: String(order._id),
        metadata: { orderCode: order.orderCode, status: order.status },
      }),
    ]);
  }

  return order;
};

module.exports.deleteOrder = async function(orderId, actor) {
  var order = await Order.findById(orderId);

  if (!order) {
    return false;
  }
  if (!canAccessOrder(order, actor)) {
    throw createControllerError('Forbidden', 403);
  }

  await Order.deleteOne({ _id: order._id });
  await OrderItem.deleteMany({ order: order._id });
  await EscrowTransaction.findOneAndDelete({ order: order._id });

  return true;
};
