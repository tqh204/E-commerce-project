const mongoose = require('mongoose');
const connectDB = require('./config/database');
const { Product, Category, User } = require('./schemas');

(async () => {
  try {
    await connectDB();
    
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║      IMPORT VERIFICATION REPORT      ║');
    console.log('╚════════════════════════════════════════╝\n');
    
    // Check products
    const productCount = await Product.countDocuments();
    console.log(`📦 Total products: ${productCount}`);
    
    // Check categories
    const categoryCount = await Category.countDocuments();
    console.log(`📂 Total categories: ${categoryCount}`);
    
    // Check sellers
    const sellerCount = await User.countDocuments();
    console.log(`👥 Total users: ${sellerCount}`);
    
    // Sample products
    console.log('\n🚗 Sample products imported:\n');
    const samples = await Product.find()
      .select('title price address category')
      .limit(5);
    
    samples.forEach((p, i) => {
      const title = p.title || 'N/A';
      console.log(`  ${i+1}. ${title.substring(0, 50)}`);
      console.log(`     💰 ${p.price ? p.price.toLocaleString() : 'N/A'} VND`);
      console.log(`     📍 ${p.address || 'N/A'}\n`);
    });
    
    // Statistics
    console.log('📊 Category breakdown:\n');
    const categories = await Category.find();
    for (const cat of categories) {
      const count = await Product.countDocuments({ category: cat._id });
      console.log(`  • ${cat.name}: ${count} products`);
    }
    
    console.log('\n✅ Verification complete!\n');
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();
