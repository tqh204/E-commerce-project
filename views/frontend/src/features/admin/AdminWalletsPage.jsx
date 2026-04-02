import SectionCard from '../../shared/SectionCard';
import { formatDateTime, formatPrice, roleNames } from '@frontend-utils/format';

const WALLET_TYPE_LABELS = {
  top_up: 'Nạp tiền',
  auction_bid_reserve: 'Khóa tiền đặt giá',
  auction_bid_release: 'Mở khóa tiền đặt giá',
  escrow_hold: 'Giữ tiền ký quỹ',
  escrow_release: 'Giải ngân ký quỹ',
  escrow_refund: 'Hoàn tiền ký quỹ',
};

const DIRECTION_LABELS = {
  credit: 'Cộng tiền',
  debit: 'Trừ tiền',
  lock: 'Khóa tiền',
  unlock: 'Mở khóa',
};

const AdminWalletsPage = ({
  isAdmin,
  walletUsers = [],
  walletTransactions = [],
  walletAdminForm,
  setWalletAdminForm,
  onAdminTopUpWallet,
  onSelectWalletUser,
}) => {
  if (!isAdmin) {
    return (
      <SectionCard title="Ví tiền" subtitle="Giới hạn quyền truy cập">
        <p className="muted">Chỉ tài khoản quản trị viên mới có thể xem dữ liệu ví của toàn hệ thống.</p>
      </SectionCard>
    );
  }

  return (
    <div className="view-grid">
      <SectionCard title="Ví tiền người dùng" subtitle="Quản lý số dư, số tiền đang khóa và nạp tiền thủ công" className="wide">
        <form className="form-grid form-grid--three" onSubmit={onAdminTopUpWallet}>
          <select
            value={walletAdminForm.userId}
            onChange={(event) => {
              setWalletAdminForm((current) => ({ ...current, userId: event.target.value }));
              onSelectWalletUser?.(event.target.value);
            }}
            required
          >
            <option value="">Chọn người dùng</option>
            {walletUsers.map((item) => (
              <option key={item._id} value={item._id}>
                {item.fullName || item.username} ({item.username})
              </option>
            ))}
          </select>
          <input
            type="number"
            min="10000"
            step="10000"
            value={walletAdminForm.amount}
            onChange={(event) =>
              setWalletAdminForm((current) => ({ ...current, amount: event.target.value }))
            }
            placeholder="Số tiền nạp"
            required
          />
          <input
            value={walletAdminForm.description}
            onChange={(event) =>
              setWalletAdminForm((current) => ({ ...current, description: event.target.value }))
            }
            placeholder="Ghi chú giao dịch"
          />
          <button type="submit" className="primary-btn">
            Nạp ví cho người dùng
          </button>
        </form>

        <div className="resource-list admin-resource-list">
          {walletUsers.map((item) => (
            <article key={item._id} className="resource-item admin-item-card">
              <div>
                <strong>{item.fullName || item.username}</strong>
                <p>{item.email}</p>
                <small>{roleNames(item.roles)} | {item.isActive ? 'đang hoạt động' : 'đã khóa'}</small>
              </div>
              <div className="resource-item__meta">
                <strong>Số dư: {formatPrice(item.balance)} VND</strong>
                <small>Khóa: {formatPrice(item.lockedBalance)} VND</small>
                <small>Khả dụng: {formatPrice(item.availableBalance)} VND</small>
              </div>
            </article>
          ))}

          {!walletUsers.length ? (
            <div className="empty-state compact-empty">
              <strong>Chưa có dữ liệu ví người dùng.</strong>
              <p className="muted">Khi người dùng nạp tiền hoặc giao dịch, số dư sẽ hiển thị tại đây.</p>
            </div>
          ) : null}
        </div>
      </SectionCard>

      <SectionCard title="Lịch sử giao dịch ví" subtitle="Theo dõi nạp tiền, khóa tiền và giải ngân" className="wide">
        <div className="resource-list">
          {walletTransactions.map((item) => (
            <article key={item._id} className="resource-item">
              <div>
                <strong>{item.user?.fullName || item.user?.username || 'Người dùng'}</strong>
                <p>{WALLET_TYPE_LABELS[item.type] || item.type}</p>
                <small>{item.description || 'Không có ghi chú'}</small>
              </div>
              <div className="resource-item__meta">
                <span>{DIRECTION_LABELS[item.direction] || item.direction}</span>
                <strong>{formatPrice(item.amount)} VND</strong>
                <small>{formatDateTime(item.createdAt)}</small>
              </div>
            </article>
          ))}

          {!walletTransactions.length ? (
            <div className="empty-state compact-empty">
              <strong>Chưa có giao dịch ví nào.</strong>
              <p className="muted">Lịch sử nạp tiền và escrow sẽ hiển thị ở đây.</p>
            </div>
          ) : null}
        </div>
      </SectionCard>
    </div>
  );
};

export default AdminWalletsPage;
