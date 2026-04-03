import AppLink from '../../shared/AppLink';
import SectionCard from '../../shared/SectionCard';
import { compactText, formatDateTime, formatPrice, joinLocation } from '@frontend-utils/format';

const ORDER_STATUS_LABELS = {
  negotiating: 'Chờ thương lượng',
  pending_payment: 'Chờ thanh toán',
  paid: 'Đã thanh toán',
  processing: 'Người bán đã xác nhận',
  shipping: 'Đang giao hàng',
  delivered: 'Đã giao hàng',
  completed: 'Hoàn tất',
  cancelled: 'Đã hủy',
  disputed: 'Đang tranh chấp',
};

const SHIPPING_METHOD_LABELS = {
  delivery: 'Giao hàng',
  meetup: 'Gặp mặt',
  pickup: 'Tự đến lấy',
};

const orderAddressText = (order) =>
  joinLocation(
    order?.shippingAddress?.address,
    order?.shippingAddress?.ward,
    order?.shippingAddress?.district,
    order?.shippingAddress?.province
  );

const getOrderRole = (order, user) => {
  const userId = String(user?._id || '');
  if (!userId) return 'guest';
  if (String(order?.seller?._id || order?.seller || '') === userId) return 'seller';
  if (String(order?.buyer?._id || order?.buyer || '') === userId) return 'buyer';
  return 'guest';
};

const OrdersPage = ({
  user,
  addresses = [],
  orders = [],
  selectedOrder,
  onUpdateOrderStatus,
  onDeleteOrder,
  onAttachShippingAddress,
  reviews = [],
  reviewForm,
  setReviewForm,
  onCreateReview,
  onRespondReview,
}) => (
  <div className="view-grid">
    <SectionCard
      title="Đơn hàng"
      subtitle="Theo dõi giao dịch mua bán giữa người mua và người bán"
      className="wide"
      actions={<span className="route-pill">{orders.length} đơn hàng</span>}
    >
      <div className="resource-list">
        {orders.map((order) => {
          const orderRole = getOrderRole(order, user);
          const isBuyer = orderRole === 'buyer';
          const isSeller = orderRole === 'seller';
          const shippingAddressId =
            order.shippingAddressRef?._id ||
            order.shippingAddressRef ||
            addresses.find((item) => item.isDefault)?._id ||
            addresses[0]?._id;

          return (
            <article
              key={order._id}
              className={
                selectedOrder?.order?._id === order._id
                  ? 'resource-item active order-card'
                  : 'resource-item order-card'
              }
            >
              <div className="order-card__content">
                <div className="order-card__head">
                  <div>
                    <strong>{order.product?.title || order.orderCode}</strong>
                    <p className="muted">{formatDateTime(order.createdAt)}</p>
                  </div>
                  <div className="order-card__price">
                    <strong>{formatPrice(order.totalAmount)} VND</strong>
                    <span>{ORDER_STATUS_LABELS[order.status] || order.status}</span>
                  </div>
                </div>

                <div className="tag-row">
                  <span className="route-pill">
                    {isBuyer
                      ? 'Bạn là người mua'
                      : isSeller
                        ? 'Bạn là người bán'
                        : 'Đơn liên quan'}
                  </span>
                  <span className="route-pill">
                    {SHIPPING_METHOD_LABELS[order.shippingMethod] || order.shippingMethod || 'Giao hàng'}
                  </span>
                  {isSeller && order.status === 'negotiating' ? (
                    <span className="route-pill route-pill--highlight">Có người muốn giao dịch</span>
                  ) : null}
                </div>

                <div className="order-card__meta">
                  <span>Người mua: {order.buyer?.fullName || order.buyer?.username || 'Chưa có'}</span>
                  <span>Người bán: {order.seller?.fullName || order.seller?.username || 'Chưa có'}</span>
                  <span>Địa chỉ giao hàng: {orderAddressText(order)}</span>
                </div>
              </div>

              <div className="resource-item__meta order-card__actions">
                <AppLink to={`/orders/${order._id}`} className="route-pill">
                  Xem chi tiết
                </AppLink>

                {isBuyer && addresses.length ? (
                  <button
                    type="button"
                    onClick={() => onAttachShippingAddress(order._id, shippingAddressId)}
                  >
                    Gắn địa chỉ
                  </button>
                ) : null}

                {isBuyer && ['negotiating', 'pending_payment'].includes(order.status) ? (
                  <button
                    type="button"
                    onClick={() => onUpdateOrderStatus(order._id, 'cancelled')}
                  >
                    Hủy yêu cầu
                  </button>
                ) : null}

                {isSeller && order.status === 'negotiating' ? (
                  <button
                    type="button"
                    className="primary-btn"
                    onClick={() => onUpdateOrderStatus(order._id, 'processing')}
                  >
                    Xác nhận còn hàng
                  </button>
                ) : null}

                {isSeller && order.status === 'processing' ? (
                  <button
                    type="button"
                    onClick={() => onUpdateOrderStatus(order._id, 'shipping')}
                  >
                    Bắt đầu giao hàng
                  </button>
                ) : null}

                {isSeller && order.status === 'shipping' ? (
                  <button
                    type="button"
                    onClick={() => onUpdateOrderStatus(order._id, 'delivered')}
                  >
                    Xác nhận đã giao
                  </button>
                ) : null}

                {isBuyer && order.status === 'delivered' ? (
                  <button
                    type="button"
                    className="primary-btn"
                    onClick={() => onUpdateOrderStatus(order._id, 'completed')}
                  >
                    Tôi đã nhận hàng
                  </button>
                ) : null}

                <button type="button" onClick={() => onDeleteOrder(order._id)}>
                  Xóa đơn
                </button>
              </div>
            </article>
          );
        })}

        {!orders.length ? (
          <div className="empty-state compact-empty">
            <strong>Chưa có đơn hàng liên quan.</strong>
            <p className="muted">
              Khi bạn mua sản phẩm hoặc có người muốn mua sản phẩm của bạn, đơn hàng sẽ xuất hiện tại đây.
            </p>
          </div>
        ) : null}
      </div>
    </SectionCard>

    <SectionCard title="Đánh giá" subtitle="Tạo và phản hồi đánh giá" className="wide">
      <form className="stack gap-sm" onSubmit={onCreateReview}>
        <div className="form-grid form-grid--three">
          <input
            value={reviewForm.orderId}
            onChange={(event) =>
              setReviewForm((current) => ({ ...current, orderId: event.target.value }))
            }
            placeholder="Mã đơn hàng"
            required
          />
          <input
            type="number"
            min="1"
            max="5"
            value={reviewForm.score}
            onChange={(event) =>
              setReviewForm((current) => ({ ...current, score: event.target.value }))
            }
            placeholder="Điểm"
            required
          />
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={reviewForm.isVisible}
              onChange={(event) =>
                setReviewForm((current) => ({ ...current, isVisible: event.target.checked }))
              }
            />
            Hiển thị
          </label>
        </div>
        <textarea
          value={reviewForm.comment}
          onChange={(event) =>
            setReviewForm((current) => ({ ...current, comment: event.target.value }))
          }
          placeholder="Nội dung đánh giá"
          rows={3}
        />
        <button type="submit">Tạo đánh giá</button>
      </form>

      <div className="resource-list">
        {reviews.map((review) => (
          <article key={review._id} className="resource-item">
            <div>
              <strong>{review.product?.title || review._id}</strong>
              <p>{review.score}/5 | {compactText(review.comment || 'Không có nội dung', 90)}</p>
            </div>
            <div className="resource-item__meta">
              <small>{review.isVisible ? 'Đang hiển thị' : 'Đã ẩn'}</small>
              <small>{formatDateTime(review.createdAt)}</small>
              <button type="button" onClick={() => onRespondReview(review._id)}>
                Phản hồi
              </button>
            </div>
          </article>
        ))}

        {!reviews.length ? (
          <div className="empty-state compact-empty">
            <strong>Chưa có đánh giá nào.</strong>
            <p className="muted">Bạn có thể tạo đánh giá sau khi có đơn hàng phù hợp.</p>
          </div>
        ) : null}
      </div>
    </SectionCard>
  </div>
);

export default OrdersPage;
