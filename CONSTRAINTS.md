# 📋 MongoDB Schema Constraints Documentation

## 👤 User Schema

| Trường | Ràng buộc | Mô tả |
|--------|----------|-------|
| **username** | unique, trim, 3-30 ký tự, pattern | Chỉ chữ, số, gạch ngang, gạch dưới |
| **email** | unique, lowercase, regex | Email hợp lệ với format |
| **password** | minlength 6, maxlength 128, select:false | Bị ẩn trong query mặc định |
| **fullName** | required, 2-100 ký tự | Tên tối thiểu 2 ký tự |
| **phone** | optional, regex | Số ĐT Việt Nam: +84 hoặc 0 |
| **address** | optional, maxlength 500 | Địa chỉ nhà ở |
| **balance** | default 0, min 0 | Ví ảo (virtual wallet) |
| **rating** | default 0, 0-5 | Đánh giá bán hàng |
| **totalSold** | default 0, min 0 | Đếm sản phẩm đã bán |
| **totalBought** | default 0, min 0 | Đếm sản phẩm đã mua |
| **isActive** | default true | Trạng thái tài khoản |
| **isVerified** | default false | Xác minh email |

---

## 🏷️ Category Schema

| Trường | Ràng buộc | Mô tả |
|--------|----------|-------|
| **name** | unique, 2-100 ký tự | Tên danh mục |
| **description** | optional, maxlength 1000 | Mô tả chi tiết |
| **slug** | unique, lowercase, pattern | Slug URL: [a-z0-9-]+ |
| **icon** | optional | Font Awesome hoặc icon URL |
| **image** | optional | Hình ảnh đại diện |
| **parentCategory** | optional, ref | Danh mục cha (đối với subcategories) |
| **order** | default 0, min 0 | Thứ tự hiển thị |
| **isActive** | default true | Kích hoạt danh mục |

---

## 📦 Product Schema

| Trường | Ràng buộc | Mô tả |
|--------|----------|-------|
| **title** | required, 5-200 ký tự | Tiêu đề sản phẩm |
| **description** | required, 10-5000 ký tự | Mô tả chi tiết |
| **price** | required, 0-1,000,000,000 | Giá bán |
| **category** | required, ref | Liên kết đến Category |
| **seller** | required, ref | Liên kết đến User |
| **images** | required, 1-10 items | Tối thiểu 1, tối đa 10 ảnh |
| **thumbnailImage** | optional | Ảnh đại diện |
| **location** | GeoJSON Point, 2dsphere | Tọa độ: [longitude, latitude] |
| **coordinates** | validate | Lng: -180 đến 180, Lat: -90 đến 90 |
| **address** | optional, maxlength 500 | Địa chỉ cụ thể |
| **status** | enum | Đang bán, Đã bán, Ẩn, Duyệt |
| **condition** | enum | Như mới, Tốt, Bình thường, Có lỗi |
| **views** | default 0, min 0 | Lượt xem |
| **likes** | array ref | Danh sách người thích |
| **tags** | 0-10 items, 1-30 ký tự | Gắn thẻ sản phẩm |

---

## 💬 Conversation Schema

| Trường | Ràng buộc | Mô tả |
|--------|----------|-------|
| **participants** | required, min 2 | Ít nhất 2 người tham gia |
| **product** | optional, ref | Sản phẩm liên quan |
| **subject** | optional, maxlength 200 | Tiêu đề cuộc hội thoại |
| **lastMessage** | optional, maxlength 1000 | Tin nhắn cuối cùng |
| **lastMessageAt** | default Date.now | Thời gian tin nhắn cuối |
| **lastMessageBy** | optional, ref | Người gửi tin nhắn cuối |
| **isActive** | default true | Trạng thái hội thoại |
| **readBy** | array | Danh sách người đã đọc |

---

## 💌 Message Schema

| Trường | Ràng buộc | Mô tả |
|--------|----------|-------|
| **conversation** | required, ref | Liên kết đến Conversation |
| **sender** | required, ref | Người gửi (User) |
| **content** | required, 1-5000 ký tự | Nội dung tin nhắn |
| **attachments** | optional, max 5 items | File đính kèm (URLs) |
| **status** | enum | Đang gửi, Đã gửi, Đã xem |
| **readBy** | array | Danh sách người đã đọc |
| **replyTo** | optional, ref | Trả lời tin nhắn nào |

---

## 🛒 Order Schema

| Trường | Ràng buộc | Mô tả |
|--------|----------|-------|
| **orderNumber** | unique, auto-generate | Mã đơn: ORD-{timestamp}-{count} |
| **buyer** | required, ref | Người mua (User) |
| **seller** | required, ref | Người bán (User) |
| **product** | required, ref | Sản phẩm (Product) |
| **price** | required, 0-1,000,000,000 | Giá/đơn vị |
| **quantity** | default 1, min 1, integer | Số lượng |
| **totalAmount** | required, 0-1,000,000,000 | Tổng tiền |
| **escrow.amount** | required, min 0 | Tiền giữ hộ |
| **escrow.status** | enum | Chưa nhận, Đã nhận, Đã trả, Tranh chấp |
| **shipping.method** | required, enum | Giao tại chỗ, Giao hàng, Tự lấy |
| **shipping.status** | enum | Chưa gửi, Đang vận chuyển, Đã giao, Không giao |
| **status** | enum | Chờ thanh toán, Chờ gửi, Đang vận chuyển, Đã giao, Hoàn thành, Hủy, Tranh chấp |
| **shippingAddress.phone** | optional, regex | Số ĐT Việt Nam |
| **shippingAddress.zipCode** | optional, 5-6 chữ số | Mã bưu điện |
| **notes** | maxlength 1000 | Ghi chú chung |
| **rating.score** | min 1, max 5 | Đánh giá 1-5 sao |
| **rating.comment** | maxlength 1000 | Bình luận đánh giá |

---

## 🎯 Validation Patterns

### Email
```
^[^\s@]+@[^\s@]+\.[^\s@]+$
```

### Phone (Vietnam)
```
^(\+84|0)\d{1,10}$
```

### Username
```
^[a-zA-Z0-9_-]+$
```

### Category Slug
```
^[a-z0-9-]+$
```

### Postal Code
```
^\d{5,6}$
```

### GeoJSON Coordinates
```
Longitude: -180 to 180
Latitude: -90 to 90
```

---

## 📌 Custom Validators

Các validators tùy chỉnh được lưu trong file `validators.js`:

- `arrayLengthValidator()` - Kiểm tra độ dài mảng
- `fieldRelationValidator()` - Kiểm tra quan hệ giữa các trường
- `coordinatesValidator` - Kiểm tra tọa độ địa lý
- `urlValidator` - Kiểm tra URL
- `emailValidator` - Kiểm tra email
- `phoneValidator` - Kiểm tra số điện thoại

---

## 💡 Index cho Performance

- **Product**: `location` (2dsphere) - Tìm kiếm địa lý
- **User**: `email`, `username` (unique)
- **Order**: `orderNumber` (unique), `buyer`, `seller`, `status`
- **Product**: `seller`, `category`, `status`
- **Conversation**: `participants`
- **Message**: `conversation`, `sender`

---

*Document được tạo tự động. Cập nhật lần cuối: 2024*
