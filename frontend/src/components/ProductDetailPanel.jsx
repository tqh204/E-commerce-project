import { useState } from 'react';
import { formatPrice, joinLocation } from '../utils/format';
import { CONDITION_LABELS, SALE_TYPE_LABELS, SOURCE_LABELS } from '../utils/constants';

const CONDITION_COLORS = {
  new: 'badge-new', like_new: 'badge-new', good: 'badge-good',
  fair: 'badge-used', poor: 'badge-used',
};
const SOURCE_COLORS = { chotot: 'badge-chotot', manual: 'badge-manual' };

const avatarColor = (name = '') => {
  const colors = ['#c55d29', '#425e3f', '#2563eb', '#7c3aed', '#0891b2', '#d97706'];
  return colors[(name.charCodeAt(0) || 0) % colors.length];
};

const ProductDetailPanel = ({
  product, auction, user, relatedProducts,
  onCreateOrder, onPlaceBid, onStartConversation, onViewStore, onSelectProduct,
}) => {
  const allImages = product.images?.length ? product.images :
    product.thumbnailImage ? [product.thumbnailImage] : [];
  const [activeImg, setActiveImg] = useState(0);

  const sellerName = product.seller?.fullName || product.seller?.username || 'Người bán';
  const isSeller = user && String(user._id) === String(product.seller?._id || product.seller);

  return (
    <div className="detail-panel">
      {/* Ảnh sản phẩm */}
      <div className="detail-images">
        <div className="detail-hero">
          {allImages[activeImg]
            ? <img src={allImages[activeImg]} alt={product.title} />
            : <div style={{ width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:52,color:'#c4a98e' }}>📦</div>}
        </div>
        {allImages.length > 1 && (
          <div className="detail-thumbs">
            {allImages.map((img, i) => (
              <div key={i} className={`detail-thumb${activeImg === i ? ' active' : ''}`} onClick={() => setActiveImg(i)}>
                <img src={img} alt="" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tiêu đề & badges */}
      <div className="card-badges" style={{ marginBottom: 8 }}>
        <span className={`badge ${SALE_TYPE_LABELS[product.saleType] ? 'badge-' + product.saleType?.replace('_price','').replace('fixed','fixed') : ''}`}
          style={{ background: product.saleType === 'auction' ? 'rgba(197,93,41,0.12)' : 'rgba(66,94,63,0.12)', color: product.saleType === 'auction' ? '#8a3f1e' : '#425e3f' }}>
          {SALE_TYPE_LABELS[product.saleType] || product.saleType}
        </span>
        {product.condition && <span className={`badge ${CONDITION_COLORS[product.condition] || 'badge-used'}`}>{CONDITION_LABELS[product.condition] || product.condition}</span>}
        {product.source && <span className={`badge ${SOURCE_COLORS[product.source] || 'badge-manual'}`}>{SOURCE_LABELS[product.source] || product.source}</span>}
      </div>

      <h3 style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.3, marginBottom: 4 }}>{product.title}</h3>
      <div className="detail-price">{formatPrice(product.price)} ₫</div>

      {product.description && <p className="detail-desc">{product.description}</p>}

      {/* Thông tin chi tiết */}
      <div className="detail-meta">
        <div className="detail-meta-item">
          <div className="detail-meta-label">Danh mục</div>
          <div className="detail-meta-value">{product.category?.name || 'N/A'}</div>
        </div>
        <div className="detail-meta-item">
          <div className="detail-meta-label">Lượt xem</div>
          <div className="detail-meta-value">👁 {product.viewsCount || 0}</div>
        </div>
        <div className="detail-meta-item">
          <div className="detail-meta-label">Khu vực</div>
          <div className="detail-meta-value">{joinLocation(product.ward, product.district, product.province)}</div>
        </div>
        <div className="detail-meta-item">
          <div className="detail-meta-label">Yêu thích</div>
          <div className="detail-meta-value">❤️ {product.favoritesCount || 0}</div>
        </div>
      </div>

      {/* Đấu giá */}
      {auction && (
        <div className="accent-box" style={{ marginBottom: 12 }}>
          <p style={{ fontWeight: 700, marginBottom: 6 }}>🔨 Thông tin đấu giá</p>
          <div className="detail-meta" style={{ marginBottom: 0 }}>
            <div className="detail-meta-item">
              <div className="detail-meta-label">Giá hiện tại</div>
              <div className="detail-meta-value" style={{ color: 'var(--accent)' }}>{formatPrice(auction.currentBid || auction.startingBid)} ₫</div>
            </div>
            <div className="detail-meta-item">
              <div className="detail-meta-label">Kết thúc</div>
              <div className="detail-meta-value">{auction.endAt ? new Date(auction.endAt).toLocaleString('vi-VN') : 'N/A'}</div>
            </div>
          </div>
        </div>
      )}

      {/* Thông tin người bán */}
      <div className="seller-card">
        <div className="seller-avatar" style={{ background: avatarColor(sellerName) }}>
          {sellerName.charAt(0).toUpperCase()}
        </div>
        <div className="seller-info">
          <div className="seller-name">{sellerName}</div>
          <div className="seller-sub">{joinLocation(product.ward, product.district, product.province)}</div>
        </div>
        {onViewStore && (
          <button className="seller-card-btn" onClick={() => onViewStore(product.seller?._id || product.seller)}>
            🏪 Gian hàng
          </button>
        )}
      </div>

      {/* Nút hành động */}
      {!isSeller && (
        <div className="detail-actions">
          {product.saleType !== 'auction' && (
            <button className="btn-lg" onClick={onCreateOrder} disabled={!user}>
              🛒 Mua ngay
            </button>
          )}
          <div className="detail-actions-row">
            {auction && (
              <button className="btn-lg btn-success" onClick={onPlaceBid} disabled={!user || !auction}>
                🔨 Đặt giá
              </button>
            )}
            <button className="btn-lg btn-outline" onClick={onStartConversation} disabled={!user} style={{ justifyContent: 'center' }}>
              💬 Chat người bán
            </button>
          </div>
          {!user && <p className="muted tiny" style={{ textAlign: 'center' }}>Vui lòng đăng nhập để mua hàng</p>}
        </div>
      )}
      {isSeller && (
        <div className="accent-box" style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
          Đây là sản phẩm của bạn
        </div>
      )}

      {/* Sản phẩm liên quan */}
      {relatedProducts?.length > 0 && (
        <div className="related-section">
          <h4>📌 Sản phẩm liên quan</h4>
          <div className="related-cards">
            {relatedProducts.filter(p => p._id !== product._id).slice(0, 6).map((rp) => (
              <div key={rp._id} className="related-card" onClick={() => onSelectProduct(rp._id)}>
                <div className="related-thumb">
                  {rp.thumbnailImage
                    ? <img src={rp.thumbnailImage} alt={rp.title} />
                    : <div className="related-thumb-ph">📦</div>}
                </div>
                <div className="related-body">
                  <div className="related-title">{rp.title}</div>
                  <div className="related-price">{formatPrice(rp.price)} ₫</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetailPanel;
