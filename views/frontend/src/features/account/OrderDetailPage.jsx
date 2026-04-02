import { useEffect, useState } from 'react';
import SectionCard from '../../shared/SectionCard';
import AppLink from '../../shared/AppLink';
import { compactText, formatDateTime, formatPrice, joinLocation } from '@frontend-utils/format';

const ORDER_STATUS_LABELS = {
  negotiating: 'Chờ thương lượng',
  pending_payment: 'Chờ thanh toán',
  paid: 'Đã thanh toán',
  processing: 'Người bán đã duyệt',
  shipping: 'Đang giao hàng',
  delivered: 'Đã giao',
  completed: 'Hoàn tất',
  cancelled: 'Đã hủy',
  disputed: 'Đang tranh chấp',
};

const buildOrderAddress = (order) =>
  joinLocation(
    order?.shippingAddress?.address,
    order?.shippingAddress?.ward,
    order?.shippingAddress?.district,
    order?.shippingAddress?.province
  );

const buildAddressLabel = (address) =>
  joinLocation(
    address?.fullAddress || address?.street,
    address?.ward,
    address?.district,
    address?.province
  );

const OrderDetailPage = ({
  user,
  addresses = [],
  selectedOrder,
  onUpdateOrderStatus,
  onDeleteOrder,
  onAttachShippingAddress,
}) => {
  const order = selectedOrder?.order;
  const items = selectedOrder?.items || [];
  const [selectedAddressId, setSelectedAddressId] = useState('');

  useEffect(() => {
    if (!order) {
      setSelectedAddressId('');
      return;
    }

    const currentAddressId = order.shippingAddressRef?._id || order.shippingAddressRef;
    const defaultAddressId = addresses.find((item) => item.isDefault)?._id || addresses[0]?._id || '';
    setSelectedAddressId(String(currentAddressId || defaultAddressId || ''));
  }, [addresses, order]);

  const isBuyer = String(order?.buyer?._id || order?.buyer || '') === String(user?._id || '');
  const isSeller = String(order?.seller?._id || order?.seller || '') === String(user?._id || '');
  const addressText = order ? buildOrderAddress(order) : '';

  return (
    <>
      <section className="detail-intro section-card wide">
        <div>
          <p className="eyebrow">Đơn hàng</p>
          <h2>Theo dõi trạng thái thương lượng, duyệt bán và giao hàng trên một trang riêng.</h2>
        </div>
        <div className="tag-row">
          <AppLink to="/orders" className="route-pill">
            Về đơn hàng
          </AppLink>
          <span className="route-pill">{order?.orderCode || 'Đang tải dữ liệu'}</span>
          <span className="route-pill">
            {ORDER_STATUS_LABELS[order?.status] || order?.status || 'Chưa có trạng thái'}
          </span>
        </div>
      </section>

      {!order ? (
        <SectionCard title="Đang tải đơn hàng" subtitle="GET /api/orders/:id" className="wide">
          <p className="muted">Chi tiết đơn hàng sẽ hiển thị ngay khi dữ liệu được tải xong.</p>
        </SectionCard>
      ) : (
        <div className="view-grid">
          <SectionCard
            title={order.product?.title || order.orderCode}
            subtitle={order.orderCode}
            className="wide"
            actions={
              <AppLink to={`/products/${order.product?._id || order.product}`} className="route-pill">
                Xem sản phẩm
              </AppLink>
            }
          >
            <div className="detail-stats">
              <div className="detail-stat-card">
                <span>Trạng thái</span>
                <strong>{ORDER_STATUS_LABELS[order.status] || order.status}</strong>
              </div>
              <div className="detail-stat-card">
                <span>Tổng tiền</span>
                <strong>{formatPrice(order.totalAmount)} VND</strong>
              </div>
              <div className="detail-stat-card">
                <span>Thanh toán</span>
                <strong>{order.paymentType || 'Chưa có'}</strong>
              </div>
              <div className="detail-stat-card">
                <span>Phương thức giao</span>
                <strong>{order.shippingMethod || order.shipping?.method || 'Chưa có'}</strong>
              </div>
            </div>

            <div className="detail-grid">
              <div className="detail-panel">
                <h4>Tóm tắt đơn hàng</h4>
                <div className="order-summary-grid">
                  <span>Người mua: {order.buyer?.fullName || order.buyer?.username || 'Chưa có'}</span>
                  <span>Người bán: {order.seller?.fullName || order.seller?.username || 'Chưa có'}</span>
                  <span>Tạo lúc: {formatDateTime(order.createdAt)}</span>
                  <span>Cập nhật: {formatDateTime(order.updatedAt)}</span>
                  <span>Phí giao hàng: {formatPrice(order.shippingFee)} VND</span>
                  <span>Phí nền tảng: {formatPrice(order.platformFee)} VND</span>
                </div>
              </div>

              <div className="detail-panel">
                <h4>Địa chỉ giao hàng</h4>
                <p>{addressText}</p>
                <div className="order-address-meta">
                  <span>{order.shippingAddress?.fullName || 'Chưa có người nhận'}</span>
                  <span>{order.shippingAddress?.phone || 'Chưa có số điện thoại'}</span>
                </div>
                {isBuyer && addresses.length ? (
                  <div className="order-address-form">
                    <select
                      value={selectedAddressId}
                      onChange={(event) => setSelectedAddressId(event.target.value)}
                    >
                      {addresses.map((address) => (
                        <option key={address._id} value={address._id}>
                          {buildAddressLabel(address)}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => onAttachShippingAddress(order._id, selectedAddressId)}
                      disabled={!selectedAddressId}
                    >
                      Gắn địa chỉ giao hàng
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="detail-panel">
              <h4>Ghi chú và vận chuyển</h4>
              <div className="order-summary-grid">
                <span>Trạng thái giao hàng: {order.shipping?.status || 'pending'}</span>
                <span>Mã vận đơn: {order.shipping?.trackingNumber || 'Chưa có'}</span>
                <span>Đã giao lúc: {formatDateTime(order.deliveredAt)}</span>
                <span>Hoàn tất lúc: {formatDateTime(order.completedAt)}</span>
              </div>
              <p className="muted">
                {compactText(
                  order.notes ||
                    order.buyerNotes ||
                    order.sellerNotes ||
                    'Chưa có ghi chú cho đơn hàng này.',
                  220
                )}
              </p>
            </div>

            <div className="actions-row wrap">
              {isBuyer ? (
                <button type="button" onClick={() => onUpdateOrderStatus(order._id, 'cancelled')}>
                  Hủy yêu cầu
                </button>
              ) : null}
              {isSeller && order.status === 'negotiating' ? (
                <button
                  type="button"
                  className="primary-btn"
                  onClick={() => onUpdateOrderStatus(order._id, 'processing')}
                >
                  Duyệt bán ngay
                </button>
              ) : null}
              {isSeller && order.status === 'processing' ? (
                <button type="button" onClick={() => onUpdateOrderStatus(order._id, 'shipping')}>
                  Bắt đầu giao hàng
                </button>
              ) : null}
              {isSeller && order.status === 'shipping' ? (
                <button type="button" onClick={() => onUpdateOrderStatus(order._id, 'completed')}>
                  Hoàn tất đơn hàng
                </button>
              ) : null}
              <button type="button" onClick={() => onDeleteOrder(order._id)}>
                Xóa đơn hàng
              </button>
            </div>
          </SectionCard>

          <SectionCard
            title="Sản phẩm trong đơn"
            subtitle={`${items.length} dòng sản phẩm`}
            className="wide"
          >
            <div className="resource-list">
              {items.map((item) => (
                <article key={item._id} className="resource-item">
                  <div>
                    <strong>{item.titleSnapshot || item.product?.title || 'Sản phẩm'}</strong>
                    <p>
                      {formatPrice(item.priceSnapshot)} VND x {item.quantity}
                    </p>
                  </div>
                  <div className="resource-item__meta">
                    <span>{formatPrice(item.total)} VND</span>
                  </div>
                </article>
              ))}
              {!items.length ? (
                <div className="empty-state compact-empty">
                  <strong>Đơn này chưa có dòng sản phẩm riêng.</strong>
                  <p className="muted">Khi API trả về item, danh sách sẽ hiển thị tại đây.</p>
                </div>
              ) : null}
            </div>
          </SectionCard>
        </div>
      )}
    </>
  );
};

export default OrderDetailPage;
