import { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { formatPrice, joinLocation } from '../utils/format';
import { SALE_TYPE_LABELS } from '../utils/constants';

const avatarColor = (name = '') => {
  const colors = ['#c55d29', '#425e3f', '#2563eb', '#7c3aed', '#0891b2', '#d97706'];
  return colors[(name.charCodeAt(0) || 0) % colors.length];
};

const SellerStorePage = ({ sellerId, user, onSelectProduct, onBack, onStartConversation }) => {
  const [seller, setSeller] = useState(null);
  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sellerId) return;
    setLoading(true);
    Promise.all([
      api.sellerInfo(sellerId).catch(() => null),
      api.sellerProducts(sellerId, { page: 1, limit: 12 }),
    ]).then(([sellerPayload, productsPayload]) => {
      if (sellerPayload?.data) setSeller(sellerPayload.data);
      setProducts(productsPayload.data || []);
      setTotal(productsPayload.meta?.total || 0);
      setTotalPages(productsPayload.meta?.totalPages || 1);
      setPage(1);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [sellerId]);

  const loadPage = async (p) => {
    setLoading(true);
    try {
      const payload = await api.sellerProducts(sellerId, { page: p, limit: 12 });
      setProducts(payload.data || []);
      setTotal(payload.meta?.total || 0);
      setTotalPages(payload.meta?.totalPages || 1);
      setPage(p);
    } finally {
      setLoading(false);
    }
  };

  const sellerName = seller?.fullName || seller?.username || 'Người bán';
  const sellerLocation = joinLocation(seller?.ward, seller?.district, seller?.province);

  return (
    <section className="panel">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <button className="back-btn btn-sm" onClick={onBack}>← Quay lại</button>
        <span style={{ fontSize: 14, color: 'var(--muted)' }}>Gian hàng người bán</span>
      </div>

      {/* Seller Info */}
      <div className="store-header">
        <div className="store-avatar" style={{ background: avatarColor(sellerName) }}>
          {sellerName.charAt(0).toUpperCase()}
        </div>
        <div className="store-info">
          <div className="store-name">{sellerName}</div>
          {sellerLocation !== 'Không rõ vị trí' && (
            <div className="store-sub">📍 {sellerLocation}</div>
          )}
          {seller?.email && <div className="store-sub" style={{ marginTop: 2 }}>✉️ {seller.email}</div>}
          <div className="store-stats">
            <div className="store-stat">
              <div className="store-stat-val">{total}</div>
              <div className="store-stat-lbl">Sản phẩm</div>
            </div>
            {seller?.ratingAvg > 0 && (
              <div className="store-stat">
                <div className="store-stat-val">⭐ {seller.ratingAvg?.toFixed(1)}</div>
                <div className="store-stat-lbl">Đánh giá</div>
              </div>
            )}
          </div>
        </div>
        {user && String(user._id) !== sellerId && (
          <div className="store-actions">
            <button className="btn-outline btn-sm" onClick={() => onStartConversation && onStartConversation(sellerId)}>
              💬 Nhắn tin
            </button>
          </div>
        )}
      </div>

      {/* Products */}
      <div className="section-head">
        <h3 style={{ fontSize: 16 }}>Sản phẩm đang bán</h3>
        <span className="product-count">{total} sản phẩm</span>
      </div>

      {loading ? (
        <div className="empty-state"><div className="empty-state-icon">⏳</div><p>Đang tải...</p></div>
      ) : products.length === 0 ? (
        <div className="empty-state"><div className="empty-state-icon">📦</div><p>Người bán chưa có sản phẩm nào.</p></div>
      ) : (
        <>
          <div className="cards">
            {products.map((product) => (
              <div
                key={product._id}
                className="product-card"
                onClick={() => onSelectProduct(product._id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && onSelectProduct(product._id)}
              >
                <div className="card-thumb">
                  {product.thumbnailImage
                    ? <img src={product.thumbnailImage} alt={product.title} loading="lazy" />
                    : <div className="card-thumb-placeholder">📦</div>}
                </div>
                <div className="card-body">
                  <div className="card-badges">
                    <span className="badge" style={{ background: product.saleType === 'auction' ? 'rgba(197,93,41,0.12)' : 'rgba(66,94,63,0.12)', color: product.saleType === 'auction' ? '#8a3f1e' : '#425e3f' }}>
                      {SALE_TYPE_LABELS[product.saleType] || product.saleType}
                    </span>
                  </div>
                  <div className="card-title">{product.title}</div>
                  <div className="card-price">{formatPrice(product.price)} ₫</div>
                  <div className="card-location">📍 {joinLocation(product.ward, product.district, product.province)}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <button className="page-btn" onClick={() => loadPage(page - 1)} disabled={page <= 1}>‹</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                .reduce((acc, p, i, arr) => {
                  if (i > 0 && arr[i-1] !== p - 1) acc.push('...');
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) => p === '...'
                  ? <span key={`e-${i}`} className="page-info">…</span>
                  : <button key={p} className={`page-btn${p === page ? ' active' : ''}`} onClick={() => loadPage(p)}>{p}</button>
                )}
              <button className="page-btn" onClick={() => loadPage(page + 1)} disabled={page >= totalPages}>›</button>
            </div>
          )}
        </>
      )}
    </section>
  );
};

export default SellerStorePage;
