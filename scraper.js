/**
 * Web Scraper - Lấy dữ liệu từ các trang web để import vào MongoDB
 * Có thể dùng cho scraping từ Shopee, Facebook Marketplace, OLX, v.v...
 * 
 * Lưu ý: Luôn kiểm tra robots.txt và terms of service trước khi scrape
 */

const axios = require('axios');
const cheerio = require('cheerio');
const mongoose = require('mongoose');
const connectDB = require('./config/database');
const { Product, Category, User } = require('./schemas');

/**
 * Option 1: Scrape từ một HTML URL đơn giản
 * Ví dụ: Lấy dữ liệu sản phẩm từ một trang web
 */
const scrapeSampleProducts = async () => {
  try {
    // Ví dụ scrape từ trang có sẵn HTML tĩnh
    // Bạn cần thay đổi URL và selectors phù hợp với trang target
    
    const url = 'https://example-ecommerce.com/products'; // Thay đổi URL này
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    
    const products = [];
    
    // Điều chỉnh selectors dựa trên cấu trúc HTML thực tế
    $('div.product-item').each((index, element) => {
      const title = $(element).find('h2.product-title').text().trim();
      const price = $(element).find('span.product-price').text().trim();
      const description = $(element).find('p.product-desc').text().trim();
      const image = $(element).find('img.product-image').attr('src');
      
      if (title && price) {
        products.push({
          title,
          price: parseFloat(price.replace(/[^0-9]/g, '')),
          description,
          image,
        });
      }
    });
    
    return products;
  } catch (error) {
    console.error('❌ Lỗi scrape:', error.message);
    return [];
  }
};

/**
 * Option 2: Sử dụng JSON API (nhiều website cung cấp)
 */
const scrapeFromAPI = async () => {
  try {
    // Một số website cung cấp public API với dữ liệu JSON
    const response = await axios.get('https://api.example.com/products');
    return response.data;
  } catch (error) {
    console.error('❌ Lỗi API:', error.message);
    return [];
  }
};

/**
 * Option 3: Scrape từ Shopee (ví dụ thực tế - cần API key hoặc reverse engineering)
 */
const scrapeShopee = async (keyword) => {
  try {
    // Shopee có API riêng, nhưng cần authen
    // Đây là ví dụ sử dụng axios để lấy dữ liệu
    
    const url = `https://shopee.vn/api/v2/search_items?by=relevancy&keyword=${encodeURIComponent(keyword)}&limit=20&offset=0`;
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    
    if (response.data.data && response.data.data.items) {
      return response.data.data.items.map(item => ({
        title: item.name,
        price: item.price / 100000, // Shopee trả về giá x100000
        description: item.description || '',
        images: item.images ? item.images.map(img => `https://cf.shopee.vn/file/${img}`) : [],
      }));
    }
    
    return [];
  } catch (error) {
    console.error('❌ Lỗi Shopee scrape:', error.message);
    return [];
  }
};

/**
 * Option 4: Lấy sample data từ public dataset
 */
const getSampleDataFromPublicAPI = async () => {
  try {
    // JSONPlaceholder là API public test, chúng ta dùng nó để demo
    const response = await axios.get('https://jsonplaceholder.typicode.com/posts');
    
    // Convert sang format product
    const products = response.data.slice(0, 10).map((item, index) => ({
      title: item.title,
      description: item.body,
      price: Math.floor(Math.random() * 10000000) + 100000, // Random price
      images: [
        `https://via.placeholder.com/300x300?text=Product+${index + 1}`,
      ],
    }));
    
    return products;
  } catch (error) {
    console.error('❌ Lỗi lấy sample data:', error.message);
    return [];
  }
};

/**
 * Import dữ liệu scraped vào MongoDB
 */
const importScrapedData = async (scrapedData) => {
  try {
    await connectDB();
    
    if (!scrapedData || scrapedData.length === 0) {
      console.log('⚠️  Không có dữ liệu để import');
      return;
    }
    
    // Lấy category mặc định
    let category = await Category.findOne({ slug: 'dien-tu' });
    if (!category) {
      category = await Category.create({
        name: 'Điện tử',
        slug: 'dien-tu',
        description: 'Các sản phẩm điện tử',
      });
    }
    
    // Lấy seller mặc định
    let seller = await User.findOne({ username: 'scraper_user' });
    if (!seller) {
      seller = await User.create({
        username: 'scraper_user',
        email: 'scraper@example.com',
        password: 'scraperpass123',
        fullName: 'Scraped Data',
        balance: 0,
      });
    }
    
    // Tạo products từ dữ liệu scraped
    const productsToInsert = scrapedData.map(item => ({
      title: item.title || 'Sản phẩm không tên',
      description: item.description || 'Không có mô tả',
      price: item.price || 0,
      category: category._id,
      seller: seller._id,
      images: item.images && item.images.length > 0 ? item.images : [item.image || 'https://via.placeholder.com/300'],
      thumbnailImage: item.images?.[0] || item.image,
      address: item.address || 'Chưa xác định',
      status: 'Đang bán',
      condition: item.condition || 'Bình thường',
      views: 0,
      tags: item.tags || ['scraped', 'new'],
    }));
    
    const insertedProducts = await Product.insertMany(productsToInsert);
    
    console.log(`✅ Đã import ${insertedProducts.length} sản phẩm vào MongoDB`);
    return insertedProducts;
  } catch (error) {
    console.error('❌ Lỗi import:', error.message);
    throw error;
  }
};

/**
 * Main - Chọn source để scrape
 */
const main = async () => {
  try {
    console.log('🔍 Bắt đầu scraping dữ liệu...\n');
    
    let scrapedData;
    
    // Chọn một trong các option dưới đây:
    
    // Option 1: HTML scraping (cần thay đổi URL và selectors)
    // scrapedData = await scrapeSampleProducts();
    
    // Option 2: API scraping
    // scrapedData = await scrapeFromAPI();
    
    // Option 3: Shopee scraping
    console.log('📲 Scraping từ Shopee (điều kiện phòng tắm)...');
    scrapedData = await scrapeShopee('điều kiện phòng tắm');
    
    // Option 4: Public API (recommended cho test)
    // scrapedData = await getSampleDataFromPublicAPI();
    
    if (scrapedData && scrapedData.length > 0) {
      console.log(`✅ Lấy được ${scrapedData.length} sản phẩm`);
      console.log('\n📤 Importing vào MongoDB...\n');
      
      await importScrapedData(scrapedData);
      
      console.log('✅ Hoàn thành!');
    } else {
      console.log('⚠️  Không lấy được dữ liệu');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    process.exit(1);
  }
};

// Nếu chạy file này trực tiếp
if (require.main === module) {
  main();
}

module.exports = {
  scrapeSampleProducts,
  scrapeFromAPI,
  scrapeShopee,
  getSampleDataFromPublicAPI,
  importScrapedData,
};
