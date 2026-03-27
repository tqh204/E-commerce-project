/**
 * Seed Data - Insert Sample Documents vào MongoDB
 * Chạy: node seed-data.js
 */

const mongoose = require('mongoose');
const connectDB = require('./config/database');
const { User, Category, Product, Conversation, Message, Order } = require('./schemas');

const seedData = async () => {
  try {
    await connectDB();
    console.log('✅ Kết nối MongoDB thành công\n');

    // ===== USERS =====
    console.log('📝 Tạo Users...');
    const users = await User.create([
      {
        username: 'seller001',
        email: 'seller001@example.com',
        password: 'password123',
        fullName: 'Nguyễn Văn A',
        phone: '+84987654321',
        address: 'Số 123, Đường Nguyễn Huệ, TP.HCM',
        balance: 5000000,
        rating: 4.5,
        totalSold: 15,
        isVerified: true,
      },
      {
        username: 'buyer001',
        email: 'buyer001@example.com',
        password: 'password123',
        fullName: 'Trần Thị B',
        phone: '+84912345678',
        address: 'Số 456, Đường Lê Lợi, TP.HCM',
        balance: 2000000,
        rating: 4.8,
        totalBought: 8,
        isVerified: true,
      },
    ]);
    console.log(`✅ Tạo ${users.length} user\n`);

    // ===== CATEGORIES =====
    console.log('📝 Tạo Categories...');
    const categories = await Category.create([
      {
        name: 'Điện tử',
        slug: 'dien-tu',
        description: 'Các thiết bị điện tử cũ: điện thoại, laptop, máy tính',
        icon: 'fa-mobile',
        order: 1,
      },
      {
        name: 'Thời trang',
        slug: 'thoi-trang',
        description: 'Quần áo, giày dép, túi xách cũ',
        icon: 'fa-shirt',
        order: 2,
      },
      {
        name: 'Nội thất',
        slug: 'noi-that',
        description: 'Bàn, ghế, tủ, giường cũ',
        icon: 'fa-sofa',
        order: 3,
      },
    ]);
    console.log(`✅ Tạo ${categories.length} category\n`);

    // ===== PRODUCTS =====
    console.log('📝 Tạo Products...');
    const products = await Product.create([
      {
        title: 'iPhone 12 Pro Max Quốc Tế',
        description: 'iPhone 12 Pro Max 128GB, màu xanh dương, máy zin 99%, pin 85%, không trầy xước gì hết. Bao gồm hộp và sạc.',
        price: 12000000,
        category: categories[0]._id,
        seller: users[0]._id,
        images: [
          'https://example.com/iphone1.jpg',
          'https://example.com/iphone2.jpg',
        ],
        thumbnailImage: 'https://example.com/iphone_thumb.jpg',
        location: {
          type: 'Point',
          coordinates: [106.6263, 10.8231], // TP.HCM
        },
        address: 'Quận 1, TP.HCM',
        status: 'Đang bán',
        condition: 'Như mới',
        tags: ['smartphone', 'iphone', 'apple', 'quốc tế'],
        views: 245,
      },
      {
        title: 'Laptop Dell XPS 13 Đời Mới',
        description: 'Dell XPS 13 9310, Intel i5, RAM 8GB, SSD 512GB, màn hình Full HD, còn 60% pin. Dùng 8 tháng, rất gọn nhẹ.',
        price: 18000000,
        category: categories[0]._id,
        seller: users[0]._id,
        images: [
          'https://example.com/laptop1.jpg',
          'https://example.com/laptop2.jpg',
          'https://example.com/laptop3.jpg',
        ],
        location: {
          type: 'Point',
          coordinates: [106.6263, 10.8231],
        },
        address: 'Quận 1, TP.HCM',
        status: 'Đang bán',
        condition: 'Tốt',
        tags: ['laptop', 'dell', 'xps', 'mỏng'],
        views: 156,
      },
      {
        title: 'Áo Sơ Mi Uniqlo - Size M',
        description: 'Áo sơ mi Uniqlo chất lượng, màu trắng, vải cotton 100%, thoáng mát. Dùng 2 lần, như mới.',
        price: 200000,
        category: categories[1]._id,
        seller: users[1]._id,
        images: ['https://example.com/shirt.jpg'],
        location: {
          type: 'Point',
          coordinates: [106.6263, 10.8231],
        },
        address: 'Quận 3, TP.HCM',
        status: 'Đang bán',
        condition: 'Như mới',
        tags: ['áo', 'uniqlo', 'sơ mi'],
      },
    ]);
    console.log(`✅ Tạo ${products.length} product\n`);

    // ===== CONVERSATIONS =====
    console.log('📝 Tạo Conversations...');
    const conversations = await Conversation.create([
      {
        participants: [users[0]._id, users[1]._id],
        product: products[0]._id,
        subject: 'Hỏi về iPhone 12',
        lastMessage: 'Bạn ơi, còn hàng không?',
        lastMessageBy: users[1]._id,
      },
      {
        participants: [users[0]._id, users[1]._id],
        product: products[1]._id,
        subject: 'Laptop Dell',
        lastMessage: 'Có thể giảm giá không?',
        lastMessageBy: users[1]._id,
      },
    ]);
    console.log(`✅ Tạo ${conversations.length} conversation\n`);

    // ===== MESSAGES =====
    console.log('📝 Tạo Messages...');
    const messages = await Message.create([
      {
        conversation: conversations[0]._id,
        sender: users[1]._id,
        content: 'Chào bạn, iPhone 12 này còn bán không?',
        status: 'Đã xem',
      },
      {
        conversation: conversations[0]._id,
        sender: users[0]._id,
        content: 'Có bạn ơi, còn hàng. Bạn muốn xem trực tiếp không?',
        status: 'Đã xem',
      },
      {
        conversation: conversations[1]._id,
        sender: users[1]._id,
        content: 'Laptop Dell này giá bao nhiêu cuối cùng?',
        status: 'Đã gửi',
      },
    ]);
    console.log(`✅ Tạo ${messages.length} message\n`);

    // ===== ORDERS =====
    console.log('📝 Tạo Orders...');
    const orders = await Order.create([
      {
        buyer: users[1]._id,
        seller: users[0]._id,
        product: products[0]._id,
        price: 12000000,
        quantity: 1,
        totalAmount: 12000000,
        shippingAddress: {
          fullName: 'Trần Thị B',
          phone: '+84912345678',
          address: 'Số 456, Đường Lê Lợi, Quận 3, TP.HCM',
          city: 'TP.HCM',
          zipCode: '700000',
        },
        shipping: {
          method: 'Giao hàng',
          shippingFee: 50000,
          status: 'Đã giao',
          trackingNumber: 'TRACK123456',
          deliveredAt: new Date(),
        },
        escrow: {
          amount: 12000000,
          status: 'Đã trả',
          releasedAt: new Date(),
        },
        status: 'Hoàn thành',
        notes: 'Giao hàng nhanh, đóng gói cẩn thận',
        rating: {
          score: 5,
          comment: 'Sản phẩm đúng như mô tả, rất hài lòng!',
          ratedAt: new Date(),
        },
      },
    ]);
    console.log(`✅ Tạo ${orders.length} order\n`);

    console.log('=' * 50);
    console.log('✅ SEED DATA HOÀN THÀNH!');
    console.log('=' * 50);
    console.log(`
📊 Tóm tắt:
  - Users: ${users.length}
  - Categories: ${categories.length}
  - Products: ${products.length}
  - Conversations: ${conversations.length}
  - Messages: ${messages.length}
  - Orders: ${orders.length}

🔗 Bây giờ bạn có thể:
  1. Mở MongoDB Compass
  2. Xem tất cả fields trong collections
  3. Xem dữ liệu sample để kiểm tra structure
    `);

    process.exit(0);
  } catch (err) {
    console.error('❌ Lỗi:', err.message);
    process.exit(1);
  }
};

seedData();
