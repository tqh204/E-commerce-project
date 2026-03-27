# 🕷️ Chotot.com Scraper - Hướng Dẫn Chi Tiết

## 📌 Giới thiệu

Chotot.com là trang web bán hàng cũ lớn ở Việt Nam. Scraper này giúp bạn lấy dữ liệu sản phẩm từ Chotot và import vào MongoDB.

---

## ⚖️ Lưu Ý Pháp Lý

**Kiểm tra trước khi scrape:**
- ✅ `robots.txt`: https://www.chotot.com/robots.txt
- ✅ `Terms of Service`: https://www.chotot.com/ (footer)

**Lỏi ở Chotot:**
- ❌ Không scrape quá nhanh (rate limiting >= 2s/request)
- ❌ Không lấy thông tin cá nhân
- ❌ Không republish data với quy mô lớn
- ✅ Dùng cho private/learning purposes

---

## 🛠️ Cài Đặt

### Step 1: Cài thư viện

```bash
npm install axios cheerio puppeteer
```

| Thư viện | Mục đích |
|---------|---------|
| **axios** | HTTP requests |
| **cheerio** | Parse HTML |
| **puppeteer** | Browser automation (cho JS rendering) |

### Step 2: Chọn phiên bản

- **`scraper-chotot.js`** - Dùng Cheerio (nhanh, nhẹ, nhưng có thể bị chặn)
- **`scraper-chotot-puppeteer.js`** - Dùng Puppeteer (chậm hơn nhưng xử lý JS)

---

## 🚀 Cách Chạy

### Option 1: HTML Scraping (Cheerio) - Nhanh
```bash
node scraper-chotot.js
```

**Ưu điểm:**
- ✅ Nhanh
- ✅ Ít resources
- ✅ Không cần trình duyệt

**Nhược điểm:**
- ❌ Có thể bị chặn
- ❌ Không handle JavaScript render

### Option 2: Browser Automation (Puppeteer) - An toàn
```bash
node scraper-chotot-puppeteer.js
```

**Ưu điểm:**
- ✅ Xử lý JavaScript
- ✅ Giống real browser
- ✅ Bypass anti-bot

**Nhược điểm:**
- ❌ Chậm hơn
- ❌ Dùng nhiều RAM

---

## 📊 Kết Quả

Khi chạy, bạn sẽ thấy:

```
🕷️  Chotot.com Scraper

==================================================
📄 Đang lấy trang 1 từ https://www.chotot.com/dien-thoai-may-tinh-bang...
✅ Trang 1: Lấy được 45 sản phẩm
✅ Lấy được 45 sản phẩm

📤 Đang import 45 sản phẩm...

✅ Đã import 45 sản phẩm từ Chotot

📊 Thống kê:
  - Tổng sản phẩm: 45
  - Categories: 1
  - Seller: chotot_scraper

✅ Hoàn thành!
```

**Dữ liệu sẽ được import vào:**
- Collection: `products`
- Category tự động tạo
- Seller: `chotot_scraper`

---

## 🔧 Tùy Chỉnh

### Thay đổi Categories Scrape

Mở `scraper-chotot.js` và chỉnh sửa:

```javascript
const chototCategories = [
  {
    url: 'https://www.chotot.com/dien-thoai-may-tinh-bang',
    name: 'Điện thoại & Máy tính',
  },
  {
    url: 'https://www.chotot.com/thoi-trang-giay-dep',
    name: 'Thời trang & Giày dép',
  },
];
```

### Danh Sách URL Categories Chotot

| Category | URL |
|----------|-----|
| Điện thoại & Máy tính | `https://www.chotot.com/dien-thoai-may-tinh-bang` |
| Thời trang & Giày dép | `https://www.chotot.com/thoi-trang-giay-dep` |
| Nội thất | `https://www.chotot.com/noi-that-dung-cu-nha-se` |
| Điện lạnh | `https://www.chotot.com/dien-lanh` |
| Tủ lạnh | `https://www.chotot.com/tu-lanh` |
| Xe máy | `https://www.chotot.com/xe-may` |
| Ô tô | `https://www.chotot.com/o-to` |

### Tăng/Giảm Số Trang

```javascript
// Scrape 1 page
await scrapeChototProducts(category.url, category.name, maxPages = 1);

// Scrape 5 pages
await scrapeChototProducts(category.url, category.name, maxPages = 5);
```

### Tuỳ chỉnh Delay

```javascript
// Hiện tại: 2 giây giữa mỗi page
await delay(2000); // Tăng để an toàn hơn: 5000, 10000

// Hoặc delay ngẫu nhiên:
const randomDelay = Math.random() * 5000 + 2000; // 2-7 giây
await delay(randomDelay);
```

---

## ⚠️ Lỗi Thường Gặp

### 1. "Không tìm thấy sản phẩm"

**Nguyên nhân:** Selectors cũ hoặc HTML thay đổi

**Giải pháp:**
```bash
# Mở DevTools (F12) trên Chotot
# Kiểm tra HTML structure -> update selectors
```

### 2. "403 Forbidden"

**Nguyên Nhân:** Chotot chặn requests

**Giải pháp:**
- Sử dụng Puppeteer thay vì Cheerio
- Thêm delay dài hơn giữa requests
- Dùng proxy nếu cần

### 3. "Lỗi kết nối MongoDB"

**Giải pháp:**
```bash
# Kiểm tra MongoDB đang chạy
mongod --version

# Hoặc dùng MongoDB Compass để verify kết nối
```

### 4. Puppeteer "TIMEOUT" hoặc "Crashed"

**Giải pháp:**
- Tăng timeout: `{ waitUntil: 'networkidle2', timeout: 60000 }`
- Giảm số pages scrape
- Dùng proxy để tránh rate limit

---

## 🔐 Best Practices

1. **Rate Limiting**
   ```javascript
   // Luôn thêm delay
   await delay(2000 + Math.random() * 3000);
   ```

2. **User-Agent Rotation**
   ```javascript
   // Khi scrape nhiều, rotate user agents
   const userAgents = [
     'Mozilla/5.0...',
     'Mozilla/5.0...',
   ];
   const ua = userAgents[Math.floor(Math.random() * userAgents.length)];
   ```

3. **Error Handling**
   ```javascript
   try {
     // scrape code
   } catch (err) {
     console.error('Lỗi:', err.message);
     // retry hoặc log
   }
   ```

4. **Log tiến trình**
   ```javascript
   console.log(`Page ${i}/${total}: ${products.length} items`);
   ```

---

## 📈 Scaling (Scrape lớn)

Nếu muốn scrape hàng ngàn sản phẩm:

1. **Dùng queue system** (Bull, RabbitMQ)
2. **Dùng multiple workers** (parallel scraping)
3. **Dùng proxy pool** (tránh IP ban)
4. **Cache data** (tránh re-scrape)
5. **Schedule tasks** (scrape periodic)

Example với Bull queue:
```javascript
const Queue = require('bull');
const scrapeQueue = new Queue('chotot-scrape');

scrapeQueue.process(async (job) => {
  return await scrapeChototProducts(job.data.url);
});

// Add jobs
scrapeQueue.add({ url: categoryUrl });
```

---

## ✅ Checklist Trước Scrape

- [ ] Kiểm tra robots.txt
- [ ] Kiểm tra ToS
- [ ] Test 1 page trước
- [ ] Set delay >= 2 giây
- [ ] Có error handling
- [ ] Có logging
- [ ] Kiểm tra proxy (nếu cần)
- [ ] Kiểm tra MongoDB kết nối

---

## 🆘 Cần Giúp?

```bash
# Kiểm tra selectors trên Chotot
# F12 -> Inspector -> Kiểm tra HTML

# Test scraper 1 page
# node scraper-chotot.js

# Nếu lỗi, try Puppeteer
# node scraper-chotot-puppeteer.js
```

---

**Last Updated:** March 19, 2024
