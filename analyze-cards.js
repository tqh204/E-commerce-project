const fs = require('fs');
const cheerio = require('cheerio');
const html = fs.readFileSync('debug-html.html', 'utf8');
const $ = cheerio.load(html);

console.log('=== PRODUCT LISTINGS STRUCTURE ===\n');

const cards = $('div.ads-card-grid');
console.log(`Found ${cards.length} product cards\n`);

// Analyze first 2 cards in detail
cards.slice(0, 2).each((idx, element) => {
  const $card = $(element);
  console.log(`\n════════ PRODUCT #${idx + 1} ════════`);
  
  // Get all text to understand structure
  const fullText = $card.text();
  console.log('Full text:', fullText);
  
  // Look for key elements
  const $link = $card.find('a[href*=".htm"]').first();
  const url = $link.attr('href');
  console.log('\nURL:', url);
  
  // Try to extract structured data
  const lines = fullText.split(/\n+/).filter(l => l.trim());
  console.log('\nText lines:');
  lines.forEach((line, i) => {
    if (line.trim()) console.log(`  [${i}] ${line.trim()}`);
  });
  
  // Look for price
  const priceMatch = fullText.match(/(\d+[\.,\d]*)\s*đ/);
  if (priceMatch) console.log('\nPrice extracted:', priceMatch[1], 'đ');
  
  // Look for location
  const locationMatch = fullText.match(/Quận|Thành phố|Tỉnh/, 'i');
  if (locationMatch) console.log('Has location keyword');
  
  // Check internal structure
  console.log('\nChild divs:', $card.find('> div').length);
  console.log('Images:', $card.find('img').length);
  console.log('Spans:', $card.find('span').length);
  
  // HTML snippet
  const html = $card.html();
  if (html.length > 1000) {
    console.log('\nHTML (first 800 chars):');
    console.log(html.substring(0, 800));
  } else {
    console.log('\nFull HTML:');
    console.log(html);
  }
});
