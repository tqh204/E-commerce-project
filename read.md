# E-commerce Project Progress

## Tong quan

Du an da duoc nang cap tu Express CRUD co ban thanh bo khung marketplace theo huong Chotot + eBay, dung MongoDB/Mongoose lam database trung tam.

## Database va schema da lam

- Thiet ke va tao bo schema marketplace mo rong trong `schemas/`.
- Hien co 16 model:
  - `Role`
  - `User`
  - `RefreshToken`
  - `Address`
  - `Category`
  - `Media`
  - `ImportBatch`
  - `Product`
  - `Auction`
  - `Bid`
  - `Order`
  - `OrderItem`
  - `EscrowTransaction`
  - `Conversation`
  - `Message`
  - `Review`
- Ho tro cac chuc nang:
  - CRUD
  - authen
  - autho
  - upload media
  - auction
  - escrow
  - tim kiem theo vi tri
  - import du lieu tu Chotot

## Backend/API da lam

- Cap nhat `app.js` thanh API marketplace day du.
- Da tao cac route:
  - `/api/auth`
  - `/api/users`
  - `/api/addresses`
  - `/api/categories`
  - `/api/products`
  - `/api/orders`
  - `/api/auctions`
  - `/api/conversations`
  - `/api/uploads`
  - `/api/imports`
- Da tao controller cho:
  - auth
  - user
  - address
  - category
  - product
  - order
  - auction
  - conversation/message
  - upload
  - import

## Auth va phan quyen

- Da lam auth bang token ky boi `crypto`.
- Da co:
  - dang ky
  - dang nhap
  - refresh token
  - dang xuat
  - lay thong tin user hien tai
- Da co middleware:
  - `requireAuth`
  - `optionalAuth`
  - `requireAnyRole`
- Da ho tro role:
  - `admin`
  - `seller`
  - `buyer`
  - `moderator`

## Upload

- Da co upload media theo 2 huong:
  - upload base64 vao `public/uploads`
  - dang ky media tu URL remote
- Da luu metadata upload trong collection `media`.

## Seed data

- Da viet script seed moi: `seed-marketplace.js`.
- Seed hien tai theo kieu `upsert`, khong xoa du lieu cu.
- Da tao san du lieu nen cho:
  - role
  - user
  - address
  - category
  - product
  - media
  - auction
  - bid
  - order
  - order item
  - escrow transaction
  - conversation
  - message
  - review
  - import batch

## Import du lieu tu Chotot

- Da viet lai luong import trong:
  - `lib/chototImport.js`
  - `scraper-chotot.js`
- Da chuyen import sang kieu `upsert`, tranh tao trung ban ghi.
- Da tao batch log trong collection `import_batches`.
- Da sua parser de doc duoc markup live cua `xe.chotot.com` voi selector `div.ads-card-grid`.
- Da sua schema `Product` de tranh loi GeoJSON khi import listing khong co toa do.

## Ket qua da chay thanh cong

- Da load app thanh cong.
- Da chay `seed-marketplace.js` thanh cong.
- Da chay import live tu `xe.chotot.com` thanh cong.
- So lieu sau khi chay:
  - `total products`: 18
  - `source = chotot`: 16
  - `source = manual`: 2
- Batch import live thanh cong gan nhat:
  - `totalFetched`: 15
  - `totalInserted`: 15
  - `totalUpdated`: 0
  - `totalFailed`: 0

## Cong nghe dang su dung

- Node.js
- Express
- MongoDB
- Mongoose
- Axios
- Cheerio
- Morgan
- cookie-parser
- crypto cua Node.js

## Cong nghe dac biet/noi bat trong du an

- Marketplace schema mo rong
- Auction flow
- Escrow flow
- GeoJSON/2dsphere cho location
- Media upload
- Import batch logging
- Web scraping tu Chotot
- Upsert seed/import pipeline

## File/chuc nang quan trong

- `app.js`
- `config/database.js`
- `schemas/`
- `controllers/`
- `routes/`
- `middleware/auth.js`
- `lib/auth.js`
- `lib/http.js`
- `lib/chototImport.js`
- `seed-marketplace.js`
- `scraper-chotot.js`

## Viec co the lam tiep

- Them upload multipart bang `multer`
- Them endpoint CRUD cho review/media/import chi tiet hon
- Lam sach title/data import tu Chotot
- Bo sung filter/search nang cao
- Them frontend/admin dashboard
- Them websocket cho chat va auction realtime
