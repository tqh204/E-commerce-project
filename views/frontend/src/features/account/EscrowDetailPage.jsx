import SectionCard from '../../shared/SectionCard';
import AppLink from '../../shared/AppLink';
import { ESCROW_ACTIONS } from '@frontend-utils/constants';
import { compactText, formatDateTime, formatPrice } from '@frontend-utils/format';

const EscrowDetailPage = ({ selectedEscrow, onEscrowAction }) => (
  <>
    <section className="detail-intro section-card wide">
      <div>
        <p className="eyebrow">Chi tiết ký quỹ</p>
        <h2>Quản lý giao dịch giữ tiền trung gian và đối chiếu đơn hàng theo từng escrow riêng.</h2>
      </div>
      <div className="tag-row">
        <AppLink to="/account" className="route-pill">
          /account
        </AppLink>
        <span className="route-pill">{selectedEscrow?.status || 'đang tải dữ liệu'}</span>
      </div>
    </section>

    {!selectedEscrow ? (
      <SectionCard title="Đang tải ký quỹ" subtitle="GET /api/escrows/:id" className="wide">
        <p className="muted">Chi tiết ký quỹ sẽ hiện ở đây sau khi frontend tải xong dữ liệu.</p>
      </SectionCard>
    ) : (
      <div className="view-grid">
        <SectionCard
          title={selectedEscrow.order?.orderCode || selectedEscrow._id}
          subtitle="Giao dịch ký quỹ"
          className="wide"
          actions={
            <div className="actions-row wrap">
              {selectedEscrow.order?._id ? (
                <AppLink to={`/orders/${selectedEscrow.order._id}`} className="route-pill">
                  Xem đơn hàng
                </AppLink>
              ) : null}
            </div>
          }
        >
          <div className="detail-stats">
            <div className="detail-stat-card">
              <span>Trạng thái</span>
              <strong>{selectedEscrow.status}</strong>
            </div>
            <div className="detail-stat-card">
              <span>Số tiền</span>
              <strong>{formatPrice(selectedEscrow.amount)} VND</strong>
            </div>
            <div className="detail-stat-card">
              <span>Người mua</span>
              <strong>
                {selectedEscrow.buyer?.fullName || selectedEscrow.buyer?.username || 'n/a'}
              </strong>
            </div>
            <div className="detail-stat-card">
              <span>Người bán</span>
              <strong>
                {selectedEscrow.seller?.fullName || selectedEscrow.seller?.username || 'n/a'}
              </strong>
            </div>
          </div>

          <div className="detail-grid">
            <div className="detail-panel">
              <h4>Mốc thời gian</h4>
              <div className="meta-grid">
                <span>Tạo lúc: {formatDateTime(selectedEscrow.createdAt)}</span>
                <span>Hold lúc: {formatDateTime(selectedEscrow.heldAt)}</span>
                <span>Release lúc: {formatDateTime(selectedEscrow.releasedAt)}</span>
                <span>Refund lúc: {formatDateTime(selectedEscrow.refundedAt)}</span>
                <span>Tranh chấp lúc: {formatDateTime(selectedEscrow.disputeOpenedAt)}</span>
                <span>Resolved: {formatDateTime(selectedEscrow.resolvedAt)}</span>
              </div>
            </div>

            <div className="detail-panel">
              <h4>Ghi chú</h4>
              <p>
                {compactText(
                  selectedEscrow.disputeReason ||
                    selectedEscrow.resolutionNotes ||
                    'Chưa có ghi chú.',
                  220
                )}
              </p>
            </div>
          </div>

          <div className="actions-row wrap">
            {ESCROW_ACTIONS.map((action) => (
              <button
                key={action}
                type="button"
                onClick={() => onEscrowAction(selectedEscrow._id, action)}
              >
                {action}
              </button>
            ))}
          </div>
        </SectionCard>
      </div>
    )}
  </>
);

export default EscrowDetailPage;
