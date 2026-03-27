# 🚗 Xe.Chotot.com Scraper - Hướng Dẫn Nhanh

## 📌 Giới thiệu

Scraper này dùng để lấy dữ liệu xe máy & ô tô từ **xe.chotot.com** và import vào MongoDB.

URL source: https://xe.chotot.com/

---

## 🚀 Chạy Nhanh

### Option 1: Cheerio (Nhanh - khuyến khích thử trước)
```bash
node scraper-xe-chotot.js
```

### Option 2: Puppeteer (Nếu Option 1 không được)
```bash
npm install puppeteer
node scraper-chotot-puppeteer.js
```

---

## 📊 Kỳ Vọng Output

```
🕷️  Xe.Chotot.com Scraper
==================================================

🔗 Scraping từ: https://xe.chotot.com/

📄 Đang lấy trang 1...
🔗 URL: https://xe.chotot.com/?page=1
✅ Tìm thấy 45 listings
  ✅ "Honda SH Mode 2024 đỏ biển số..."  - 35,000,000 VND
  ✅ "Yamaha Exciter 155 2023 xanh..."  - 28,500,000 VND
  ✅ "Toyota Vios 2022 bạc số tự..."  - 525,000,000 VND
✅ Trang 1: Lấy được 45 listings
⏰ Đợi 3 giây trước trang tiếp theo...

📄 Đang lấy trang 2...
✅ Tìm thấy 42 listings
...

✅ Lấy được 87 xe

📤 Đang import 87 xe...

✅ Đã import 87 xe từ Chotot
📊 Thống kê:
  - Xe máy: 65
  - Ô tô: 22
  - Seller: xechotot_scraper
  - Categories: 2

✅ Hoàn thành!
```

---

## 🔧 Tùy Chỉnh

### Thay đổi số pages

Mở `scraper-xe-chotot.js`:

```javascript
// Từ
const scrapedData = await scrapeXeChotot(xeChototUrl, maxPages = 2);

// Thành
const scrapedData = await scrapeXeChotot(xeChototUrl, maxPages = 5);
```

### Thay đổi URL

```javascript
// Nếu muốn scrape category cụ thể
const xeChototUrl = 'https://xe.chotot.com/?sq=xe-may'; // Chỉ xe máy
const xeChototUrl = 'https://xe.chotot.com/?sq=o-to';   // Chỉ ô tô
```

### Tuỳ chỉnh Delay

```javascript
// Hiện tại: 3 giây giữa pages
await delay(3000);

// Tăng nếu bị chặn:
await delay(5000); // 5 giây
// hoặc
await delay(10000 + Math.random() * 5000); // 10-15 giây
```

---

## 📝 MongoDB Collections

Dữ liệu sẽ được lưu vào:

| Collection | Dữ liệu |
|-----------|--------|
| **products** | Dữ liệu xe (titles, giá, description, etc.) |
| **categories** | "Xe máy", "Ô tô" |
| **users** | User "xechotot_scraper" |

### Sample Document
```javascript
{
  "_id": ObjectId("..."),
  "title": "Honda SH Mode 2024 đỏ biển số 79",
  "description": "Xe mới 98%, chạy 2.000km, giấy tờ đầy đủ",
  "price": 35000000,
  "category": ObjectId("..."), // Xe máy
  "seller": ObjectId("..."),    // xechotot_scraper
  "images": ["https://..."],
  "address": "TP.HCM",
  "status": "Đang bán",
  "condition": "Như mới",
  "tags": ["xechotot", "scraped", "vehicle"],
  "views": 0,
  "createdAt": ISODate("2024-03-19T..."),
  "updatedAt": ISODate("2024-03-19T...")
}
```

---

## ⚠️ Lỗi & Giải Pháp

### Lỗi 1: "Không tìm thấy listings"

**Nguyên nhân:** HTML structure khác hoặc JavaScript rendering

**Giải pháp:**
```bash
npm install puppeteer
node scraper-chotot-puppeteer.js
```

### Lỗi 2: "403 Forbidden"

**Nguyên nhân:** Chotot chặn requests

**Giải pháp:**
- Dùng Puppeteer (giả lập real browser)
- Hoặc tăng delay: `await delay(5000 + Math.random() * 5000);`
- Hoặc dùng proxy

### Lỗi 3: "MongoDB Connection Error"

**Giải pháp:**
```bash
# Kiểm tra MongoDB chạy
mongod

# Hoặc kiểm tra URL kết nối
# Mở config/database.js để verify
```

### Lỗi 4: "TIMEOUT"

**Giải pháp:**
- Giảm số pages
- Tăng timeout: `timeout: 30000` (thay vì 15000)

---

## ⚖️ Lưu Ý Pháp Lý & Ethical

✅ **Làm:**
- Kiểm tra robots.txt
- Thêm delay >= 2 giây
- Dùng cho private/learning
- Tôn trọng rate limits

❌ **Không làm:**
- Spam requests
- Lấy info cá nhân
- Republish quy mô lớn
- Bypass authentication

---

## 📂 Files Liên Quan

| File | Mục đích |
|------|---------|
| `scraper-xe-chotot.js` | Scraper HTML cho xe |
| `scraper-chotot-puppeteer.js` | Scraper Puppeteer (backup) |
| `scraper-chotot.js` | Scraper cho categories khác |
| `config/database.js` | MongoDB connection |
| `schemas/Product.js` | Product schema |

---

## 🔍 Debugging

### Xem HTML structure
```bash
# Mở browser
https://xe.chotot.com/

# F12 -> Inspector
# Kiểm tra class, id của elements
```

### Test 1 page
```bash
node scraper-xe-chotot.js
# Nếu OK, tăng pages
# Nếu lỗi, dùng Puppeteer
```

### Xem MongoDB data
```bash
# Option 1: MongoDB Compass
# Mở: e-commerce-project -> products

# Option 2: Mongosh
mongosh
> db.products.find().limit(5)
> db.products.countDocuments()
```

---

## 📊 So Sánh Hai Phương Pháp

| Tiêu chí | Cheerio | Puppeteer |
|---------|--------|-----------|
| Tốc độ | ⚡ Nhanh | 🐢 Chậm |
| Xử lý JS | ❌ Không | ✅ Có |
| RAM | 💾 Ít | 💾💾 Nhiều |
| Khó dùng | ✅ Dễ | ❌ Khó |
| Anti-bot | ❌ Dễ bị | ✅ Tốt |

**Khuyến khích:** Thử Cheerio trước → Nếu fail thì dùng Puppeteer

---

## 🚀 Scaling (Scrape lớn)

Nếu muốn scrape hàng ngàn xe:

```bash
# 1. Cài Bull queue
npm install bull redis

# 2. Viết queue job
# 3. Run multiple workers
# 4. Schedule tasks
```

---

## 📞 Cần Giúp?

1. **Kiểm tra logs** - Xem error message cụ thể
2. **Test HTML** - F12 trên Chotot để check selectors
3. **Thử Puppeteer** - Nếu Cheerio không được
4. **Rate limiting** - Tăng delay giữa requests

---

**Last Updated:** March 19, 2024
**Status:** ✅ Ready to use
