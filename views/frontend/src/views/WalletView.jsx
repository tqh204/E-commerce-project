import SectionCard from '../components/SectionCard';
import { compactText, formatDateTime, formatPrice } from '@frontend-utils/format';

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

const WalletView = ({
  user,
  walletTopUpForm,
  setWalletTopUpForm,
  onTopUpWallet,
  walletTransactions = [],
}) => {
  const availableBalance = Math.max(
    Number(user?.balance || 0) - Number(user?.lockedBalance || 0),
    0
  );

  return (
    <div className="view-grid">
      <SectionCard title="Ví tiền" subtitle="Số dư, nạp tiền và lịch sử giao dịch" className="wide">
        {user ? (
          <div className="stack gap-sm">
            <div className="meta-grid">
              <span>Số dư ví: {formatPrice(user.balance || 0)} VND</span>
              <span>Tiền đang khóa: {formatPrice(user.lockedBalance || 0)} VND</span>
              <span>Số dư khả dụng: {formatPrice(availableBalance)} VND</span>
            </div>

            <form className="actions-row wrap" onSubmit={onTopUpWallet}>
              <input
                type="number"
                min="10000"
                step="10000"
                value={walletTopUpForm.amount}
                onChange={(event) =>
                  setWalletTopUpForm((current) => ({ ...current, amount: event.target.value }))
                }
                placeholder="Số tiền muốn nạp"
              />
              <button type="submit">Nạp tiền vào ví</button>
            </form>

            <div className="resource-list">
              {walletTransactions.map((item) => (
                <article key={item._id} className="resource-item">
                  <div>
                    <strong>{WALLET_TYPE_LABELS[item.type] || item.type}</strong>
                    <p>{compactText(item.description || 'Không có ghi chú', 120)}</p>
                    <small>{formatDateTime(item.createdAt)}</small>
                  </div>
                  <div className="resource-item__meta">
                    <span>{DIRECTION_LABELS[item.direction] || item.direction}</span>
                    <strong>{formatPrice(item.amount)} VND</strong>
                    <small>
                      Số dư: {formatPrice(item.balanceAfter || 0)} VND | Khóa: {formatPrice(item.lockedAfter || 0)} VND
                    </small>
                  </div>
                </article>
              ))}

              {!walletTransactions.length ? (
                <div className="empty-state compact-empty">
                  <strong>Chưa có giao dịch ví nào.</strong>
                  <p className="muted">Khi bạn nạp tiền, đặt giá hoặc hoàn tất ký quỹ, lịch sử sẽ hiện ở đây.</p>
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <p className="muted">Đăng nhập để xem ví tiền và nạp thêm số dư.</p>
        )}
      </SectionCard>
    </div>
  );
};

export default WalletView;
