import SectionCard from '../../shared/SectionCard';
import { compactText, formatDateTime } from '@frontend-utils/format';

const NotificationsPage = ({
  notifications = [],
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
}) => (
  <SectionCard title="Thông báo" subtitle="Nạp ví, đơn hàng, chat, đấu giá" className="wide">
    <div className="stack gap-sm">
      <div className="actions-row wrap">
        <button type="button" className="ghost-btn" onClick={onMarkAllNotificationsRead}>
          Đánh dấu đã đọc tất cả
        </button>
      </div>

      <div className="resource-list">
        {notifications.map((item) => (
          <article key={item._id} className={`resource-item${item.isRead ? '' : ' highlight'}`}>
            <div>
              <strong>{item.title}</strong>
              <p>{compactText(item.message || 'Không có nội dung', 160)}</p>
              <small>{formatDateTime(item.createdAt)}</small>
            </div>
            <div className="resource-item__meta">
              <span>{item.type || 'system'}</span>
              {!item.isRead ? (
                <button type="button" onClick={() => onMarkNotificationRead?.(item._id)}>
                  Đánh dấu đã đọc
                </button>
              ) : (
                <small>Đã đọc</small>
              )}
            </div>
          </article>
        ))}

        {!notifications.length ? (
          <div className="empty-state compact-empty">
            <strong>Chưa có thông báo.</strong>
            <p className="muted">Thông báo sẽ hiển thị ở đây khi có nạp ví, đơn hàng, chat, đấu giá.</p>
          </div>
        ) : null}
      </div>
    </div>
  </SectionCard>
);

export default NotificationsPage;
