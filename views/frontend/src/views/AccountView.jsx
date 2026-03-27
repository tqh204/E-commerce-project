import SectionCard from '../components/SectionCard';
import AppLink from '../components/AppLink';
import { ESCROW_ACTIONS, ORDER_STATUS_OPTIONS } from '@frontend-utils/constants';
import { compactText, formatDateTime, formatPrice, joinLocation, roleNames } from '@frontend-utils/format';

const AccountView = ({
  user,
  profileForm,
  setProfileForm,
  onSaveProfile,
  addresses,
  addressForm,
  setAddressForm,
  addressEditId,
  onSaveAddress,
  onEditAddress,
  onResetAddressForm,
  onDeleteAddress,
  orders,
  selectedOrder,
  onSelectOrder,
  onUpdateOrderStatus,
  onDeleteOrder,
  escrows,
  selectedEscrow,
  onViewEscrow,
  onEscrowAction,
  reviews,
  reviewForm,
  setReviewForm,
  onCreateReview,
  onRespondReview,
}) => (
  <div className="view-grid">
    <SectionCard title="Ho so" subtitle="Profile + auth context">
      {user ? (
        <form className="stack gap-sm" onSubmit={onSaveProfile}>
          <div className="meta-grid">
            <span>Username: {user.username}</span>
            <span>Email: {user.email}</span>
            <span>Role: {roleNames(user.roles)}</span>
            <span>Rating: {user.ratingAvg || 0}</span>
          </div>
          <input value={profileForm.fullName} onChange={(event) => setProfileForm((current) => ({ ...current, fullName: event.target.value }))} placeholder="Ho va ten" />
          <input value={profileForm.phone} onChange={(event) => setProfileForm((current) => ({ ...current, phone: event.target.value }))} placeholder="So dien thoai" />
          <input value={profileForm.avatarUrl} onChange={(event) => setProfileForm((current) => ({ ...current, avatarUrl: event.target.value }))} placeholder="Avatar URL" />
          <textarea value={profileForm.bio} onChange={(event) => setProfileForm((current) => ({ ...current, bio: event.target.value }))} placeholder="Bio" rows={3} />
          <button type="submit">Cap nhat profile</button>
        </form>
      ) : <p className="muted">Dang nhap de quan ly profile va CRUD du lieu ca nhan.</p>}
    </SectionCard>

    <SectionCard title={addressEditId ? 'Sua dia chi' : 'Dia chi giao dich'} subtitle="Address CRUD" className="wide">
      <form className="stack gap-sm" onSubmit={onSaveAddress}>
        <div className="form-grid form-grid--three">
          <input value={addressForm.label} onChange={(event) => setAddressForm((current) => ({ ...current, label: event.target.value }))} placeholder="Nhan dia chi" />
          <input value={addressForm.fullName} onChange={(event) => setAddressForm((current) => ({ ...current, fullName: event.target.value }))} placeholder="Nguoi nhan" />
          <input value={addressForm.phone} onChange={(event) => setAddressForm((current) => ({ ...current, phone: event.target.value }))} placeholder="So dien thoai" />
          <input value={addressForm.province} onChange={(event) => setAddressForm((current) => ({ ...current, province: event.target.value }))} placeholder="Tinh / Thanh" />
          <input value={addressForm.district} onChange={(event) => setAddressForm((current) => ({ ...current, district: event.target.value }))} placeholder="Quan / Huyen" />
          <input value={addressForm.ward} onChange={(event) => setAddressForm((current) => ({ ...current, ward: event.target.value }))} placeholder="Phuong / Xa" />
          <input value={addressForm.street} onChange={(event) => setAddressForm((current) => ({ ...current, street: event.target.value }))} placeholder="Duong" />
          <input value={addressForm.postalCode} onChange={(event) => setAddressForm((current) => ({ ...current, postalCode: event.target.value }))} placeholder="Postal code" />
          <label className="checkbox-row"><input type="checkbox" checked={addressForm.isDefault} onChange={(event) => setAddressForm((current) => ({ ...current, isDefault: event.target.checked }))} /> Mac dinh</label>
        </div>
        <textarea value={addressForm.fullAddress} onChange={(event) => setAddressForm((current) => ({ ...current, fullAddress: event.target.value }))} placeholder="Dia chi day du" rows={2} />
        <div className="actions-row">
          <button type="submit">{addressEditId ? 'Cap nhat dia chi' : 'Tao dia chi'}</button>
          <button type="button" className="ghost-btn" onClick={onResetAddressForm}>Reset</button>
        </div>
      </form>
      <div className="resource-list">
        {addresses.map((address) => (
          <article key={address._id} className="resource-item">
            <div>
              <strong>{address.label || address.fullName}</strong>
              <p>{address.fullAddress || joinLocation(address.street, address.ward, address.district, address.province)}</p>
            </div>
            <div className="resource-item__meta">
              <span>{address.isDefault ? 'Default' : 'Address'}</span>
              <div className="mini-actions">
                <button type="button" onClick={() => onEditAddress(address)}>Sua</button>
                <button type="button" onClick={() => onDeleteAddress(address._id)}>Xoa</button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </SectionCard>

    <SectionCard title="Don hang" subtitle="Order CRUD + detail" className="wide">
      <div className="resource-list">
        {orders.map((order) => (
          <article key={order._id} className={selectedOrder?.order?._id === order._id ? 'resource-item active' : 'resource-item'}>
            <div>
              <strong>{order.product?.title || order.orderCode}</strong>
              <p>{order.status} | {formatPrice(order.totalAmount)} VND</p>
              <small>{formatDateTime(order.createdAt)}</small>
            </div>
            <div className="resource-item__meta">
              <div className="mini-actions wrap">
                <AppLink to={`/orders/${order._id}`} className="route-pill">
                  Xem chi tiet
                </AppLink>
                {ORDER_STATUS_OPTIONS.slice(0, 4).map((status) => (
                  <button key={status} type="button" onClick={() => onUpdateOrderStatus(order._id, status)}>{status}</button>
                ))}
                <button type="button" onClick={() => onDeleteOrder(order._id)}>Xoa order</button>
              </div>
            </div>
          </article>
        ))}
        {!orders.length ? <div className="empty-state compact-empty"><strong>Chua co order.</strong><p className="muted">Khi ban mua ngay hoac thang auction, don hang se hien tai day.</p></div> : null}
      </div>
    </SectionCard>

    <SectionCard title="Escrow" subtitle="Escrow actions" className="wide">
      <div className="resource-list">
        {escrows.map((escrow) => (
          <article key={escrow._id} className={selectedEscrow?._id === escrow._id ? 'resource-item active' : 'resource-item'}>
            <div>
              <strong>{escrow.order?.orderCode || escrow._id}</strong>
              <p>{escrow.status} | {formatPrice(escrow.amount)} VND</p>
            </div>
            <div className="resource-item__meta">
              <div className="mini-actions wrap">
                <AppLink to={`/escrows/${escrow._id}`} className="route-pill">
                  Xem escrow
                </AppLink>
                {ESCROW_ACTIONS.map((action) => <button key={action} type="button" onClick={() => onEscrowAction(escrow._id, action)}>{action}</button>)}
              </div>
            </div>
          </article>
        ))}
      </div>
    </SectionCard>

    <SectionCard title="Review" subtitle="Tao va phan hoi review" className="wide">
      <form className="stack gap-sm" onSubmit={onCreateReview}>
        <div className="form-grid form-grid--three">
          <input value={reviewForm.orderId} onChange={(event) => setReviewForm((current) => ({ ...current, orderId: event.target.value }))} placeholder="Order ID" required />
          <input type="number" min="1" max="5" value={reviewForm.score} onChange={(event) => setReviewForm((current) => ({ ...current, score: event.target.value }))} placeholder="Diem" required />
          <label className="checkbox-row"><input type="checkbox" checked={reviewForm.isVisible} onChange={(event) => setReviewForm((current) => ({ ...current, isVisible: event.target.checked }))} /> Hien thi</label>
        </div>
        <textarea value={reviewForm.comment} onChange={(event) => setReviewForm((current) => ({ ...current, comment: event.target.value }))} placeholder="Noi dung review" rows={3} />
        <button type="submit">Tao review</button>
      </form>
      <div className="resource-list">
        {reviews.map((review) => (
          <article key={review._id} className="resource-item">
            <div>
              <strong>{review.product?.title || review._id}</strong>
              <p>{review.score}/5 | {compactText(review.comment || 'Khong co noi dung', 90)}</p>
            </div>
            <div className="resource-item__meta">
              <small>{review.isVisible ? 'visible' : 'hidden'}</small>
              <button type="button" onClick={() => onRespondReview(review._id)}>Phan hoi</button>
            </div>
          </article>
        ))}
      </div>
    </SectionCard>
  </div>
);

export default AccountView;
