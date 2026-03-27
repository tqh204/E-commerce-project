const fs = require('fs');
const cheerio = require('cheerio');
const html = fs.readFileSync('debug-html.html', 'utf8');
const $ = cheerio.load(html);

console.log('=== CHOTOT PRODUCT CARDS - DETAILED ANALYSIS ===\n');

const cards = $('div.ads-card-grid');
console.log(`✓ Found ${cards.length} product cards\n`);

// Analyze first 2-3 cards
cards.slice(0, 3).each((idx, element) => {
  const $card = $(element);
  console.log(`\n──────────── PRODUCT ${idx + 1} ────────────`);
  
  // Get URL
  const $link = $card.find('a').first();
  const url = $link.attr('href');
  console.log(`URL: ${url}`);
  
  // Get title from img alt text
  const $img = $card.find('img').first();
  const imgAlt = $img.attr('alt') || '';
  // Alt usually has format: "Product Title. Mua bán [category] ở [location] được đăng bởi [seller]"
  const titleMatch = imgAlt.match(/^([^.]+)\./);
  const title = titleMatch ? titleMatch[1] : '';
  console.log(`Title: ${title}`);
  
  // Get all spans and their classes
  const $spans = $card.find('span');
  console.log(`\nFound ${$spans.length} spans:`);
  
  // Extract span data
  const spanData = [];
  $spans.each((i, span) => {
    const $span = $(span);
    const text = $span.text().trim();
    const className = $span.attr('class') || '';
    if (text) {
      console.log(`  span[${i}] class="${className}": "${text}"`);
      spanData.push({text, class: className});
    }
  });
  
  // Try to parse data from spans
  console.log('\nData extraction:');
  spanData.forEach((span, i) => {
    if (span.text.match(/\d+[\.,\d]*\s*đ/)) {
      console.log(`  → Price: ${span.text}`);
    }
    if (span.text.match(/giây|phút|ngày|giờ|trước/)) {
      console.log(`  → Posted: ${span.text}`);
    }
    if (span.text.match(/tay|số|côn|điện|xe máy|ô tô/i)) {
      console.log(`  → Type: ${span.text}`);
    }
    if (span.text.match(/Quận|Thành phố|Tỉnh|mới/i)) {
      console.log(`  → Location/Seller: ${span.text}`);
    }
    if (span.text.match(/\d{4}/)) {
      console.log(`  → Year/Number: ${span.text}`);
    }
  });
  
  // Get inner structure
  console.log('\nStructure:');
  const $innerDiv = $card.find('> div').first();
  const innerDivClass = $innerDiv.attr('class') || 'no-class';
  console.log(`  > div.${innerDivClass}`);
  
  const $innerLink = $innerDiv.find('a').first();
  console.log(`    > a (href, rel, target)`);
  console.log(`      > img (alt, lazy, data-nimg)`);
  
  const $innerSpanContainer = $card.find('> div').eq(1); // Second div often has metadata
  if ($innerSpanContainer.length > 0) {
    console.log(`    (and another div with ${$innerSpanContainer.find('span').length} spans)`);
  }
});

// Now create a selector test
console.log('\n\n✓ SELECTOR SUMMARY:');
console.log('  Main selector: div.ads-card-grid');
console.log('  URL: a[href*=".htm"] -> href attribute');
console.log('  Title: img -> alt attribute (first part)');
console.log('  Metadata: span elements (price, location, type, year, etc.)');
