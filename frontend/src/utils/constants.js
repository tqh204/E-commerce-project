export const APP_NAV = [
  { id: 'catalog', label: '🏪 Danh Mục' },
  { id: 'seller', label: '🛒 Khu Người Bán' },
  { id: 'dashboard', label: '📊 Tổng Quan' },
  { id: 'admin', label: '⚙️ Quản Trị' },
  { id: 'docs', label: '📄 Tài Liệu' },
];

export const ORDER_STATUS_OPTIONS = [
  'pending_payment',
  'paid',
  'processing',
  'shipping',
  'delivered',
  'completed',
  'cancelled',
  'disputed',
];

export const ORDER_STATUS_LABELS = {
  pending_payment: 'Chờ thanh toán',
  paid: 'Đã thanh toán',
  processing: 'Đang xử lý',
  shipping: 'Đang giao',
  delivered: 'Đã giao',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
  disputed: 'Khiếu nại',
};

export const PRODUCT_STATUS_OPTIONS = ['draft', 'pending', 'active', 'sold', 'hidden', 'rejected'];

export const PRODUCT_STATUS_LABELS = {
  draft: 'Nháp',
  pending: 'Chờ duyệt',
  active: 'Đang bán',
  sold: 'Đã bán',
  hidden: 'Ẩn',
  rejected: 'Từ chối',
};

export const SALE_TYPE_LABELS = {
  fixed_price: 'Mua ngay',
  auction: 'Đấu giá',
};

export const CONDITION_LABELS = {
  new: 'Mới',
  like_new: 'Như mới',
  good: 'Tốt',
  fair: 'Khá',
  poor: 'Cũ',
};

export const SOURCE_LABELS = {
  manual: 'Thủ công',
  chotot: 'Chợ Tốt',
};

export const ESCROW_ACTIONS = ['hold', 'release', 'dispute', 'refund'];
