const fs = require('fs');
const cheerio = require('cheerio');
const html = fs.readFileSync('debug-html.html', 'utf8');
const $ = cheerio.load(html);

console.log('=== FINDING PRICE LOCATION ===\n');

const cards = $('div.ads-card-grid');
const firstCard = cards.first();

console.log('First card HTML (full, prettified):');
let cardHtml = firstCard.html();

// Try to find where "đ" or "triệu" appears
const priceIndex = cardHtml.indexOf('000.000');
if (priceIndex > -1) {
  console.log('Found price at index:', priceIndex);
  console.log('Context:');
  console.log(cardHtml.substring(priceIndex - 100, priceIndex + 100));
}

// Let's check all text nodes
console.log('\n\n=== ALL ELEMENTS IN FIRST CARD ===');
console.log('This card structure:');

function printStructure(selector, depth = 0) {
  const indent = '  '.repeat(depth);
  $(selector).each((i, el) => {
    const $el = $(el);
    const tag = el.tagName.toLowerCase();
    const className = $el.attr('class') || '';
    const text = $el.contents().filter(function() { return this.type === 'text'; }).text().trim();
    
    if (text && text.length < 60) {
      console.log(`${indent}<${tag} class="${className}">: "${text}"`);
    } else if (text && text.length > 0) {
      console.log(`${indent}<${tag} class="${className}">: "${text.substring(0, 40)}..."`);
    } else {
      console.log(`${indent}<${tag} class="${className}">`);
    }
    
    if (depth < 4) {
      printStructure($el.children(), depth + 1);
    }
  });
}

// Get card structure
console.log('Full structure of first card:');
const $div1 = firstCard.find('> div').first();
const $div2 = firstCard.find('> div').eq(1);

console.log('\nFirst inner div - image wrapper:');
console.log('Spans inside:', $div1.find('span').length);

console.log('\nSecond inner div - metadata:');
console.log('Spans inside:', $div2.find('span').length);
$div2.find('span').each((i, span) => {
  console.log(`  span[${i}]: "${$(span).text()}"`);
});

// Maybe price is in a separate text node
console.log('\n\nPhrase "đ" locations in full card text:');
const fullText = firstCard.text();
const matches = fullText.match(/[\d\.,]+\s*đ/g);
if (matches) {
  console.log('Prices found:', matches);
} else {
  console.log('No price "đ" found in text');
}

// Check if we're missing something with the second div's children
console.log('\n\nDirect children of second div:');
$div2.children().each((i, child) => {
  console.log(`Child ${i}: <${child.tagName}>`);
  console.log('  Text:', $(child).text());
  console.log('  HTML:', $(child).html().substring(0, 100));
});
