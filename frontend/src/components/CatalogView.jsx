import { formatPrice, joinLocation } from '../utils/format';
import { CONDITION_LABELS, SALE_TYPE_LABELS, SOURCE_LABELS } from '../utils/constants';
import ProductDetailPanel from './ProductDetailPanel';

const CONDITION_COLORS = {
  new: 'badge-new', like_new: 'badge-new', good: 'badge-good',
  fair: 'badge-used', poor: 'badge-used',
};

const CatalogView = ({
  products, categories, filters, setFilters,
  loadProducts, selectedProduct, selectedAuction,
  onSelectProduct, onCreateOrder, onPlaceBid, onStartConversation,
  onViewStore, relatedProducts, user,
  page, totalPages, total, onPageChange,
}) => {
  const handleSearch = (e) => { e.preventDefault(); loadProducts(); };
  const handleReset = () => {
    setFilters({ q: '', saleType: '', source: '', categoryId: '', minPrice: '', maxPrice: '' });
    setTimeout(() => loadProducts(), 0);
  };

  const pages = Array.from({ length: totalPages || 1 }, (_, i) => i + 1)
    .filter(p => p === 1 || p === totalPages || Math.abs(p - (page || 1)) <= 2)
    .reduce((acc, p, i, arr) => {
      if (i > 0 && arr[i - 1] !== p - 1) acc.push('...');
      acc.push(p);
      return acc;
    }, []);

  return (
    <>
      {/* Bộ lọc */}
      <section className="panel filter-panel">
        <div className="section-head">
          <h3>🔍 Tìm kiếm & Lọc</h3>
          <button className="btn-ghost btn-sm" onClick={handleReset}>Xóa bộ lọc</button>
        </div>

        <form onSubmit={handleSearch}>
          <div className="search-bar">
            <input
              id="search-input"
              value={filters.q}
              onChange={(e) => setFilters(f => ({ ...f, q: e.target.value }))}
              placeholder="🔎 Tìm kiếm sản phẩm..."
            />
            <button type="submit">Tìm</button>
          </div>

          <div className="filter-grid">
            <select
              id="filter-category"
              value={filters.categoryId}
              onChange={(e) => setFilters(f => ({ ...f, categoryId: e.target.value }))}
            >
              <option value="">Tất cả danh mục</option>
              {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>

            <select
              id="filter-saletype"
              value={filters.saleType}
              onChange={(e) => setFilters(f => ({ ...f, saleType: e.target.value }))}
            >
              <option value="">Tất cả loại bán</option>
              <option value="fixed_price">🏷️ Mua ngay</option>
              <option value="auction">🔨 Đấu giá</option>
            </select>

            <select
              id="filter-source"
              value={filters.source}
              onChange={(e) => setFilters(f => ({ ...f, source: e.target.value }))}
            >
              <option value="">Tất cả nguồn</option>
              <option value="manual">✋ Thủ công</option>
              <option value="chotot">🛒 Chợ Tốt</option>
            </select>

            <div />

            <div className="filter-row">
              <input
                id="filter-min-price"
                type="number"
                value={filters.minPrice || ''}
                onChange={(e) => setFilters(f => ({ ...f, minPrice: e.target.value }))}
                placeholder="Giá từ (₫)"
                min="0"
              />
              <span className="filter-sep">–</span>
              <input
                id="filter-max-price"
                type="number"
                value={filters.maxPrice || ''}
                onChange={(e) => setFilters(f => ({ ...f, maxPrice: e.target.value }))}
                placeholder="Đến (₫)"
                min="0"
              />
            </div>

            <div className="filter-actions">
              <button type="submit" id="apply-filter-btn">✅ Áp dụng</button>
            </div>
          </div>
        </form>
      </section>

      {/* Danh sách sản phẩm */}
      <section style={{ display: 'grid', gap: 16 }}>
        <div className="panel">
          <div className="section-head">
            <h3>📦 Danh sách sản phẩm</h3>
            <span className="product-count">{total || products.length} sản phẩm</span>
          </div>

          {products.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🔍</div>
              <p>Không tìm thấy sản phẩm nào.<br />Thử thay đổi bộ lọc!</p>
            </div>
          ) : (
            <div className="cards">
              {products.map(product => (
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
                      <span className="badge" style={{
                        background: product.saleType === 'auction' ? 'rgba(197,93,41,0.12)' : 'rgba(66,94,63,0.12)',
                        color: product.saleType === 'auction' ? '#8a3f1e' : '#425e3f',
                      }}>
                        {SALE_TYPE_LABELS[product.saleType] || product.saleType}
                      </span>
                      {product.condition && (
                        <span className={`badge ${CONDITION_COLORS[product.condition] || 'badge-used'}`}>
                          {CONDITION_LABELS[product.condition] || product.condition}
                        </span>
                      )}
                    </div>
                    <div className="card-title">{product.title}</div>
                    <div className="card-price">{formatPrice(product.price)} ₫</div>
                    <div className="card-location">
                      📍 {joinLocation(product.ward, product.district, product.province)}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                      👁 {product.viewsCount || 0} · {SOURCE_LABELS[product.source] || product.source}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Phân trang */}
          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="page-btn"
                onClick={() => onPageChange((page || 1) - 1)}
                disabled={(page || 1) <= 1}
              >‹</button>

              {pages.map((p, i) =>
                p === '...'
                  ? <span key={`e-${i}`} className="page-info">…</span>
                  : <button
                      key={p}
                      className={`page-btn${p === (page || 1) ? ' active' : ''}`}
                      onClick={() => onPageChange(p)}
                    >{p}</button>
              )}

              <button
                className="page-btn"
                onClick={() => onPageChange((page || 1) + 1)}
                disabled={(page || 1) >= totalPages}
              >›</button>

              <span className="page-info">Trang {page || 1}/{totalPages}</span>
            </div>
          )}
        </div>

        {/* Chi tiết sản phẩm */}
        {selectedProduct && (
          <div className="panel">
            <div className="section-head" style={{ marginBottom: 16 }}>
              <button className="back-btn btn-sm" onClick={() => onSelectProduct(null)}>
                ← Quay lại danh sách
              </button>
              <span className="badge badge-active">Chi tiết sản phẩm</span>
            </div>
            <ProductDetailPanel
              product={selectedProduct}
              auction={selectedAuction}
              user={user}
              relatedProducts={relatedProducts}
              onCreateOrder={onCreateOrder}
              onPlaceBid={onPlaceBid}
              onStartConversation={onStartConversation}
              onViewStore={onViewStore}
              onSelectProduct={onSelectProduct}
            />
          </div>
        )}
      </section>
    </>
  );
};

export default CatalogView;
