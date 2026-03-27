/**
 * Chotot.com Scraper với Puppeteer
 * Dùng cho trang web có JavaScript rendering (dynamic content)
 * 
 * Cài đặt: npm install puppeteer
 */

const puppeteer = require('puppeteer');
const mongoose = require('mongoose');
const connectDB = require('./config/database');
const { Product, Category, User } = require('./schemas');

/**
 * Delay function
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Scrape Chotot với Puppeteer
 */
const scrapeChototWithPuppeteer = async (categoryUrl, categoryName, maxPages = 1) => {
  let browser;
  const allProducts = [];
  
  try {
    console.log('🌐 Khởi động browser...');
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ],
    });
    
    const page = await browser.newPage();
    
    // Set viewport
    await page.setViewport({ width: 1280, height: 1024 });
    
    // Set user agent
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
    
    // Block resources để tăng tốc độ
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const resourceType = request.resourceType();
      if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
        request.abort();
      } else {
        request.continue();
      }
    });
    
    for (let page_num = 1; page_num <= maxPages; page_num++) {
      try {
        const url = `${categoryUrl}?page=${page_num}`;
        console.log(`📄 Đang lấy trang ${page_num}: ${url}`);
        
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        
        // Wait cho products load
        await page.waitForSelector('[id^="listing_item_"]', { timeout: 5000 }).catch(() => {
          console.log('⚠️  Không tìm thấy products');
        });
        
        // Scrape products từ page
        const products = await page.evaluate(() => {
          const items = [];
          const productElements = document.querySelectorAll('[id^="listing_item_"]');
          
          productElements.forEach((el) => {
            try {
              const title = el.querySelector('a[href*="/"]')?.getAttribute('title') || 
                          el.querySelector('a[href*="/"]')?.textContent || '';
              
              const priceText = el.querySelector('[class*="price"]')?.textContent || '0';
              const price = parseInt(priceText.replace(/[^0-9]/g, '')) || 0;
              
              const description = el.querySelector('[class*="description"]')?.textContent?.trim() || '';
              
              const image = el.querySelector('img')?.getAttribute('src') || 
                          el.querySelector('img')?.getAttribute('data-src') || '';
              
              const address = el.querySelector('[class*="location"]')?.textContent?.trim() || 'Chưa xác định';
              
              if (title && price > 0) {
                items.push({ title, price, description, image, address });
              }
            } catch (err) {
              console.error('Lỗi parse:', err);
            }
          });
          
          return items;
        });
        
        console.log(`✅ Lấy được ${products.length} sản phẩm`);
        allProducts.push(...products);
        
        if (page_num < maxPages) {
          await delay(2000);
        }
        
      } catch (error) {
        console.error(`❌ Lỗi trang ${page_num}:`, error.message);
      }
    }
    
    await browser.close();
    console.log(`✅ Hoàn thành: ${allProducts.length} sản phẩm\n`);
    
    return allProducts;
    
  } catch (error) {
    console.error('❌ Lỗi Puppeteer:', error.message);
    if (browser) await browser.close();
    return [];
  }
};

/**
 * Import vào MongoDB
 */
const importChototProducts = async (scrapedData) => {
  try {
    await connectDB();
    
    if (!scrapedData || scrapedData.length === 0) {
      console.log('⚠️  Không có dữ liệu để import');
      return;
    }
    
    // Tạo category
    let category = await Category.findOne({ slug: 'chotot' });
    if (!category) {
      category = await Category.create({
        name: 'Chotot Scraped',
        slug: 'chotot',
        description: 'Sản phẩm lấy từ Chotot.com',
      });
    }
    
    // Tạo seller
    let seller = await User.findOne({ username: 'chotot_scraper' });
    if (!seller) {
      seller = await User.create({
        username: 'chotot_scraper',
        email: 'chotot@scraper.local',
        password: 'chotot123456',
        fullName: 'Chotot Scraper',
      });
    }
    
    // Prepare products
    const productsToInsert = scrapedData.map(item => ({
      title: (item.title || 'Sản phẩm').substring(0, 200),
      description: (item.description || 'Không có mô tả').substring(0, 5000),
      price: Math.max(item.price || 0, 0),
      category: category._id,
      seller: seller._id,
      images: item.image ? [item.image] : [],
      address: (item.address || 'Chưa xác định').substring(0, 500),
      status: 'Đang bán',
      condition: 'Bình thường',
      tags: ['chotot', 'scraped'],
    }));
    
    const inserted = await Product.insertMany(productsToInsert);
    
    console.log(`\n✅ Đã import ${inserted.length} sản phẩm từ Chotot`);
    
  } catch (error) {
    console.error('❌ Lỗi import:', error.message);
  }
};

/**
 * Main
 */
const main = async () => {
  try {
    console.log('🕷️  Chotot Scraper (Puppeteer)\n');
    
    // Scrape từ categories
    const categories = [
      { url: 'https://xe.chotot.com/', name: 'Xe máy & Ô tô' },
      // { url: 'https://www.chotot.com/dien-thoai-may-tinh-bang', name: 'Điện thoại' },
      // Thêm categories khác tại đây
    ];
    
    let allProducts = [];
    
    for (const cat of categories) {
      const products = await scrapeChototWithPuppeteer(cat.url, cat.name, maxPages = 1);
      allProducts.push(...products);
      await delay(2000);
    }
    
    if (allProducts.length > 0) {
      await importChototProducts(allProducts);
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    process.exit(1);
  }
};

if (require.main === module) {
  main();
}

module.exports = { scrapeChototWithPuppeteer, importChototProducts };
