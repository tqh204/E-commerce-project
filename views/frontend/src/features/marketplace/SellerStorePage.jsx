import SectionCard from '../../shared/SectionCard';
import { formatPrice, joinLocation, roleNames } from '@frontend-utils/format';

const SellerStorePage = ({
  sellerProfile,
  sellerProducts,
  onSelectProduct,
  sellerStoreMeta,
  sellerStoreTab,
  onSellerStoreTabChange,
  isSellerStoreLoading,
}) => (
  <div className="view-grid">
    <section className="workspace-hero section-card wide">
      <div>
        <p className="eyebrow">Nguoi ban</p>
        <h2>{sellerProfile?.fullName || sellerProfile?.username || 'Seller store'}</h2>
        <p className="muted">
          Xem cac listing dang ban, thong tin co ban va vai tro cua nguoi ban truoc khi mo chat hoac giao dich.
        </p>
      </div>
      <div className="tag-row">
        <span className="route-pill">{roleNames(sellerProfile?.roles || [])}</span>
        <span className="route-pill">Rating {sellerProfile?.ratingAvg || 0}</span>
        <span className="route-pill">{sellerStoreMeta?.total || sellerProducts.length} listings</span>
      </div>
    </section>

    <SectionCard title="Thong tin seller" subtitle="Store profile" className="wide">
      {sellerProfile ? (
        <div className="seller-store-summary">
          <div className="seller-panel__head">
            <span className="seller-avatar">
              {(sellerProfile.fullName || sellerProfile.username || 'S').slice(0, 1).toUpperCase()}
            </span>
            <div>
              <strong>{sellerProfile.fullName || sellerProfile.username}</strong>
              <p className="muted">{sellerProfile.email}</p>
            </div>
          </div>
          <div className="meta-grid">
            <span>Phone: {sellerProfile.phone || 'n/a'}</span>
            <span>Rating count: {sellerProfile.ratingCount || 0}</span>
            <span>Status: {sellerProfile.isActive ? 'active' : 'inactive'}</span>
            <span>Verified: {sellerProfile.isVerified ? 'yes' : 'no'}</span>
          </div>
        </div>
      ) : (
        <p className="muted">Khong tim thay seller.</p>
      )}
    </SectionCard>

    <SectionCard title="Bo loc gian hang" subtitle="Tabs" className="wide">
      <div className="tag-row">
        {[
          { id: 'active', label: 'Dang ban' },
          { id: 'sold', label: 'Da ban' },
          { id: 'auction', label: 'Auction' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={sellerStoreTab === tab.id ? 'primary-btn' : 'ghost-btn'}
            onClick={() => onSellerStoreTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </SectionCard>

    <SectionCard title="Listing cua nguoi ban" subtitle={`${sellerProducts.length} san pham`} className="wide">
      {isSellerStoreLoading ? (
        <div className="skeleton-grid">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={`seller-skeleton-${index}`} className="skeleton-card" />
          ))}
        </div>
      ) : null}
      {!isSellerStoreLoading ? (
      <div className="resource-list cards-list">
        {sellerProducts.map((product) => (
          <button key={product._id} className="resource-card listing-card listing-card--compact" onClick={() => onSelectProduct(product._id)}>
            <div className="resource-card__image listing-card__image">
              {product.thumbnailImage ? <img src={product.thumbnailImage} alt={product.title} /> : <span>No image</span>}
            </div>
            <div className="listing-card__body">
              <strong className="listing-card__title">{product.title}</strong>
              <span className="price">{formatPrice(product.price)} VND</span>
              <span className="muted">{joinLocation(product.ward, product.district, product.province)}</span>
            </div>
          </button>
        ))}
      </div>
      ) : null}
      {!isSellerStoreLoading && !sellerProducts.length ? (
        <div className="empty-state">
          <strong>Seller nay chua co listing cho tab hien tai.</strong>
          <p className="muted">Thu chuyen sang tab khac de xem san pham dang ban, da ban, hoac auction.</p>
        </div>
      ) : null}
    </SectionCard>
  </div>
);

export default SellerStorePage;
