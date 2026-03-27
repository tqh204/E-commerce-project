# 🕷️ Web Scraping Guide - E-commerce Data

## 🔧 Công Cụ Cần Cài Đặt

```bash
npm install axios cheerio puppeteer
```

| Thư viện | Mục đích | Ưu điểm | Nhược điểm |
|---------|---------|--------|----------|
| **axios** | HTTP requests | Đơn giản, nhanh | Chỉ lấy HTML tĩnh |
| **cheerio** | HTML parsing | Giống jQuery, dễ dùng | HTML tĩnh |
| **puppeteer** | Browser automation | Handle JavaScript, cookie | Chậm hơn, dùng nhiều RAM |

---

## 📚 4 Cách Scrape Data

### 1️⃣ HTML Scraping (Cheerio)
```javascript
const axios = require('axios');
const cheerio = require('cheerio');

const url = 'https://example.com/products';
const response = await axios.get(url);
const $ = cheerio.load(response.data);

$('div.product').each((i, el) => {
  const title = $(el).find('h2').text();
  const price = $(el).find('.price').text();
  console.log(title, price);
});
```

**Khi dùng:** Trang web có HTML tĩnh (không dùng JavaScript render)

---

### 2️⃣ Public API Scraping
```javascript
const response = await axios.get('https://api.example.com/products');
const data = response.data;
```

**Ưu điểm:** Nhanh, đáng tin cậy, pháp lý hơn

**Ví dụ public APIs:**
- JSONPlaceholder: https://jsonplaceholder.typicode.com/
- PokéAPI: https://pokeapi.co/
- OpenWeather: https://openweathermap.org/api
- REST Countries: https://restcountries.com/

---

### 3️⃣ Website Thực Tế - Shopee

```javascript
const url = `https://shopee.vn/api/v2/search_items?by=relevancy&keyword=${keyword}&limit=20`;
const response = await axios.get(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0...'
  }
});
```

**Cần lưu ý:**
- ✅ Kiểm tra robots.txt: https://shopee.vn/robots.txt
- ✅ Không scrape quá nhanh (dùng delay)
- ✅ Tôn trọng rate limits

---

### 4️⃣ JavaScript-Heavy Sites (Puppeteer)
```javascript
const puppeteer = require('puppeteer');

const browser = await puppeteer.launch();
const page = await browser.newPage();
await page.goto('https://example.com');
const data = await page.evaluate(() => {
  return document.querySelectorAll('.product');
});
await browser.close();
```

**Khi dùng:** Trang web render động bằng JavaScript (React, Vue, Angular)

---

## 🛠️ Chạy Scraper

```bash
# Scrape từ Shopee
node scraper.js

# Hoặc từ file của bạn khác
node -e "const scraper = require('./scraper'); scraper.scrapeShopee('iphone');"
```

---

## ⚖️ Ethical Scraping Guidelines

### ✅ Làm theo những điều này:
- ✅ Kiểm tra `robots.txt` của website
- ✅ Đọc `Terms of Service`
- ✅ Thêm delay giữa requests (rate limiting)
- ✅ Dùng User-Agent hợp lệ
- ✅ Tôn trọng copyright của data
- ✅ Sử dụng official API nếu có
- ✅ Fetch từ public data sources

### ❌ Không làm những điều này:
- ❌ Không spam requests
- ❌ Không lấy dữ liệu cá nhân
- ❌ Không bypass authentication
- ❌ Không vi phạm ToS
- ❌ Không tái bán dữ liệu scraped
- ❌ Không impersonate người khác

---

## 🌐 Các Trang Có Thể Scrape Hợp Pháp

### E-commerce
- ✅ **Shopee API** (có public API)
- ✅ **Lazada** (có API partners)
- ✅ **Amazon** (product data, cần kiểm tra ToS)
- ✅ **eBay** (có official API)

### Free Public Data
- ✅ **GitHub** (public repos data)
- ✅ **Hacker News** (official API)
- ✅ **Twitter/X** (official API)
- ✅ **Reddit** (Official API)
- ✅ **Wikipedia** (public data)

### Price & Product Data
- ✅ **CheapShark** (game prices API)
- ✅ **Open Food Facts** (product database)
- ✅ **Realtor.com** (có API)

---

## 📊 Ví Dụ: Rate Limiting

```javascript
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

for (let i = 0; i < urls.length; i++) {
  const data = await scrapeUrl(urls[i]);
  await delay(2000); // 2 giây giữa mỗi request
}
```

---

## 🔐 Scrape an toàn với Proxies

```javascript
const axios = require('axios');

const instance = axios.create({
  httpAgent: new HttpProxyAgent('http://proxy:8080'),
  httpsAgent: new HttpsProxyAgent('http://proxy:8080'),
});

const response = await instance.get(url);
```

---

## 📝 Lưu Dữ liệu

```javascript
// Sau khi scrape, import vào MongoDB
const products = await scrapedData.map(item => ({
  title: item.title,
  price: item.price,
  description: item.description,
  images: item.images,
  // ...
}));

await Product.insertMany(products);
```

---

## ⚠️ Lỗi Thường Gặp

| Lỗi | Nguyên Nhân | Giải Pháp |
|-----|-----------|----------|
| **403 Forbidden** | Website chặn requests | Dùng User-Agent, proxy, hoặc puppeteer |
| **429 Too Many Requests** | Quá nhiều requests | Thêm delay, rate limiting |
| **CloudFlare/WAF** | Bot detection | Dùng puppeteer hoặc API chính thức |
| **IP bị ban** | Scrape quá nhanh | Dùng proxy, rate limiting |
| **Dynamic content** | JavaScript render | Dùng puppeteer |

---

## 🚀 Best Practices

1. **Dùng Official API khi có** - luôn tốt nhất
2. **Thêm User-Agent hợp lệ** - giả lập real browser
3. **Rate limiting** - tôn trọng server
4. **Error handling** - try-catch, retry logic
5. **Data validation** - kiểm tra dữ liệu scraped
6. **Logging** - ghi lại tiến trình
7. **Backup** - lưu raw data trước khi process

---

## 📚 Tài liệu Tham Khảo

- Axios: https://axios-http.com/
- Cheerio: https://cheerio.js.org/
- Puppeteer: https://pptr.dev/
- robots.txt standard: https://www.robotstxt.org/
- Web scraping ethics: https://en.wikipedia.org/wiki/Web_scraping#Legal_issues

---

**Gợi ý:** Để an toàn và hợp pháp, nên dùng **official APIs** hoặc **public datasets** thay vì scraping trực tiếp!
