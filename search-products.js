const fs = require('fs');
const cheerio = require('cheerio');
const html = fs.readFileSync('debug-html.html', 'utf8');
const $ = cheerio.load(html);

// Let's look for actual product listings - they should have price, title, image
// Search for elements containing both price symbols and vehicle-related text

console.log('=== Searching for ACTUAL product listings ===\n');

// First, let's see what the main content structure looks like
const main = $('main');
console.log('Found <main>:', main.length > 0 ? 'yes' : 'no');

const articles = $('article');
console.log('Found <article>:', articles.length);

const sections = $('section');
console.log('Found <section>:', sections.length);

// Look for elements with specific patterns
const withPrice = $('*:contains("triệu")');
console.log('Elements containing "triệu" (million):', withPrice.length);

// Let's look for listing containers by class
const divElements = $('div[class*="listing"], div[class*="item"], div[class*="card"], div[class*="product"]');
console.log('\nFound divs with listing/item/card/product classes:', divElements.length);

if (divElements.length > 0) {
  console.log('\nFirst 3 listings structure:');
  divElements.slice(0, 3).each((idx, el) => {
    const $el = $(el);
    const className = $el.attr('class');
    const text = $el.text().substring(0, 150);
    const html = $el.html().substring(0, 200);
    
    console.log(`\n[Div #${idx}]`);
    console.log(`Class: ${className}`);
    console.log(`Text: ${text}...`);
    console.log(`HTML snippet: ${html}...`);
  });
}

// Try to find by looking for price patterns
console.log('\n\n=== Searching by price pattern ===');
const priceRegex = /\d+[\.,\d]*\s*(?:triệu|đ)/i;
const allText = $('body').text();
const prices = allText.match(/\d+[\.,\d]*\s*(?:triệu|đ)/gi);
if (prices && prices.length > 0) {
  console.log(`Found ${prices.length} price matches`);
  console.log('Sample prices:', prices.slice(0, 5).join(', '));
}

// Let's search for any <div> with style or data attributes that might contain listings
const divWithData = $('div[data-testid], div[data-id], div[id*="listing"], div[id*="item"]');
console.log('\nDivs with data attributes or listing IDs:', divWithData.length);

// Alternative: look at page structure
console.log('\n=== HTML Document Structure ===');
const body = $('body');
console.log('Body direct children count:', body.children().length);
console.log('Body direct children tags:', body.children().map((i, e) => e.tagName).slice(0, 10).join(', '));

// Let's look specifically for the main content area
const mainContent = $('[role="main"], [class*="content"], [class*="main"]');
console.log('\nMain content containers:', mainContent.length);
if (mainContent.length > 0) {
  const text = $(mainContent[0]).text().substring(0, 500);
  console.log('First main container text:', text);
}
