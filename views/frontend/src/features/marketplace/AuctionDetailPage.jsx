import SectionCard from '../../shared/SectionCard';
import AppLink from '../../shared/AppLink';
import { formatDateTime, formatPrice } from '@frontend-utils/format';

const AuctionDetailPage = ({
  selectedAuctionDetail,
  user,
  isAdmin,
  onPlaceBidForAuction,
  onBuyNowAuction,
  onOpenAuction,
  onCloseAuction,
  onEditAuction,
}) => {
  const auction = selectedAuctionDetail?.auction;
  const bids = selectedAuctionDetail?.bids || [];
  const isOwner =
    user?._id &&
    auction?.seller &&
    String(auction.seller._id || auction.seller) === String(user._id);

  return (
    <>
      <section className="detail-intro section-card wide">
        <div>
          <p className="eyebrow">Đấu giá</p>
          <h2>Theo dõi giá hiện tại, lịch sử ra giá và mua đứt trực tiếp nếu phiên có hỗ trợ.</h2>
        </div>
        <div className="tag-row">
          <AppLink to="/" className="route-pill">
            Trang chủ
          </AppLink>
          <span className="route-pill">{auction?.status || 'đang tải dữ liệu'}</span>
        </div>
      </section>

      {!auction ? (
        <SectionCard title="Đang tải đấu giá" subtitle="GET /api/auctions/:id" className="wide">
          <p className="muted">Chi tiết đấu giá sẽ hiển thị ở đây sau khi tải xong dữ liệu.</p>
        </SectionCard>
      ) : (
        <div className="view-grid">
          <SectionCard
            title={auction.product?.title || 'Đấu giá'}
            subtitle={auction._id}
            className="wide"
            actions={
              <div className="actions-row wrap">
                {auction.product?._id ? (
                  <AppLink to={`/products/${auction.product._id}`} className="route-pill">
                    Về sản phẩm
                  </AppLink>
                ) : null}
                {isOwner ? (
                  <button
                    type="button"
                    className="route-pill route-pill--button"
                    onClick={() => onEditAuction(auction)}
                  >
                    Sửa đấu giá
                  </button>
                ) : null}
              </div>
            }
          >
            <div className="detail-stats">
              <div className="detail-stat-card">
                <span>Giá hiện tại</span>
                <strong>{formatPrice(auction.currentBid || auction.startingBid)} VND</strong>
              </div>
              <div className="detail-stat-card">
                <span>Bước giá</span>
                <strong>{formatPrice(auction.bidStep || 0)} VND</strong>
              </div>
              <div className="detail-stat-card">
                <span>Người đang dẫn</span>
                <strong>{auction.winnerUser?.fullName || auction.winnerUser?.username || 'Chưa có'}</strong>
              </div>
              <div className="detail-stat-card">
                <span>Tổng lượt ra giá</span>
                <strong>{auction.totalBids || bids.length}</strong>
              </div>
            </div>

            <div className="detail-grid">
              <div className="detail-panel">
                <h4>Mốc thời gian</h4>
                <div className="meta-grid">
                  <span>Bắt đầu: {formatDateTime(auction.startAt)}</span>
                  <span>Kết thúc: {formatDateTime(auction.endAt)}</span>
                  <span>Lần ra giá gần nhất: {formatDateTime(auction.lastBidAt)}</span>
                  <span>Giá khởi điểm: {formatPrice(auction.startingBid || 0)} VND</span>
                </div>
              </div>

              <div className="detail-panel">
                <h4>Người mở đấu giá</h4>
                <p>{auction.seller?.fullName || auction.seller?.username || 'n/a'}</p>
                <div className="actions-row wrap">
                  <AppLink to={`/users/${auction.seller?._id || auction.seller}`} className="route-pill">
                    Xem gian hàng
                  </AppLink>
                </div>
              </div>
            </div>

            <div className="actions-row wrap">
              <button
                type="button"
                onClick={() => onPlaceBidForAuction(auction._id)}
                disabled={!user || isOwner || auction.status !== 'live'}
              >
                Đặt giá ngay
              </button>
              {auction.buyNowPrice ? (
                <button
                  type="button"
                  className="primary-btn"
                  onClick={() => onBuyNowAuction(auction._id)}
                  disabled={!user || isOwner || !['scheduled', 'live'].includes(auction.status)}
                >
                  Mua đứt {formatPrice(auction.buyNowPrice)} VND
                </button>
              ) : null}
              {(isOwner || isAdmin) && auction.status !== 'live' ? (
                <button type="button" onClick={() => onOpenAuction(auction._id)}>
                  Mở đấu giá
                </button>
              ) : null}
              {(isOwner || isAdmin) && auction.status === 'live' ? (
                <button type="button" onClick={() => onCloseAuction(auction._id)}>
                  Đóng đấu giá
                </button>
              ) : null}
            </div>
          </SectionCard>

          <SectionCard title="Lịch sử ra giá" subtitle={`${bids.length} lượt gần nhất`} className="wide">
            <div className="resource-list">
              {bids.map((bid) => (
                <article key={bid._id} className="resource-item">
                  <div>
                    <strong>{bid.bidder?.fullName || bid.bidder?.username || 'Người ra giá'}</strong>
                    <p>{formatDateTime(bid.createdAt)}</p>
                  </div>
                  <div className="resource-item__meta">
                    <span>{formatPrice(bid.amount)} VND</span>
                    <small>{bid.isWinning ? 'đang dẫn' : bid.status || 'ra giá'}</small>
                  </div>
                </article>
              ))}
              {!bids.length ? (
                <div className="empty-state compact-empty">
                  <strong>Chưa có lượt ra giá nào.</strong>
                  <p className="muted">Khi người dùng đặt giá, lịch sử sẽ hiển thị tại đây.</p>
                </div>
              ) : null}
            </div>
          </SectionCard>
        </div>
      )}
    </>
  );
};

export default AuctionDetailPage;
