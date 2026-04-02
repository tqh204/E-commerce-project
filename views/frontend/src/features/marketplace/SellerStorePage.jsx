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
        <p className="eyebrow">Gian hàng</p>
        <h2>{sellerProfile?.fullName || sellerProfile?.username || 'Gian hàng người dùng'}</h2>
        <p className="muted">
          Xem các listing đang hiển thị, thông tin cơ bản và mức độ uy tín trước khi mở chat hoặc giao dịch.
        </p>
      </div>
      <div className="tag-row">
        <span className="route-pill">{roleNames(sellerProfile?.roles || [])}</span>
        <span className="route-pill">Đánh giá {sellerProfile?.ratingAvg || 0}</span>
        <span className="route-pill">{sellerStoreMeta?.total || sellerProducts.length} listings</span>
      </div>
    </section>

    <SectionCard title="Thông tin gian hàng" subtitle="Hồ sơ người đăng bán" className="wide">
      {sellerProfile ? (
        <div className="seller-store-summary">
          <div className="seller-panel__head">
            <span className="seller-avatar">
              {(sellerProfile.fullName || sellerProfile.username || 'G').slice(0, 1).toUpperCase()}
            </span>
            <div>
              <strong>{sellerProfile.fullName || sellerProfile.username}</strong>
              <p className="muted">{sellerProfile.bio || sellerProfile.username || 'Người dùng ChoMarket'}</p>
            </div>
          </div>
          <div className="meta-grid">
            <span>Số điện thoại: {sellerProfile.phone || 'n/a'}</span>
            <span>Số lượt đánh giá: {sellerProfile.ratingCount || 0}</span>
            <span>Trạng thái: {sellerProfile.isActive ? 'đang hoạt động' : 'không hoạt động'}</span>
            <span>Xác minh: {sellerProfile.isVerified ? 'đã xác minh' : 'chưa xác minh'}</span>
          </div>
        </div>
      ) : (
        <p className="muted">Không tìm thấy thông tin gian hàng.</p>
      )}
    </SectionCard>

    <SectionCard title="Bộ lọc gian hàng" subtitle="Chuyển nhanh theo nhóm sản phẩm" className="wide">
      <div className="tag-row">
        {[
          { id: 'active', label: 'Đang bán' },
          { id: 'sold', label: 'Đã bán' },
          { id: 'auction', label: 'Đấu giá' },
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

    <SectionCard title="Listing trong gian hàng" subtitle={`${sellerProducts.length} sản phẩm`} className="wide">
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
          <strong>Gian hàng này chưa có listing cho tab hiện tại.</strong>
          <p className="muted">Thử chuyển sang tab khác để xem sản phẩm đang bán, đã bán hoặc đấu giá.</p>
        </div>
      ) : null}
    </SectionCard>
  </div>
);

export default SellerStorePage;
