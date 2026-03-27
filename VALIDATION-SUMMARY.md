# ✅ Validation Constraints - Tóm Tắt Thay Đổi

## 📝 Tổng quan
Đã thêm các ràng buộc (constraints) chi tiết vào 6 MongoDB schemas chính của E-commerce project nhằm đảm bảo dữ liệu hợp lệ và an toàn.

---

## 👤 User Schema - Cải Tiến
```javascript
✅ username
  - Pattern: [a-zA-Z0-9_-]+  (chỉ chữ, số, gạch ngang/dưới)
  - Length: 3-30 ký tự
  - unique, trim, lowercase

✅ email
  - Pattern: valid email format
  - unique, lowercase

✅ password
  - Length: 6-128 ký tự
  - select: false (không trả về mặc định)

✅ fullName
  - Length: 2-100 ký tự
  - required, trim

✅ phone
  - Pattern: Số ĐT Việt Nam (+84 hoặc 0)
  - Ví dụ: +84987654321 hoặc 0987654321

✅ address
  - maxlength: 500 ký tự

✅ balance, totalSold, totalBought
  - min: 0 (không âm)

✅ rating
  - Range: 0-5
```

---

## 🏷️ Category Schema - Cải Tiến
```javascript
✅ name
  - Length: 2-100 ký tự
  - unique, trim

✅ description
  - maxlength: 1000 ký tự

✅ slug
  - Pattern: [a-z0-9-]+ (chỉ chữ thường, số, gạch ngang)
  - unique, lowercase
  - Ví dụ: electronics-devices, fashion-new

✅ order
  - min: 0 (không âm)
```

---

## 📦 Product Schema - Cải Tiến
```javascript
✅ title
  - Length: 5-200 ký tự
  - required, trim

✅ description
  - Length: 10-5000 ký tự
  - required

✅ price
  - Range: 0 - 1,000,000,000
  - required

✅ images
  - Minimum: 1 ảnh
  - Maximum: 10 ảnh
  - Kiểm tra: phải có ít nhất 1 ảnh

✅ location.coordinates
  - Format: [longitude, latitude]
  - Longitude: -180 to 180
  - Latitude: -90 to 90
  - Ví dụ: [106.6263, 10.8231] (TP.HCM)

✅ address
  - maxlength: 500 ký tự

✅ views
  - min: 0 (không âm)

✅ tags
  - Maximum: 10 thẻ
  - Mỗi thẻ: 1-30 ký tự
  - Ví dụ: ['smartphone', 'cũ', 'tốt']
```

---

## 💬 Conversation Schema - Cải Tiến
```javascript
✅ participants
  - Minimum: 2 người tham gia
  - Validation: phải có ít nhất 2 người

✅ subject
  - maxlength: 200 ký tự

✅ lastMessage
  - maxlength: 1000 ký tự
```

---

## 💌 Message Schema - Cải Tiến
```javascript
✅ content
  - Length: 1-5000 ký tự
  - required, trim
  - Không được để trống

✅ attachments
  - Maximum: 5 file
  - Phải là URL hợp lệ
```

---

## 🛒 Order Schema - Cải Tiến
```javascript
✅ price
  - Range: 0 - 1,000,000,000

✅ quantity
  - minimum: 1
  - Type: integer (không phải decimal)

✅ totalAmount
  - Range: 0 - 1,000,000,000

✅ escrow.amount
  - min: 0 (không âm)

✅ shippingAddress.phone
  - Pattern: Số ĐT Việt Nam

✅ shippingAddress.zipCode
  - Pattern: 5-6 chữ số

✅ notes, buyerNotes, sellerNotes
  - maxlength: 1000 ký tự

✅ rating.score
  - Range: 1-5

✅ rating.comment
  - maxlength: 1000 ký tự
```

---

## 📂 Files Được Tạo/Cập Nhật

### Schema Files (Cập Nhật)
- ✅ `schemas/User.js` - Thêm validators cho tài khoản
- ✅ `schemas/Category.js` - Thêm validators cho danh mục
- ✅ `schemas/Product.js` - Thêm validators cho sản phẩm (sửa lỗi cũ)
- ✅ `schemas/Conversation.js` - Thêm validators cho cuộc hội thoại
- ✅ `schemas/Message.js` - Thêm validators cho tin nhắn
- ✅ `schemas/Order.js` - Thêm validators cho đơn hàng

### Utility Files (Tạo Mới)
- 🆕 `schemas/validators.js` - Helper functions cho custom validators
- 🆕 `CONSTRAINTS.md` - Tài liệu chi tiết về tất cả constraints
- 🆕 `test-validators.js` - File test để kiểm tra validators

---

## 🧪 Cách Test Validators

1. **Kết nối MongoDB** và import schemas
2. **Chạy validators**: Tạo document với dữ liệu không hợp lệ
3. **Gọi `.validate()`** trước khi lưu

```javascript
// Ví dụ:
const user = new User({
  username: 'ab',  // Quá ngắn (< 3 ký tự)
  email: 'test@example.com',
  password: '123456',
  fullName: 'Test'
});

try {
  await user.validate();
} catch (err) {
  console.log(err.errors.username.message); 
  // "Tên đăng nhập phải có ít nhất 3 ký tự"
}
```

---

## 🔍 Quy Tắc Validation

### Độ Dài Ký Tự
- ✅ Giới hạn minlength và maxlength
- ✅ Trim khoảng trắng thừa
- ✅ Chuyển lowercase nếu cần

### Format
- ✅ Email, Phone, URL validation
- ✅ Pattern matching (regex)
- ✅ Enum cho trạng thái

### Giá Trị
- ✅ Min/Max constraints
- ✅ Kiểm tra tọa độ địa lý
- ✅ Kiểm tra quan hệ (ví dụ: quantity = integer)

### Tham Chiếu
- ✅ Tất cả ObjectId fields có ref
- ✅ Tối thiểu phần tử mảng

---

## 💡 Lợi Ích

✅ **Data Integrity** - Đảm bảo dữ liệu nhất quán  
✅ **Security** - Ngăn chặn dữ liệu độc hại  
✅ **API Safety** - Xác thực trước khi lưu vào DB  
✅ **Better UX** - Error messages rõ ràng bằng Tiếng Việt  
✅ **Performance** - Giảm lỗi runtime  

---

## 📖 Tài Liệu Tham Khảo

- `CONSTRAINTS.md` - Danh sách đầy đủ tất cả constraints
- `schemas/validators.js` - Custom validators reusable
- `test-validators.js` - Test cases mẫu

---

**Ngày cập nhật:** 18/03/2024  
**Status:** ✅ Hoàn thành
