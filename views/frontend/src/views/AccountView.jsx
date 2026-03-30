import SectionCard from '../components/SectionCard';
import AppLink from '../components/AppLink';
import { compactText, roleNames } from '@frontend-utils/format';

const ADDRESS_LABELS = {
  home: 'Nhà riêng',
  work: 'Công ty',
  warehouse: 'Kho hàng',
  pickup: 'Điểm lấy hàng',
  other: 'Khác',
};

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
  reviews,
  reviewForm,
  setReviewForm,
  onCreateReview,
  onRespondReview,
}) => {
  const addressPreview =
    [addressForm.street, addressForm.ward, addressForm.district, addressForm.province]
      .filter(Boolean)
      .join(', ') || 'Địa chỉ đầy đủ sẽ hiển thị ở đây sau khi bạn nhập xong.';

  const roleMode =
    profileForm.roles?.includes('buyer') && profileForm.roles?.includes('seller')
      ? 'buyer_seller'
      : profileForm.roles?.includes('seller')
        ? 'seller'
        : 'buyer';

  return (
    <div className="view-grid">
      <SectionCard title="Hồ sơ" subtitle="Thông tin tài khoản">
        {user ? (
          <form className="stack gap-sm" onSubmit={onSaveProfile}>
            <div className="meta-grid">
              <span>Tên đăng nhập: {user.username}</span>
              <span>Email: {user.email}</span>
              <span>Vai trò hiện tại: {roleNames(user.roles)}</span>
              <span>Đánh giá: {user.ratingAvg || 0}</span>
            </div>
            <select
              value={roleMode}
              onChange={(event) => {
                const nextRoles =
                  event.target.value === 'buyer_seller'
                    ? ['buyer', 'seller']
                    : [event.target.value];
                setProfileForm((current) => ({ ...current, roles: nextRoles }));
              }}
            >
              <option value="buyer">Chỉ mua hàng</option>
              <option value="seller">Chỉ bán hàng</option>
              <option value="buyer_seller">Vừa mua vừa bán</option>
            </select>
            <input
              value={profileForm.fullName}
              onChange={(event) =>
                setProfileForm((current) => ({ ...current, fullName: event.target.value }))
              }
              placeholder="Họ và tên"
            />
            <input
              value={profileForm.phone}
              onChange={(event) =>
                setProfileForm((current) => ({ ...current, phone: event.target.value }))
              }
              placeholder="Số điện thoại"
            />
            <input
              value={profileForm.avatarUrl}
              onChange={(event) =>
                setProfileForm((current) => ({ ...current, avatarUrl: event.target.value }))
              }
              placeholder="Liên kết ảnh đại diện"
            />
            <textarea
              value={profileForm.bio}
              onChange={(event) =>
                setProfileForm((current) => ({ ...current, bio: event.target.value }))
              }
              placeholder="Giới thiệu ngắn"
              rows={3}
            />
            <button type="submit">Cập nhật hồ sơ</button>
          </form>
        ) : (
          <p className="muted">Đăng nhập để quản lý hồ sơ và dữ liệu cá nhân.</p>
        )}
      </SectionCard>

      <div id="dia-chi-giao-hang">
        <SectionCard
          title={addressEditId ? 'Sửa địa chỉ' : 'Địa chỉ giao hàng'}
          subtitle="Lưu địa chỉ nhận hàng"
          className="wide"
        >
          <form className="stack gap-sm" onSubmit={onSaveAddress}>
            <div className="workspace-note">
              <strong>Tên người nhận và số điện thoại lấy sẵn từ hồ sơ</strong>
              <small className="muted">
                Bạn chỉ cần nhập phần địa chỉ. Khi bấm lưu, địa chỉ sẽ được ghi vào hệ thống và dùng cho đơn hàng.
              </small>
            </div>

            <div className="form-grid form-grid--three">
              <select
                value={addressForm.label || 'home'}
                onChange={(event) =>
                  setAddressForm((current) => ({ ...current, label: event.target.value }))
                }
              >
                {Object.entries(ADDRESS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <input
                value={addressForm.fullName}
                onChange={(event) =>
                  setAddressForm((current) => ({ ...current, fullName: event.target.value }))
                }
                placeholder="Người nhận"
              />
              <input
                value={addressForm.phone}
                onChange={(event) =>
                  setAddressForm((current) => ({ ...current, phone: event.target.value }))
                }
                placeholder="Số điện thoại"
              />
              <input
                value={addressForm.province}
                onChange={(event) =>
                  setAddressForm((current) => ({ ...current, province: event.target.value }))
                }
                placeholder="Tỉnh / Thành phố"
              />
              <input
                value={addressForm.district}
                onChange={(event) =>
                  setAddressForm((current) => ({ ...current, district: event.target.value }))
                }
                placeholder="Quận / Huyện"
              />
              <input
                value={addressForm.ward}
                onChange={(event) =>
                  setAddressForm((current) => ({ ...current, ward: event.target.value }))
                }
                placeholder="Phường / Xã"
              />
              <input
                value={addressForm.street}
                onChange={(event) =>
                  setAddressForm((current) => ({ ...current, street: event.target.value }))
                }
                placeholder="Số nhà, tên đường"
              />
              <label className="checkbox-row auth-checkbox">
                <input
                  type="checkbox"
                  checked={addressForm.isDefault}
                  onChange={(event) =>
                    setAddressForm((current) => ({ ...current, isDefault: event.target.checked }))
                  }
                />
                <span>Đặt làm địa chỉ mặc định</span>
              </label>
            </div>

            <div className="workspace-note compact-note">
              <strong>Địa chỉ đầy đủ</strong>
              <span className="muted">{addressPreview}</span>
            </div>

            <div className="actions-row">
              <button type="submit">{addressEditId ? 'Cập nhật địa chỉ' : 'Tạo địa chỉ'}</button>
              <button type="button" className="ghost-btn" onClick={onResetAddressForm}>
                Làm mới
              </button>
            </div>
          </form>

          <div className="resource-list">
            {addresses.map((address) => (
              <article key={address._id} className="resource-item address-card">
                <div className="address-card__content">
                  <div className="tag-row">
                    <strong>{ADDRESS_LABELS[address.label] || 'Địa chỉ giao hàng'}</strong>
                    {address.isDefault ? <small className="badge-dot">Mặc định</small> : null}
                  </div>
                  <p className="address-card__line">
                    {address.fullAddress ||
                      [address.street, address.ward, address.district, address.province]
                        .filter(Boolean)
                        .join(', ')}
                  </p>
                  <div className="address-card__meta">
                    <small>Người nhận: {address.fullName}</small>
                    <small>Số điện thoại: {address.phone}</small>
                  </div>
                </div>
                <div className="resource-item__meta">
                  <div className="mini-actions">
                    <button type="button" onClick={() => onEditAddress(address)}>
                      Sửa
                    </button>
                    <button type="button" onClick={() => onDeleteAddress(address._id)}>
                      Xóa
                    </button>
                  </div>
                </div>
              </article>
            ))}
            {!addresses.length ? (
              <div className="empty-state compact-empty">
                <strong>Chưa có địa chỉ giao hàng.</strong>
                <p className="muted">Hãy tạo ít nhất một địa chỉ để đặt mua sản phẩm nhanh hơn.</p>
              </div>
            ) : null}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Đơn hàng" subtitle="Mở trang quản lý đơn hàng" className="wide">
        <div className="actions-row wrap">
          <AppLink to="/orders" className="route-pill">
            Mở trang đơn hàng
          </AppLink>
          <span className="route-pill">{orders.length} đơn hàng</span>
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
                <p>
                  {review.score}/5 | {compactText(review.comment || 'Không có nội dung', 90)}
                </p>
              </div>
              <div className="resource-item__meta">
                <small>{review.isVisible ? 'Đang hiển thị' : 'Đã ẩn'}</small>
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
};

export default AccountView;
