/**
 * Xe.Chotot.com Scraper - Scrape dữ liệu xe máy & ô tô
 * URL: https://xe.chotot.com/
 */

const axios = require('axios');
const cheerio = require('cheerio');
const mongoose = require('mongoose');
const connectDB = require('./config/database');
const { Product, Category, User } = require('./schemas');

/**
 * Headers giả lập real browser
 */
const getHeaders = () => ({
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'vi-VN,vi;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'DNT': '1',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Cache-Control': 'max-age=0',
});

/**
 * Delay function
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Scrape từ xe.chotot.com
 */
const scrapeXeChotot = async (url = 'https://xe.chotot.com/', maxPages = 2) => {
  const allProducts = [];

  try {
    for (let page = 1; page <= maxPages; page++) {
      try {
        console.log(`\n📄 Đang lấy trang ${page}...`);
        
        // Xây dựng URL có pagination
        const pageUrl = url.includes('?') 
          ? `${url}&page=${page}` 
          : `${url}?page=${page}`;
        
        console.log(`🔗 URL: ${pageUrl}`);
        
        const response = await axios.get(pageUrl, {
          headers: getHeaders(),
          timeout: 15000,
        });

        if (response.status !== 200) {
          console.log(`⚠️  Status ${response.status}, skipping...`);
          continue;
        }

        const $ = cheerio.load(response.data);

        // ✓ Sử dụng selector chính xác cho xe.chotot.com
        let listings = $('div.ads-card-grid');

        console.log(`✅ Tìm thấy ${listings.length} listings`);

        listings.each((index, element) => {
          try {
            const $card = $(element);

            // ✓ Title từ img alt attribute
            const imgAlt = $card.find('img').attr('alt') || '';
            const title = imgAlt.split('.')[0].trim(); // Lấy phần trước dấu .

            // ✓ Price từ p.price
            let priceText = $card.find('p.price').text().trim();
            if (!priceText) {
              // Fallback: tìm trong span
              priceText = $card.find('span').toArray()
                .map(s => $(s).text().trim())
                .find(t => /\d+[\.,\d]*\s*đ/.test(t)) || '0';
            }
            const price = parseInt(priceText.replace(/[^0-9]/g, '')) || 0;

            // ✓ URL từ a href
            const url = $card.find('a[href*=".htm"]').attr('href') || '';

            // ✓ Location từ spans
            let address = 'Chưa xác định';
            const locationSpan = $card.find('span.new-location').text().trim();
            if (locationSpan) {
              address = locationSpan;
            } else {
              // Fallback: lấy span không có class trước span.new-location
              const allSpans = $card.find('span');
              if (allSpans.length >= 5) {
                address = $(allSpans[4]).text().trim() || address;
              }
            }

            // ✓ Description từ alt text (có thêm chi tiết)
            const description = imgAlt || title;

            // ✓ Image URL từ img
            let image = $card.find('img').attr('src') || $card.find('img').attr('data-src') || '';

            // Thêm vào list nếu hợp lệ
            if (title && title.length >= 3 && price > 0) {
              allProducts.push({
                title: title.substring(0, 200),
                description: description.substring(0, 1000),
                price,
                address,
                images: image ? [image] : [],
                source: 'xechotot',
                url: url,
              });
              
              console.log(`  ✅ "${title.substring(0, 40)}..." - ${price.toLocaleString()} VND - ${address}`);
            }
          } catch (err) {
            console.error(`  ❌ Lỗi item ${index}:`, err.message);
          }
        });

        if (listings.length === 0 && page === 1) {
          console.log('\n⚠️  Không tìm thấy listings!');
          console.log('💡 Chotot có thể sử dụng JavaScript rendering');
          console.log('   Hãy thử: node scraper-chotot-puppeteer.js');
          return [];
        }

        console.log(`✅ Trang ${page}: Lấy được ${listings.length} listings`);

        // Rate limiting
        if (page < maxPages) {
          console.log(`⏰ Đợi 3 giây trước trang tiếp theo...`);
          await delay(3000);
        }

      } catch (error) {
        console.error(`❌ Lỗi trang ${page}:`, error.message);
      }
    }

    return allProducts;

  } catch (error) {
    console.error('❌ Lỗi chung:', error.message);
    return [];
  }
};

/**
 * Import vào MongoDB
 */
const importXeProducts = async (scrapedData) => {
  try {
    await connectDB();

    if (!scrapedData || scrapedData.length === 0) {
      console.log('⚠️  Không có dữ liệu để import');
      return;
    }

    console.log(`\n📤 Đang import ${scrapedData.length} xe...`);

    // Function to normalize Vietnamese characters to ASCII
    const normalizeSlug = (str) => {
      const vietnameseMap = {
        'à': 'a', 'á': 'a', 'ả': 'a', 'ã': 'a', 'ạ': 'a',
        'ă': 'a', 'ằ': 'a', 'ắ': 'a', 'ẳ': 'a', 'ẵ': 'a', 'ặ': 'a',
        'â': 'a', 'ầ': 'a', 'ấ': 'a', 'ẩ': 'a', 'ẫ': 'a', 'ậ': 'a',
        'đ': 'd',
        'è': 'e', 'é': 'e', 'ẻ': 'e', 'ẽ': 'e', 'ẹ': 'e',
        'ê': 'e', 'ề': 'e', 'ế': 'e', 'ể': 'e', 'ễ': 'e', 'ệ': 'e',
        'ì': 'i', 'í': 'i', 'ỉ': 'i', 'ĩ': 'i', 'ị': 'i',
        'ò': 'o', 'ó': 'o', 'ỏ': 'o', 'õ': 'o', 'ọ': 'o',
        'ô': 'o', 'ồ': 'o', 'ố': 'o', 'ổ': 'o', 'ỗ': 'o', 'ộ': 'o',
        'ơ': 'o', 'ờ': 'o', 'ớ': 'o', 'ở': 'o', 'ỡ': 'o', 'ợ': 'o',
        'ù': 'u', 'ú': 'u', 'ủ': 'u', 'ũ': 'u', 'ụ': 'u',
        'ư': 'u', 'ừ': 'u', 'ứ': 'u', 'ử': 'u', 'ữ': 'u', 'ự': 'u',
        'ỳ': 'y', 'ý': 'y', 'ỷ': 'y', 'ỹ': 'y', 'ỵ': 'y',
      };
      
      return str
        .toLowerCase()
        .split('')
        .map(c => vietnameseMap[c] || c)
        .join('')
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
    };

    // Tạo categories
    const categoryNames = ['Xe máy', 'Ô tô'];
    const categoryMap = {};

    for (const catName of categoryNames) {
      let category = await Category.findOne({ name: catName });
      if (!category) {
        category = await Category.create({
          name: catName,
          slug: normalizeSlug(catName),
          description: `Xe ${catName} từ Chotot.com`,
        });
      }
      categoryMap[catName] = category._id;
    }

    // Tạo seller
    let seller = await User.findOne({ username: 'xechotot_scraper' });
    if (!seller) {
      seller = await User.create({
        username: 'xechotot_scraper',
        email: 'xechotot-scraper@example.com',
        password: 'xechotot123456',
        fullName: 'Xe Chotot Scraper',
        balance: 0,
        isVerified: false,
      });
    }

    // Phân loại xe (đơn giản: dựa trên title)
    const productsToInsert = scrapedData.map(item => {
      let categoryId = categoryMap['Xe máy']; // Default category
      
      if (item.title.toLowerCase().includes('ô tô') || 
          item.title.toLowerCase().includes('car') ||
          item.title.match(/[0-9]{4}\s*(chỗ|seater)/)) {
        categoryId = categoryMap['Ô tô'];
      }

      const product = {
        title: item.title,
        description: item.description,
        price: Math.max(item.price, 0),
        category: categoryId,
        seller: seller._id,
        images: item.images && item.images.length > 0 ? item.images : ['https://via.placeholder.com/300x300?text=Vehicle'],
        address: item.address,
        status: 'Đang bán',
        condition: 'Bình thường',
        tags: [item.source || 'xechotot', 'scraped', 'vehicle'],
        views: 0,
        // Location: Sử dụng toạ độ mặc định của Hà Nội vì không có toạ độ thực từ scraper
        location: {
          type: 'Point',
          coordinates: [105.8581, 21.0285] // Hà Nội center [longitude, latitude]
        }
      };
      
      return product;
    });

    const inserted = await Product.insertMany(productsToInsert);

    console.log(`\n✅ Đã import ${inserted.length} xe từ Chotot`);
    
    // Thống kê
    const xeMay = inserted.filter(x => x.category === categoryMap['Xe máy']).length;
    const oto = inserted.filter(x => x.category === categoryMap['Ô tô']).length;
    
    console.log(`📊 Thống kê:
  - Xe máy: ${xeMay}
  - Ô tô: ${oto}
  - Seller: ${seller.username}
  - Categories: ${Object.keys(categoryMap).length}
    `);

    return inserted;

  } catch (error) {
    console.error('❌ Lỗi import:', error.message);
    throw error;
  }
};

/**
 * Main
 */
const main = async () => {
  try {
    console.log('🕷️  Xe.Chotot.com Scraper');
    console.log('='.repeat(50));

    // URL gốc từ danh mục xe
    const xeChototUrl = 'https://xe.chotot.com/';
    
    console.log(`\n🔗 Scraping từ: ${xeChototUrl}\n`);

    // Scrape 2 pages
    const scrapedData = await scrapeXeChotot(xeChototUrl, maxPages = 2);

    if (scrapedData && scrapedData.length > 0) {
      console.log(`\n✅ Lấy được ${scrapedData.length} xe`);
      await importXeProducts(scrapedData);
      console.log('\n✅ Hoàn thành!');
    } else {
      console.log('\n⚠️  Không lấy được dữ liệu');
      console.log('\n💡 Lý do có thể:');
      console.log('  1. Chotot sử dụng JavaScript rendering');
      console.log('  2. Có anti-bot protection');
      console.log('  3. HTML structure đã thay đổi');
      console.log('\n🔧 Hãy thử: npm install puppeteer && node scraper-chotot-puppeteer.js');
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

module.exports = { scrapeXeChotot, importXeProducts };
