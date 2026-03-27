import SectionCard from '../../shared/SectionCard';
import AppLink from '../../shared/AppLink';
import { ORDER_STATUS_OPTIONS } from '@frontend-utils/constants';
import { compactText, formatDateTime, formatPrice, joinLocation } from '@frontend-utils/format';

const OrderDetailPage = ({ selectedOrder, onUpdateOrderStatus, onDeleteOrder }) => {
  const order = selectedOrder?.order;
  const items = selectedOrder?.items || [];

  return (
    <>
      <section className="detail-intro section-card wide">
        <div>
          <p className="eyebrow">Order detail</p>
          <h2>Theo doi tung don hang, cap nhat trang thai va doi chieu escrow ngay tren route rieng.</h2>
        </div>
        <div className="tag-row">
          <AppLink to="/account" className="route-pill">
            /account
          </AppLink>
          <span className="route-pill">{order?.status || 'dang tai du lieu'}</span>
        </div>
      </section>

      {!order ? (
        <SectionCard title="Dang tai order" subtitle="GET /api/orders/:id" className="wide">
          <p className="muted">Order detail se hien o day sau khi frontend tai xong du lieu.</p>
        </SectionCard>
      ) : (
        <div className="view-grid">
          <SectionCard
            title={order.product?.title || order.orderCode}
            subtitle={order.orderCode}
            className="wide"
            actions={
              <div className="actions-row wrap">
                <AppLink to={`/products/${order.product?._id || order.product}`} className="route-pill">
                  Xem san pham
                </AppLink>
                {order.escrowTransaction?._id ? (
                  <AppLink to={`/escrows/${order.escrowTransaction._id}`} className="route-pill">
                    Mo escrow
                  </AppLink>
                ) : null}
              </div>
            }
          >
            <div className="detail-stats">
              <div className="detail-stat-card">
                <span>Trang thai</span>
                <strong>{order.status}</strong>
              </div>
              <div className="detail-stat-card">
                <span>Tong tien</span>
                <strong>{formatPrice(order.totalAmount)} VND</strong>
              </div>
              <div className="detail-stat-card">
                <span>Thanh toan</span>
                <strong>{order.paymentType || 'n/a'}</strong>
              </div>
              <div className="detail-stat-card">
                <span>Van chuyen</span>
                <strong>{order.shippingMethod || order.shipping?.method || 'n/a'}</strong>
              </div>
            </div>

            <div className="detail-grid">
              <div className="detail-panel">
                <h4>Thong tin giao dich</h4>
                <div className="meta-grid">
                  <span>Buyer: {order.buyer?.fullName || order.buyer?.username || 'n/a'}</span>
                  <span>Seller: {order.seller?.fullName || order.seller?.username || 'n/a'}</span>
                  <span>Tao luc: {formatDateTime(order.createdAt)}</span>
                  <span>Cap nhat: {formatDateTime(order.updatedAt)}</span>
                  <span>Escrow: {order.escrowTransaction?.status || order.escrow?.status || 'n/a'}</span>
                  <span>Shipping status: {order.shipping?.status || 'n/a'}</span>
                </div>
              </div>

              <div className="detail-panel">
                <h4>Dia chi va ghi chu</h4>
                <p>{order.shippingAddress?.fullAddress || joinLocation(order.shippingAddress?.street, order.shippingAddress?.ward, order.shippingAddress?.district, order.shippingAddress?.province)}</p>
                <p className="muted">{compactText(order.notes || order.buyerNotes || order.sellerNotes || 'Chua co ghi chu.', 180)}</p>
              </div>
            </div>

            <div className="actions-row wrap">
              {ORDER_STATUS_OPTIONS.map((status) => (
                <button key={status} type="button" onClick={() => onUpdateOrderStatus(order._id, status)}>
                  {status}
                </button>
              ))}
              <button type="button" onClick={() => onDeleteOrder(order._id)}>
                Xoa order
              </button>
            </div>
          </SectionCard>

          <SectionCard title="Order items" subtitle={`${items.length} dong san pham`} className="wide">
            <div className="resource-list">
              {items.map((item) => (
                <article key={item._id} className="resource-item">
                  <div>
                    <strong>{item.titleSnapshot || item.product?.title || 'Order item'}</strong>
                    <p>{formatPrice(item.priceSnapshot)} VND x {item.quantity}</p>
                  </div>
                  <div className="resource-item__meta">
                    <span>{formatPrice(item.total)} VND</span>
                  </div>
                </article>
              ))}
              {!items.length ? (
                <div className="empty-state compact-empty">
                  <strong>Order nay chua co item rieng.</strong>
                  <p className="muted">Neu API tra ve item, danh sach se hien tai day.</p>
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
