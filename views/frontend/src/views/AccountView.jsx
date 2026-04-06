import SectionCard from '../components/SectionCard';
import AppLink from '../components/AppLink';
import { roleNames } from '@frontend-utils/format';

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
}) => {
  const addressPreview =
    [addressForm.street, addressForm.ward, addressForm.district, addressForm.province]
      .filter(Boolean)
      .join(', ') || 'Địa chỉ đầy đủ sẽ hiển thị ở đây sau khi bạn nhập xong.';

  const profileInitials = (user?.fullName || user?.username || 'U')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();

  return (
    <div className="view-grid">
      <SectionCard title="Hồ sơ" subtitle="Thông tin tài khoản">
        {user ? (
          <form className="profile-card" onSubmit={onSaveProfile}>
            <div className="profile-header">
              <div className="profile-avatar">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.fullName || user.username} />
                ) : (
                  <span>{profileInitials}</span>
                )}
              </div>
              <div className="profile-header__meta">
                <strong>{user.fullName || user.username}</strong>
                <span className="muted">{user.email}</span>
              </div>
              <div className="profile-stat-grid">
                <div>
                  <span className="muted">Username</span>
                  <strong>{user.username}</strong>
                </div>
                <div>
                  <span className="muted">Vai trò</span>
                  <strong>{roleNames(user.roles)}</strong>
                </div>
                <div>
                  <span className="muted">Đánh giá</span>
                  <strong>{user.ratingAvg || 0}</strong>
                </div>
              </div>
            </div>

            <div className="workspace-note profile-note">
              <strong>Tài khoản giao dịch dùng role chung</strong>
              <span className="muted">
                Một tài khoản user có thể vừa mua hàng, vừa đăng bán, nhắn tin và tham gia đấu giá.
                Chỉ tài khoản admin mới có quyền quản trị toàn hệ thống.
              </span>
            </div>

            <div className="profile-form-grid">
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
            </div>

            <button type="submit" className="primary-btn">Cập nhật hồ sơ</button>
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
              <strong>Tên người nhận và số điện thoại có thể lấy sẵn từ hồ sơ</strong>
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
    </div>
  );
};

export default AccountView;
