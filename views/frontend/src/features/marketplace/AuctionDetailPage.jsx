import SectionCard from '../../shared/SectionCard';
import AppLink from '../../shared/AppLink';
import { formatDateTime, formatPrice } from '@frontend-utils/format';

const AuctionDetailPage = ({
  selectedAuctionDetail,
  user,
  isAdmin,
  onPlaceBidForAuction,
  onCloseAuction,
  onEditAuction,
}) => {
  const auction = selectedAuctionDetail?.auction;
  const bids = selectedAuctionDetail?.bids || [];
  const isOwner = user?._id && auction?.seller && String(auction.seller._id || auction.seller) === String(user._id);

  return (
    <>
      <section className="detail-intro section-card wide">
        <div>
          <p className="eyebrow">Auction detail</p>
          <h2>Theo doi current bid, lich su dat gia va dong auction tren mot page rieng.</h2>
        </div>
        <div className="tag-row">
          <AppLink to="/" className="route-pill">
            / 
          </AppLink>
          <span className="route-pill">{auction?.status || 'dang tai du lieu'}</span>
        </div>
      </section>

      {!auction ? (
        <SectionCard title="Dang tai auction" subtitle="GET /api/auctions/:id" className="wide">
          <p className="muted">Auction detail se hien o day sau khi frontend tai xong du lieu.</p>
        </SectionCard>
      ) : (
        <div className="view-grid">
          <SectionCard
            title={auction.product?.title || 'Auction'}
            subtitle={auction._id}
            className="wide"
            actions={
              <div className="actions-row wrap">
                {auction.product?._id ? (
                  <AppLink to={`/products/${auction.product._id}`} className="route-pill">
                    Ve san pham
                  </AppLink>
                ) : null}
                {isOwner ? (
                  <button type="button" className="route-pill route-pill--button" onClick={() => onEditAuction(auction)}>
                    Sua auction
                  </button>
                ) : null}
              </div>
            }
          >
            <div className="detail-stats">
              <div className="detail-stat-card">
                <span>Current bid</span>
                <strong>{formatPrice(auction.currentBid || auction.startingBid)} VND</strong>
              </div>
              <div className="detail-stat-card">
                <span>Buoc gia</span>
                <strong>{formatPrice(auction.bidStep || 0)} VND</strong>
              </div>
              <div className="detail-stat-card">
                <span>Nguoi dang dan</span>
                <strong>{auction.winnerUser?.fullName || auction.winnerUser?.username || 'chua co'}</strong>
              </div>
              <div className="detail-stat-card">
                <span>Total bids</span>
                <strong>{auction.totalBids || bids.length}</strong>
              </div>
            </div>

            <div className="detail-grid">
              <div className="detail-panel">
                <h4>Moc thoi gian</h4>
                <div className="meta-grid">
                  <span>Bat dau: {formatDateTime(auction.startAt)}</span>
                  <span>Ket thuc: {formatDateTime(auction.endAt)}</span>
                  <span>Last bid: {formatDateTime(auction.lastBidAt)}</span>
                  <span>Reserve: {formatPrice(auction.reservePrice || 0)} VND</span>
                </div>
              </div>

              <div className="detail-panel">
                <h4>Nguoi ban</h4>
                <p>{auction.seller?.fullName || auction.seller?.username || 'n/a'}</p>
                <div className="actions-row wrap">
                  <AppLink to={`/users/${auction.seller?._id || auction.seller}`} className="route-pill">
                    Xem gian hang
                  </AppLink>
                </div>
              </div>
            </div>

            <div className="actions-row wrap">
              <button type="button" onClick={() => onPlaceBidForAuction(auction._id)} disabled={!user || isOwner}>
                Dat gia ngay
              </button>
              {(isOwner || isAdmin) ? (
                <button type="button" onClick={() => onCloseAuction(auction._id)}>
                  Dong auction
                </button>
              ) : null}
            </div>
          </SectionCard>

          <SectionCard title="Lich su bid" subtitle={`${bids.length} luot gan nhat`} className="wide">
            <div className="resource-list">
              {bids.map((bid) => (
                <article key={bid._id} className="resource-item">
                  <div>
                    <strong>{bid.bidder?.fullName || bid.bidder?.username || 'Bidder'}</strong>
                    <p>{formatDateTime(bid.createdAt)}</p>
                  </div>
                  <div className="resource-item__meta">
                    <span>{formatPrice(bid.amount)} VND</span>
                    <small>{bid.isWinning ? 'dang dan' : bid.status || 'bid'}</small>
                  </div>
                </article>
              ))}
              {!bids.length ? (
                <div className="empty-state compact-empty">
                  <strong>Chua co bid nao.</strong>
                  <p className="muted">Khi user dat gia, lich su se hien tai day.</p>
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
