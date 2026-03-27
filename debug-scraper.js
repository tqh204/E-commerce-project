/**
 * Debug Scraper - Kiểm tra HTML structure của Xe.Chotot.com
 * Dùng để xem selectors thực tế
 */

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const getHeaders = () => ({
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'vi-VN,vi;q=0.9',
  'Referer': 'https://google.com',
});

const debugScrape = async () => {
  try {
    console.log('🔍 Debug Mode - Checking Xe.Chotot.com Structure\n');
    
    const url = 'https://xe.chotot.com/?page=1';
    console.log(`📥 Fetching: ${url}\n`);
    
    const response = await axios.get(url, {
      headers: getHeaders(),
      timeout: 15000,
    });
    
    console.log(`✅ Status: ${response.status}`);
    console.log(`📏 HTML size: ${response.data.length} bytes\n`);
    
    // Load với Cheerio
    const $ = cheerio.load(response.data);
    
    // ===== TEST SELECTORS =====
    console.log('🔎 Testing Selectors:\n');
    
    // Test 1: [data-listing-id]
    let count = $('[data-listing-id]').length;
    console.log(`1. [data-listing-id]: ${count} items`);
    
    // Test 2: [id^="listing_item_"]
    count = $('[id^="listing_item_"]').length;
    console.log(`2. [id^="listing_item_"]: ${count} items`);
    
    // Test 3: .listing-item
    count = $('div.listing-item').length;
    console.log(`3. div.listing-item: ${count} items`);
    
    // Test 4: article
    count = $('article').length;
    console.log(`4. article: ${count} items`);
    
    // Test 5: li
    count = $('li').length;
    console.log(`5. li: ${count} items`);
    
    // Test 6: a[href*="/ve-"]
    count = $('a[href*="/ve-"]').length;
    console.log(`6. a[href*="/ve-"]: ${count} items`);
    
    // Test 7: .product-item
    count = $('.product-item').length;
    console.log(`7. .product-item: ${count} items`);
    
    // Test 8: [class*="item"]
    count = $('[class*="item"]').length;
    console.log(`8. [class*="item"]: ${count} items`);
    
    console.log('\n---\n');
    
    // ===== ANALYZE STRUCTURE =====
    console.log('📊 HTML Structure Analysis:\n');
    
    // Tìm tags chính
    const tags = {};
    $('*').each((i, el) => {
      const tag = el.name;
      tags[tag] = (tags[tag] || 0) + 1;
    });
    
    // Sort theo số lượng
    const sorted = Object.entries(tags)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15);
    
    console.log('Top 15 tags:');
    sorted.forEach(([tag, count]) => {
      console.log(`  ${tag}: ${count}`);
    });
    
    console.log('\n---\n');
    
    // ===== FIND LINKS =====
    console.log('🔗 Links found:\n');
    
    let linkCount = 0;
    $('a').each((i, el) => {
      if (linkCount < 10) {
        const href = $(el).attr('href');
        const text = $(el).text().substring(0, 50);
        if (href && text) {
          console.log(`  ${linkCount + 1}. ${text} -> ${href}`);
          linkCount++;
        }
      }
    });
    
    console.log('\n---\n');
    
    // ===== FIND TEXT CONTENT =====
    console.log('📝 Sample Text Content:\n');
    
    const texts = [];
    $('*').each((i, el) => {
      const text = $(el).text().trim();
      if (text && text.length > 20 && text.length < 100 && !text.includes('\n')) {
        texts.push(text);
      }
    });
    
    const uniqueTexts = [...new Set(texts)].slice(0, 10);
    uniqueTexts.forEach((text, i) => {
      console.log(`  ${i + 1}. ${text}`);
    });
    
    console.log('\n---\n');
    
    // ===== SAVE HTML =====
    const htmlPath = path.join(__dirname, 'debug-html.html');
    fs.writeFileSync(htmlPath, response.data);
    console.log(`💾 HTML lưu tại: ${htmlPath}`);
    console.log('📖 Mở file này trong browser để inspect element\n');
    
    // ===== CHECK FOR KEYWORDS =====
    console.log('🔍 Keyword Search:\n');
    
    const keywords = ['price', 'product', 'listing', 'item', 'title', 'name', 'giá', 'xe'];
    keywords.forEach(kw => {
      const regex = new RegExp(kw, 'gi');
      const matches = (response.data.match(regex) || []).length;
      console.log(`  "${kw}": ${matches} occurrences`);
    });
    
    console.log('\n---\n');
    
    // ===== RECOMMENDATIONS =====
    console.log('💡 Recommendations:\n');
    
    if ($('[data-listing-id]').length > 0) {
      console.log('  ✅ Use: $("[data-listing-id]")');
    }
    if ($('a[href*="/ve-"]').length > 0) {
      console.log('  ✅ Use: $("a[href*=\\"/ve-\\"]")');
    }
    if ($('li').length > $('div').length / 2) {
      console.log('  ✅ Consider using: $("li")');
    }
    
    console.log('\n  ⚠️  If 0 items found: Website likely uses JavaScript rendering');
    console.log('     → Try with Puppeteer instead\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
};

debugScrape();
