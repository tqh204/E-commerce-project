const fs = require('fs');
const cheerio = require('cheerio');
const html = fs.readFileSync('debug-html.html', 'utf8');
const $ = cheerio.load(html);

const liElements = $('li');
console.log('Total <li> elements:', liElements.length);
console.log('\n=== Looking for product listings in LI ===\n');

// Find LI elements that contain product information
let productCount = 0;
liElements.each((idx, element) => {
  if (productCount >= 5) return;
  
  const $li = $(element);
  const liText = $li.text();
  
  // Check if this looks like a product (contains price symbol "đ" or common keywords)
  if (liText.includes('đ') && liText.length > 50) {
    productCount++;
    console.log(`\n===== LI #${idx} (Product ${productCount}) =====`);
    console.log('Full text:', liText.substring(0, 300));
    console.log('\nHTML structure (first 500 chars):');
    let htmlStr = $li.html();
    if (htmlStr.length > 500) {
      console.log(htmlStr.substring(0, 500));
      console.log('...[truncated]...');
    } else {
      console.log(htmlStr);
    }
    
    // Try to extract common fields
    console.log('\nDirect children of <li>:');
    $li.children().each((i, child) => {
      const tagName = child.tagName;
      const text = $(child).text().substring(0, 80);
      console.log(`  ${i}. <${tagName}>: ${text}...`);
    });
    
    // Look for specific patterns
    const $anchors = $li.find('a');
    console.log(`\nAnchors found: ${$anchors.length}`);
    $anchors.each((i, a) => {
      const href = $(a).attr('href') || '';
      const text = $(a).text().substring(0, 60);
      if (href || text) console.log(`  a[${i}]: href="${href}" text="${text}"`);
    });
    
    // Look for price pattern
    const priceMatch = liText.match(/(\d+[\.,\d]+)\s*đ/);
    if (priceMatch) {
      console.log(`\nPrice found: ${priceMatch[1]} đ`);
    }
  }
});

console.log(`\n\nTotal meaningful products found: ${productCount}`);
