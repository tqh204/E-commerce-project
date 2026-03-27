/**
 * Test Validators cho tất cả Schemas
 * Chạy: node test-validators.js (sau khi kết nối MongoDB)
 */

const User = require('./schemas/User');
const Category = require('./schemas/Category');
const Product = require('./schemas/Product');
const Order = require('./schemas/Order');

// Test cases cho mỗi schema
const testValidators = async () => {
  console.log('🧪 Bắt đầu test validators...\n');

  // ===== USER TESTS =====
  console.log('👤 Testing User Schema:');
  
  try {
    // Test 1: Username quá ngắn
    const user1 = new User({
      username: 'ab',
      email: 'test@example.com',
      password: '123456',
      fullName: 'Test User',
    });
    await user1.validate();
    console.log('❌ Username ngắn: FAIL (nên có lỗi)');
  } catch (err) {
    console.log('✅ Username ngắn:', err.errors.username?.message);
  }

  try {
    // Test 2: Email không hợp lệ
    const user2 = new User({
      username: 'testuser123',
      email: 'invalid-email',
      password: '123456',
      fullName: 'Test User',
    });
    await user2.validate();
    console.log('❌ Email không hợp lệ: FAIL');
  } catch (err) {
    console.log('✅ Email không hợp lệ:', err.errors.email?.message);
  }

  try {
    // Test 3: Password quá ngắn
    const user3 = new User({
      username: 'testuser123',
      email: 'test@example.com',
      password: '12345',
      fullName: 'Test User',
    });
    await user3.validate();
    console.log('❌ Password quá ngắn: FAIL');
  } catch (err) {
    console.log('✅ Password quá ngắn:', err.errors.password?.message);
  }

  try {
    // Test 4: Số điện thoại không hợp lệ
    const user4 = new User({
      username: 'testuser123',
      email: 'test@example.com',
      password: '123456',
      fullName: 'Test User',
      phone: '123456789',
    });
    await user4.validate();
    console.log('❌ Số ĐT không hợp lệ: FAIL');
  } catch (err) {
    console.log('✅ Số ĐT không hợp lệ:', err.errors.phone?.message);
  }

  // ===== CATEGORY TESTS =====
  console.log('\n🏷️  Testing Category Schema:');
  
  try {
    // Test 1: Slug với ký tự không hợp lệ
    const cat1 = new Category({
      name: 'Electronics',
      slug: 'electronics_devices',
      description: 'All electronic devices',
    });
    await cat1.validate();
    console.log('❌ Slug với underscore: FAIL (nên có lỗi)');
  } catch (err) {
    console.log('✅ Slug với underscore:', err.errors.slug?.message);
  }

  try {
    // Test 2: Description quá dài
    const cat2 = new Category({
      name: 'Fashion',
      slug: 'fashion',
      description: 'x'.repeat(1001),
    });
    await cat2.validate();
    console.log('❌ Description quá dài: FAIL');
  } catch (err) {
    console.log('✅ Description quá dài:', err.errors.description?.message);
  }

  // ===== PRODUCT TESTS =====
  console.log('\n📦 Testing Product Schema:');
  
  try {
    // Test 1: Title quá ngắn
    const prod1 = new Product({
      title: 'Phone',
      description: 'This is a very detailed description of a smartphone product for sale.',
      price: 100,
      category: '507f1f77bcf86cd799439011',
      seller: '507f1f77bcf86cd799439012',
      images: ['img1.jpg'],
    });
    await prod1.validate();
    console.log('❌ Title quá ngắn: FAIL (nên có lỗi)');
  } catch (err) {
    console.log('✅ Title quá ngắn:', err.errors.title?.message);
  }

  try {
    // Test 2: Không có images
    const prod2 = new Product({
      title: 'Sample Product Title',
      description: 'This is a very detailed description of a product for sale on the platform.',
      price: 100,
      category: '507f1f77bcf86cd799439011',
      seller: '507f1f77bcf86cd799439012',
      images: [],
    });
    await prod2.validate();
    console.log('❌ Không có images: FAIL');
  } catch (err) {
    console.log('✅ Không có images:', err.errors.images?.message);
  }

  try {
    // Test 3: Tọa độ không hợp lệ
    const prod3 = new Product({
      title: 'Sample Product Title',
      description: 'This is a very detailed description of a product for sale on the platform.',
      price: 100,
      category: '507f1f77bcf86cd799439011',
      seller: '507f1f77bcf86cd799439012',
      images: ['img1.jpg'],
      location: {
        type: 'Point',
        coordinates: [200, 100], // Longitude quá lớn
      },
    });
    await prod3.validate();
    console.log('❌ Coordinates không hợp lệ: FAIL');
  } catch (err) {
    console.log('✅ Coordinates không hợp lệ:', err.errors['location.coordinates']?.message);
  }

  // ===== ORDER TESTS =====
  console.log('\n🛒 Testing Order Schema:');
  
  try {
    // Test 1: Quantity không phải integer
    const order1 = new Order({
      buyer: '507f1f77bcf86cd799439011',
      seller: '507f1f77bcf86cd799439012',
      product: '507f1f77bcf86cd799439013',
      price: 100,
      quantity: 2.5,
      totalAmount: 250,
      shipping: {
        method: 'Giao hàng',
      },
      escrow: {
        amount: 250,
      },
    });
    await order1.validate();
    console.log('❌ Quantity không integer: FAIL (nên có lỗi)');
  } catch (err) {
    console.log('✅ Quantity không integer:', err.errors.quantity?.message);
  }

  console.log('\n✅ Test hoàn thành!\n');
};

module.exports = testValidators;
