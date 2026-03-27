import SectionCard from '../../shared/SectionCard';
import AppLink from '../../shared/AppLink';
import { ESCROW_ACTIONS } from '@frontend-utils/constants';
import { compactText, formatDateTime, formatPrice } from '@frontend-utils/format';

const EscrowDetailPage = ({ selectedEscrow, onEscrowAction }) => (
  <>
    <section className="detail-intro section-card wide">
      <div>
        <p className="eyebrow">Escrow detail</p>
        <h2>Quan ly giao dich giu tien trung gian va doi chieu don hang theo tung escrow rieng.</h2>
      </div>
      <div className="tag-row">
        <AppLink to="/account" className="route-pill">
          /account
        </AppLink>
        <span className="route-pill">{selectedEscrow?.status || 'dang tai du lieu'}</span>
      </div>
    </section>

    {!selectedEscrow ? (
      <SectionCard title="Dang tai escrow" subtitle="GET /api/escrows/:id" className="wide">
        <p className="muted">Escrow detail se hien o day sau khi frontend tai xong du lieu.</p>
      </SectionCard>
    ) : (
      <div className="view-grid">
        <SectionCard
          title={selectedEscrow.order?.orderCode || selectedEscrow._id}
          subtitle="Escrow transaction"
          className="wide"
          actions={
            <div className="actions-row wrap">
              {selectedEscrow.order?._id ? (
                <AppLink to={`/orders/${selectedEscrow.order._id}`} className="route-pill">
                  Xem order
                </AppLink>
              ) : null}
            </div>
          }
        >
          <div className="detail-stats">
            <div className="detail-stat-card">
              <span>Trang thai</span>
              <strong>{selectedEscrow.status}</strong>
            </div>
            <div className="detail-stat-card">
              <span>So tien</span>
              <strong>{formatPrice(selectedEscrow.amount)} VND</strong>
            </div>
            <div className="detail-stat-card">
              <span>Buyer</span>
              <strong>{selectedEscrow.buyer?.fullName || selectedEscrow.buyer?.username || 'n/a'}</strong>
            </div>
            <div className="detail-stat-card">
              <span>Seller</span>
              <strong>{selectedEscrow.seller?.fullName || selectedEscrow.seller?.username || 'n/a'}</strong>
            </div>
          </div>

          <div className="detail-grid">
            <div className="detail-panel">
              <h4>Moc thoi gian</h4>
              <div className="meta-grid">
                <span>Tao luc: {formatDateTime(selectedEscrow.createdAt)}</span>
                <span>Hold luc: {formatDateTime(selectedEscrow.heldAt)}</span>
                <span>Release luc: {formatDateTime(selectedEscrow.releasedAt)}</span>
                <span>Refund luc: {formatDateTime(selectedEscrow.refundedAt)}</span>
                <span>Tranh chap luc: {formatDateTime(selectedEscrow.disputeOpenedAt)}</span>
                <span>Resolved: {formatDateTime(selectedEscrow.resolvedAt)}</span>
              </div>
            </div>

            <div className="detail-panel">
              <h4>Ghi chu</h4>
              <p>{compactText(selectedEscrow.disputeReason || selectedEscrow.resolutionNotes || 'Chua co ghi chu.', 220)}</p>
            </div>
          </div>

          <div className="actions-row wrap">
            {ESCROW_ACTIONS.map((action) => (
              <button key={action} type="button" onClick={() => onEscrowAction(selectedEscrow._id, action)}>
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
