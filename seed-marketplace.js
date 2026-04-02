const mongoose = require('mongoose');
const connectDB = require('./config/database');
const { hashPassword, hashToken } = require('./lib/auth');
const { ensureSystemRoles } = require('./lib/roles');
const {
  User,
  RefreshToken,
  Address,
  Category,
  Media,
  ImportBatch,
  Product,
  Auction,
  Bid,
  Order,
  OrderItem,
  EscrowTransaction,
  Conversation,
  Message,
  Review,
} = require('./schemas');

const upsertOne = async (Model, filter, set, setOnInsert = {}) =>
  Model.findOneAndUpdate(
    filter,
    { $set: set, $setOnInsert: setOnInsert },
    { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }
  );

const computeMinimumBidStep = (baseAmount) => Math.max(20000, Math.ceil(Math.max(Number(baseAmount) || 0, 0) * 0.2));

async function seedMarketplace() {
  await connectDB();

  const roles = await ensureSystemRoles();
  const adminRole = roles.admin;
  const userRole = roles.user;

  const admin = await upsertOne(
    User,
    { email: 'admin@example.com' },
    {
      username: 'admin01',
      passwordHash: hashPassword('password123'),
      fullName: 'Marketplace Admin',
      phone: '+84901111111',
      roles: [adminRole._id],
      isVerified: true,
      isActive: true,
    }
  );
  const seller = await upsertOne(
    User,
    { email: 'seller01@example.com' },
    {
      username: 'seller01',
      passwordHash: hashPassword('password123'),
      fullName: 'Nguyen Van Seller',
      phone: '+84902222222',
      roles: [userRole._id],
      balance: 15000000,
      ratingAvg: 4.8,
      ratingCount: 21,
      totalSold: 14,
      isVerified: true,
      isActive: true,
    }
  );
  const buyer = await upsertOne(
    User,
    { email: 'buyer01@example.com' },
    {
      username: 'buyer01',
      passwordHash: hashPassword('password123'),
      fullName: 'Tran Thi Buyer',
      phone: '+84903333333',
      roles: [userRole._id],
      balance: 5000000,
      ratingAvg: 4.9,
      ratingCount: 7,
      totalBought: 9,
      isVerified: true,
      isActive: true,
    }
  );

  await upsertOne(
    RefreshToken,
    { tokenHash: hashToken('demo-refresh-token') },
    {
      user: buyer._id,
      deviceInfo: { userAgent: 'Seed Script', platform: 'node', appVersion: '1.0.0' },
      ipAddress: '127.0.0.1',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      revokedAt: null,
    }
  );

  const sellerAddress = await upsertOne(
    Address,
    { user: seller._id, label: 'home' },
    {
      fullName: seller.fullName,
      phone: seller.phone,
      province: 'Ho Chi Minh',
      district: 'District 1',
      ward: 'Ben Nghe',
      street: '1 Nguyen Hue',
      fullAddress: '1 Nguyen Hue, Ben Nghe, District 1, Ho Chi Minh',
      postalCode: '700000',
      location: { type: 'Point', coordinates: [106.7016, 10.7756] },
      isDefault: true,
    }
  );
  const buyerAddress = await upsertOne(
    Address,
    { user: buyer._id, label: 'home' },
    {
      fullName: buyer.fullName,
      phone: buyer.phone,
      province: 'Ho Chi Minh',
      district: 'District 3',
      ward: 'Ward 7',
      street: '88 Vo Van Tan',
      fullAddress: '88 Vo Van Tan, Ward 7, District 3, Ho Chi Minh',
      postalCode: '700000',
      location: { type: 'Point', coordinates: [106.6881, 10.7829] },
      isDefault: true,
    }
  );

  await User.findByIdAndUpdate(seller._id, { defaultAddress: sellerAddress._id });
  await User.findByIdAndUpdate(buyer._id, { defaultAddress: buyerAddress._id });

  const electronics = await upsertOne(
    Category,
    { slug: 'electronics' },
    { name: 'Electronics', description: 'Phones, laptops, and accessories', sortOrder: 1 }
  );
  const vehicles = await upsertOne(
    Category,
    { slug: 'vehicles' },
    { name: 'Vehicles', description: 'Motorbikes and cars', sortOrder: 2 }
  );
  await upsertOne(
    Category,
    { slug: 'fashion' },
    { name: 'Fashion', description: 'Second-hand clothing and accessories', sortOrder: 3 }
  );

  const importBatch = await upsertOne(
    ImportBatch,
    {
      source: 'chotot',
      sourceCategory: 'vehicles',
      query: 'xe may',
      sourceUrl: 'https://xe.chotot.com/',
    },
    {
      status: 'completed',
      startedAt: new Date(Date.now() - 30 * 60 * 1000),
      finishedAt: new Date(),
      totalFetched: 10,
      totalInserted: 1,
      totalUpdated: 0,
      totalSkipped: 9,
      totalFailed: 0,
      createdBy: admin._id,
      notes: 'Demo import batch for seeded data',
    }
  );

  const iphone = await upsertOne(
    Product,
    { seller: seller._id, title: 'iPhone 13 Pro 128GB Sierra Blue' },
    {
      category: electronics._id,
      description: 'Used iPhone in good condition, full box, battery health 88%.',
      saleType: 'fixed_price',
      price: 14500000,
      condition: 'good',
      status: 'active',
      fulfillmentType: 'both',
      images: [
        'https://images.example.com/iphone-13-pro-1.jpg',
        'https://images.example.com/iphone-13-pro-2.jpg',
      ],
      addressText: sellerAddress.fullAddress,
      province: sellerAddress.province,
      district: sellerAddress.district,
      ward: sellerAddress.ward,
      location: sellerAddress.location,
      tags: ['iphone', 'apple', 'used-phone'],
      viewsCount: 240,
      favoritesCount: 12,
      source: 'manual',
    }
  );

  const shModePrice = 70000000;
  const shModeStartingBid = 50000000;
  const shModeBidStep = computeMinimumBidStep(shModeStartingBid);
  const shModeCurrentBid = shModeStartingBid + shModeBidStep;
  const shMode = await upsertOne(
    Product,
    { source: 'chotot', sourceExternalId: 'chotot-vehicle-0001' },
    {
      seller: seller._id,
      category: vehicles._id,
      title: 'Honda SH Mode 2023 ABS',
      description: 'Chotot imported listing for vehicle auction demo.',
      saleType: 'auction',
      price: shModePrice,
      startingBid: shModeStartingBid,
      currentBid: shModeCurrentBid,
      buyNowPrice: shModePrice,
      bidStep: shModeBidStep,
      condition: 'good',
      status: 'active',
      fulfillmentType: 'meetup',
      images: ['https://images.example.com/sh-mode-2023.jpg'],
      addressText: 'Go Vap, Ho Chi Minh',
      province: 'Ho Chi Minh',
      district: 'Go Vap',
      ward: 'Ward 10',
      location: { type: 'Point', coordinates: [106.6654, 10.8387] },
      tags: ['motorbike', 'honda', 'auction'],
      sourceUrl: 'https://xe.chotot.com/mua-ban-xe-may/honda-sh-mode-demo',
      importBatch: importBatch._id,
    }
  );
  const macbook = await upsertOne(
    Product,
    { seller: seller._id, title: 'MacBook Air M1 8GB 256GB' },
    {
      category: electronics._id,
      description: 'Lightly used laptop with charger and sleeve.',
      saleType: 'fixed_price',
      price: 16500000,
      condition: 'like_new',
      status: 'active',
      fulfillmentType: 'shipping',
      images: ['https://images.example.com/macbook-air-m1.jpg'],
      addressText: sellerAddress.fullAddress,
      province: sellerAddress.province,
      district: sellerAddress.district,
      ward: sellerAddress.ward,
      location: sellerAddress.location,
      tags: ['laptop', 'apple', 'm1'],
      viewsCount: 98,
      source: 'manual',
    }
  );

  const iphoneMedia = await upsertOne(
    Media,
    { ownerType: 'product', ownerId: iphone._id, url: 'https://images.example.com/iphone-13-pro-1.jpg' },
    {
      uploader: seller._id,
      type: 'image',
      storageProvider: 'remote',
      isPrimary: true,
    }
  );
  const shModeMedia = await upsertOne(
    Media,
    { ownerType: 'product', ownerId: shMode._id, url: 'https://images.example.com/sh-mode-2023.jpg' },
    {
      uploader: seller._id,
      type: 'image',
      storageProvider: 'remote',
      isPrimary: true,
    }
  );
  const macbookMedia = await upsertOne(
    Media,
    { ownerType: 'product', ownerId: macbook._id, url: 'https://images.example.com/macbook-air-m1.jpg' },
    {
      uploader: seller._id,
      type: 'image',
      storageProvider: 'remote',
      isPrimary: true,
    }
  );

  await Product.findByIdAndUpdate(iphone._id, { mediaIds: [iphoneMedia._id] });
  await Product.findByIdAndUpdate(shMode._id, { mediaIds: [shModeMedia._id] });
  await Product.findByIdAndUpdate(macbook._id, { mediaIds: [macbookMedia._id] });

  const auction = await upsertOne(
    Auction,
    { product: shMode._id },
    {
      seller: seller._id,
      startAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      endAt: new Date(Date.now() + 22 * 60 * 60 * 1000),
      startingBid: shModeStartingBid,
      currentBid: shModeCurrentBid,
      buyNowPrice: shModePrice,
      bidStep: shModeBidStep,
      minimumBidStep: shModeBidStep,
      totalBids: 1,
      lastBidAt: new Date(),
      status: 'live',
    }
  );

  const bid = await upsertOne(
    Bid,
    { auction: auction._id, bidder: buyer._id, amount: shModeCurrentBid },
    { product: shMode._id, isWinning: true, status: 'active' }
  );
  await Auction.findByIdAndUpdate(auction._id, { winnerUser: buyer._id, winnerBid: bid._id });

  const order = await upsertOne(
    Order,
    { orderCode: 'ORD-DEMO-0001' },
    {
      buyer: buyer._id,
      seller: seller._id,
      product: iphone._id,
      type: 'fixed_price',
      paymentType: 'escrow',
      shippingMethod: 'delivery',
      price: iphone.price,
      quantity: 1,
      subtotal: iphone.price,
      shippingFee: 30000,
      platformFee: 20000,
      totalAmount: iphone.price + 50000,
      shippingAddressRef: buyerAddress._id,
      shippingAddress: {
        fullName: buyerAddress.fullName,
        phone: buyerAddress.phone,
        province: buyerAddress.province,
        district: buyerAddress.district,
        ward: buyerAddress.ward,
        address: buyerAddress.fullAddress,
        city: buyerAddress.province,
        zipCode: buyerAddress.postalCode,
      },
      shipping: {
        method: 'delivery',
        carrier: 'GHN',
        shippingFee: 30000,
        trackingNumber: 'DEMO-TRACK-0001',
        status: 'delivered',
        sentAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        deliveredAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },
      escrow: {
        amount: iphone.price,
        status: 'released',
        releasedAt: new Date(),
      },
      status: 'completed',
      paidAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      shippedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      deliveredAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      completedAt: new Date(),
      notes: 'Seeded completed order',
    }
  );

  await upsertOne(
    OrderItem,
    { order: order._id, product: iphone._id },
    {
      seller: seller._id,
      titleSnapshot: iphone.title,
      priceSnapshot: iphone.price,
      quantity: 1,
      total: iphone.price,
      primaryImage: iphone.thumbnailImage || iphone.images[0],
    }
  );

  const escrowTransaction = await upsertOne(
    EscrowTransaction,
    { order: order._id },
    {
      buyer: buyer._id,
      seller: seller._id,
      amount: iphone.price,
      feeAmount: 20000,
      status: 'released',
      heldAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      releasedAt: new Date(),
    }
  );
  await Order.findByIdAndUpdate(order._id, { escrowTransaction: escrowTransaction._id });

  const conversation = await upsertOne(
    Conversation,
    { product: iphone._id, subject: 'Ask about iPhone 13 Pro' },
    {
      participants: [seller._id, buyer._id],
      type: 'product',
      lastMessage: 'Can you ship it today?',
      lastMessageBy: buyer._id,
      lastMessageAt: new Date(),
    }
  );

  await upsertOne(
    Message,
    { conversation: conversation._id, sender: buyer._id, content: 'Can you ship it today?' },
    { status: 'read' }
  );
  await upsertOne(
    Message,
    {
      conversation: conversation._id,
      sender: seller._id,
      content: 'Yes, I can hand it over to the carrier this afternoon.',
    },
    { status: 'sent' }
  );

  await upsertOne(
    Review,
    { order: order._id, reviewer: buyer._id },
    {
      product: iphone._id,
      reviewee: seller._id,
      score: 5,
      comment: 'Fast response and the phone matched the listing.',
      isVisible: true,
    }
  );

  console.log('Marketplace upsert seed completed successfully.');
  console.log('Roles: 2');
  console.log('Users: 3');
  console.log('Categories: 3');
  console.log('Products: 3');
  console.log('Auction: 1');
  console.log('Orders: 1');
  console.log('OrderItems: 1');
  console.log('EscrowTransactions: 1');
  console.log('Conversations: 1');
  console.log('Messages: 2');
  console.log('Reviews: 1');
}

seedMarketplace()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });

