import SectionCard from '../components/SectionCard';
import { compactText, formatDateTime, formatPrice, joinLocation } from '@frontend-utils/format';

const SALE_TYPE_LABELS = {
  fixed_price: 'Mua ngay',
  auction: 'Đấu giá',
};

const STATUS_LABELS = {
  draft: 'Bản nháp',
  pending: 'Chờ duyệt',
  active: 'Đang hiển thị',
  hidden: 'Đã ẩn',
  sold: 'Đã bán',
  rejected: 'Bị từ chối',
  archived: 'Lưu trữ',
};

const CONDITION_LABELS = {
  new: 'Mới',
  like_new: 'Như mới',
  good: 'Tốt',
  fair: 'Khá',
  poor: 'Cần sửa',
};

const getDisplayPrice = (product = {}) =>
  product.saleType === 'auction'
    ? Number(product.currentBid || product.startingBid || product.price || 0)
    : Number(product.price || 0);

const fallbackArtwork = (seed = '') => {
  const palettes = [
    'linear-gradient(135deg, rgba(15,118,110,0.18), rgba(255,247,237,0.92))',
    'linear-gradient(135deg, rgba(249,115,22,0.16), rgba(239,246,255,0.92))',
    'linear-gradient(135deg, rgba(59,130,246,0.16), rgba(255,248,229,0.92))',
    'linear-gradient(135deg, rgba(34,197,94,0.16), rgba(255,255,255,0.92))',
  ];
  let total = 0;
  for (const char of String(seed || '')) total += char.charCodeAt(0);
  return palettes[total % palettes.length];
};

const getSortLabel = (sort = '') => {
  if (sort === 'price_asc') return 'Giá tăng dần';
  if (sort === 'price_desc') return 'Giá giảm dần';
  return 'Mới nhất';
};

const normalizeKeyword = (value = '') => String(value || '').trim().toLowerCase();

const matchesKeyword = (product = {}, keyword = '') => {
  const normalizedKeyword = normalizeKeyword(keyword);
  if (!normalizedKeyword) {
    return true;
  }

  const title = normalizeKeyword(product.title);
  const categoryName = normalizeKeyword(product.category?.name);
  const tags = (product.tags || []).map((tag) => normalizeKeyword(tag)).filter(Boolean);

  return (
    title.includes(normalizedKeyword) ||
    categoryName.includes(normalizedKeyword) ||
    tags.some((tag) => tag.includes(normalizedKeyword))
  );
};

const CatalogView = ({
  user,
  categories,
  products,
  filters,
  setFilters,
  onApplyFilters,
  selectedProduct,
  selectedAuction,
  selectedProductReviews,
  onSelectProduct,
  onViewSellerStore,
  onViewAuctionDetail,
  onCreateOrder,
  onPlaceBid,
  onStartConversation,
  catalogMeta,
  catalogPage,
  onCatalogPageChange,
  isCatalogLoading,
  showFilters = true,
  showCatalog = true,
  showHero = true,
  showShowcase = true,
}) => {
  const browserMode = showFilters && showCatalog;
  const categoryOptions = [...categories].sort((left, right) =>
    String(left?.name || '').localeCompare(String(right?.name || ''), 'vi')
  );
  const keywordMatchedProducts = products.filter((product) => matchesKeyword(product, filters.q));
  const freshProducts = keywordMatchedProducts.slice(0, 4);
  const auctionHighlights = keywordMatchedProducts.filter((item) => item.saleType === 'auction').slice(0, 4);
  const budgetHighlights = [...keywordMatchedProducts]
    .sort((left, right) => getDisplayPrice(left) - getDisplayPrice(right))
    .slice(0, 4);
  const visibleProducts =
    filters.sort === 'price_asc'
      ? [...keywordMatchedProducts].sort((left, right) => getDisplayPrice(left) - getDisplayPrice(right))
      : filters.sort === 'price_desc'
        ? [...keywordMatchedProducts].sort((left, right) => getDisplayPrice(right) - getDisplayPrice(left))
        : keywordMatchedProducts;
  const relatedProducts = selectedProduct
    ? visibleProducts
        .filter((item) => item._id !== selectedProduct._id)
        .filter(
          (item) =>
            String(item.category?._id || item.category || '') ===
            String(selectedProduct.category?._id || selectedProduct.category || '')
        )
        .slice(0, 4)
    : [];

  const applyCategory = (categoryId = '') => onApplyFilters({ ...filters, categoryId });
  const handleSortChange = (event) => {
    const nextFilters = { ...filters, sort: event.target.value };
    setFilters(nextFilters);
    onApplyFilters(nextFilters);
  };

  return (
    <div className="view-grid">
      {showFilters && showHero ? (
        <section className="market-hero section-card wide">
          <div className="market-hero__copy">
            <p className="eyebrow">ChoMarket x Chợ Tốt x Mercari</p>
            <h2>Sản phẩm cũ, auction và giao dịch trực tiếp trên cùng một marketplace.</h2>
            <p className="muted">
              Xem listing mới, lọc theo danh mục và giá, mở chat với người bán, hoặc đặt mua ngay nếu sản phẩm phù hợp.
            </p>
            <div className="market-stats">
              <div className="market-stat">
                <strong>{catalogMeta?.total || products.length}</strong>
                <span>Listing dang hien</span>
              </div>
              <div className="market-stat">
                <strong>{categories.length}</strong>
                <span>Danh mục</span>
              </div>
              <div className="market-stat">
                <strong>{products.filter((item) => item.saleType === 'auction').length}</strong>
                <span>Đấu giá</span>
              </div>
            </div>
          </div>
          <div className="market-hero__panel">
            <div className="hero-note">
              <span className="hero-note__pill">Lọc nhanh</span>
              <strong>Chọn nhanh nhóm sản phẩm đang có sẵn</strong>
              <p className="muted">Danh mục hiển thị từ dữ liệu sẵn có, bấm vào là lọc ngay.</p>
            </div>
            <div className="chip-grid">
              <button
                type="button"
                className={`category-chip${!filters.categoryId ? ' active' : ''}`}
                onClick={() => applyCategory('')}
              >
                Tất cả danh mục
              </button>
              {categoryOptions.slice(0, 8).map((category) => (
                <button
                  key={category._id}
                  type="button"
                  className={`category-chip${filters.categoryId === category._id ? ' active' : ''}`}
                  onClick={() => applyCategory(category._id)}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {showFilters && !browserMode ? (
        <SectionCard title="Tìm sản phẩm" subtitle="Bộ lọc marketplace" className="wide">
          <div className="form-grid form-grid--four market-filter-grid">
            <input
              value={filters.q}
              onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))}
              placeholder="Từ khóa"
            />
            <select
              value={filters.categoryId}
              onChange={(event) => setFilters((current) => ({ ...current, categoryId: event.target.value }))}
            >
              <option value="">Tất cả danh mục</option>
              {categoryOptions.map((category) => (
                <option key={category._id} value={category._id}>
                  {category.name}
                </option>
              ))}
            </select>
            <select
              value={filters.saleType}
              onChange={(event) => setFilters((current) => ({ ...current, saleType: event.target.value }))}
            >
              <option value="">Tất cả hình thức</option>
              <option value="fixed_price">Mua ngay</option>
              <option value="auction">Đấu giá</option>
            </select>
            <select value={filters.sort} onChange={handleSortChange}>
              <option value="">Mới nhất</option>
              <option value="price_asc">Giá tăng dần</option>
              <option value="price_desc">Giá giảm dần</option>
            </select>
            <input
              type="number"
              value={filters.minPrice}
              onChange={(event) => setFilters((current) => ({ ...current, minPrice: event.target.value }))}
              placeholder="Giá từ"
            />
            <input
              type="number"
              value={filters.maxPrice}
              onChange={(event) => setFilters((current) => ({ ...current, maxPrice: event.target.value }))}
              placeholder="Giá đến"
            />
            <button type="button" className="primary-btn" onClick={() => onApplyFilters()}>
              Áp dụng bộ lọc
            </button>
          </div>
        </SectionCard>
      ) : null}

      {showCatalog && showShowcase ? (
        <section className="market-showcase section-card wide">
          <div className="category-ribbon">
            <button
              type="button"
              className={`category-ribbon__item${!filters.categoryId ? ' active' : ''}`}
              onClick={() => applyCategory('')}
            >
              T?t c?
            </button>
            {categoryOptions.slice(0, 10).map((category) => (
              <button
                key={`ribbon-${category._id}`}
                type="button"
                className={`category-ribbon__item${filters.categoryId === category._id ? ' active' : ''}`}
                onClick={() => applyCategory(category._id)}
              >
                {category.name}
              </button>
            ))}
          </div>
          <div className="market-showcase__grid">
            <div className="showcase-column">
              <div className="showcase-column__head">
                <strong>Tin mới lên</strong>
                <span className="muted">Cap nhat gan day</span>
              </div>
              {freshProducts.map((product) => (
                <button key={`fresh-${product._id}`} type="button" className="showcase-item" onClick={() => onSelectProduct(product._id)}>
                  <span>{product.title}</span>
                  <strong>{formatPrice(getDisplayPrice(product))} VND</strong>
                </button>
              ))}
            </div>
            <div className="showcase-column">
              <div className="showcase-column__head">
                <strong>Auction noi bat</strong>
                <span className="muted">Đang nhận giá</span>
              </div>
              {(auctionHighlights.length ? auctionHighlights : freshProducts).map((product) => (
                <button key={`auction-${product._id}`} type="button" className="showcase-item" onClick={() => onSelectProduct(product._id)}>
                  <span>{product.title}</span>
                  <strong>{formatPrice(getDisplayPrice(product))} VND</strong>
                </button>
              ))}
            </div>
            <div className="showcase-column">
              <div className="showcase-column__head">
                <strong>Giá dễ chốt</strong>
                <span className="muted">Sap xep gia thap den cao</span>
              </div>
              {(budgetHighlights.length ? budgetHighlights : freshProducts).map((product) => (
                <button key={`budget-${product._id}`} type="button" className="showcase-item" onClick={() => onSelectProduct(product._id)}>
                  <span>{product.title}</span>
                  <strong>{formatPrice(getDisplayPrice(product))} VND</strong>
                </button>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {browserMode ? (
        <section className="catalog-browser section-card wide">
          <aside className="catalog-browser__sidebar">
            <div className="catalog-sidebar-card">
              <p className="eyebrow">Bộ lọc nhanh</p>
              <div className="form-grid">
                <input
                  value={filters.q}
                  onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))}
                  placeholder="Từ khóa"
                />
                <select
                  value={filters.categoryId}
                  onChange={(event) => setFilters((current) => ({ ...current, categoryId: event.target.value }))}
                >
                  <option value="">Tất cả danh mục</option>
                  {categoryOptions.map((category) => (
                    <option key={category._id} value={category._id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <select
                  value={filters.saleType}
                  onChange={(event) => setFilters((current) => ({ ...current, saleType: event.target.value }))}
                >
                  <option value="">Tất cả hình thức</option>
                  <option value="fixed_price">Mua ngay</option>
                  <option value="auction">Đấu giá</option>
                </select>
                <div className="catalog-price-grid">
                  <input
                    type="number"
                    value={filters.minPrice}
                    onChange={(event) => setFilters((current) => ({ ...current, minPrice: event.target.value }))}
                    placeholder="Giá từ"
                  />
                  <input
                    type="number"
                    value={filters.maxPrice}
                    onChange={(event) => setFilters((current) => ({ ...current, maxPrice: event.target.value }))}
                    placeholder="Giá đến"
                  />
                </div>
                <select value={filters.sort} onChange={handleSortChange}>
                  <option value="">Mới nhất</option>
                  <option value="price_asc">Giá tăng dần</option>
                  <option value="price_desc">Giá giảm dần</option>
                </select>
                <button type="button" className="primary-btn" onClick={() => onApplyFilters()}>
                  Áp dụng bộ lọc
                </button>
              </div>
            </div>

            <div className="catalog-sidebar-card">
              <p className="eyebrow">Danh mục có sẵn</p>
              <div className="catalog-category-list">
                <button
                  type="button"
                  className={`catalog-category-item${!filters.categoryId ? ' active' : ''}`}
                  onClick={() => applyCategory('')}
                >
                  Tất cả danh mục
                </button>
                {categoryOptions.map((category) => (
                  <button
                    key={`sidebar-category-${category._id}`}
                    type="button"
                    className={`catalog-category-item${filters.categoryId === category._id ? ' active' : ''}`}
                    onClick={() => applyCategory(category._id)}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="catalog-sidebar-card">
              <p className="eyebrow">Kinh nghiệm</p>
              <ul className="sidebar-tips">
                <li>Nhập từ khóa ngắn gọn rồi kết hợp giá để ra kết quả sát nhu cầu hơn.</li>
                <li>Nếu muốn so sánh nhanh, đổi sắp xếp giá tăng dần hoặc giảm dần.</li>
                <li>Với auction, hãy kiểm tra giá hiện tại và thời gian kết thúc trước khi đặt giá.</li>
              </ul>
            </div>
          </aside>

          <div className="catalog-browser__content">
            <div className="catalog-browser__head">
              <div>
            <strong>Danh sách sản phẩm</strong>
            <p className="muted">
              {catalogMeta?.total || visibleProducts.length} tin đăng, trang {catalogPage} / {catalogMeta?.totalPages || 1}.
            </p>
          </div>
          <span className="route-pill">Sắp xếp: {getSortLabel(filters.sort)}</span>
            </div>

            {isCatalogLoading ? (
              <div className="skeleton-grid">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={`catalog-skeleton-${index}`} className="skeleton-card" />
                ))}
              </div>
            ) : null}

            {!isCatalogLoading ? (
              <div className="resource-list cards-list">
                {visibleProducts.map((product) => (
                  <button key={product._id} className="resource-card listing-card" onClick={() => onSelectProduct(product._id)}>
                    <div className="resource-card__image listing-card__image">
                      {product.thumbnailImage ? (
                        <img src={product.thumbnailImage} alt={product.title} />
                      ) : (
                        <span className="listing-card__placeholder" style={{ background: fallbackArtwork(product.title) }}>
                          <span>{product.category?.name || 'Listing'}</span>
                        </span>
                      )}
                    </div>
                    <div className="listing-card__body">
                      <div className="tag-row listing-card__tags">
                        <small>{SALE_TYPE_LABELS[product.saleType] || product.saleType}</small>
                        <small>{STATUS_LABELS[product.status] || product.status}</small>
                      </div>
                      <strong className="listing-card__title">{product.title}</strong>
                      <span className="price">{formatPrice(getDisplayPrice(product))} VND</span>
                      <span className="muted">{joinLocation(product.ward, product.district, product.province)}</span>
                      <div className="listing-card__footer">
                        <span>{product.seller?.fullName || product.seller?.username || 'Người bán'}</span>
                        <span>{product.viewsCount || 0} lượt xem</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : null}

            {!isCatalogLoading && !visibleProducts.length ? (
              <div className="empty-state">
                <strong>Không có sản phẩm nào khớp với bộ lọc hiện tại.</strong>
                <p className="muted">Hãy đổi từ khóa, danh mục, mức giá hoặc cách sắp xếp để mở rộng kết quả.</p>
              </div>
            ) : null}

            <div className="pagination-row">
              <button type="button" onClick={() => onCatalogPageChange(Math.max(1, catalogPage - 1))} disabled={catalogPage <= 1}>
                Trang trước
              </button>
              <span className="route-pill">Trang {catalogPage}</span>
              <button
                type="button"
                className="primary-btn"
                onClick={() => onCatalogPageChange(catalogPage + 1)}
                disabled={catalogPage >= (catalogMeta?.totalPages || 1)}
              >
                Trang sau
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {showCatalog && !browserMode ? (
      <SectionCard title="Danh sách sản phẩm" subtitle={`${visibleProducts.length} tin đăng`}>
          {isCatalogLoading ? (
            <div className="skeleton-grid">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={`catalog-plain-skeleton-${index}`} className="skeleton-card" />
              ))}
            </div>
          ) : null}

          {!isCatalogLoading ? (
            <div className="resource-list cards-list">
              {visibleProducts.map((product) => (
                <button key={product._id} className="resource-card listing-card" onClick={() => onSelectProduct(product._id)}>
                  <div className="resource-card__image listing-card__image">
                    {product.thumbnailImage ? (
                      <img src={product.thumbnailImage} alt={product.title} />
                    ) : (
                      <span className="listing-card__placeholder" style={{ background: fallbackArtwork(product.title) }}>
                        <span>{product.category?.name || 'Listing'}</span>
                      </span>
                    )}
                  </div>
                  <div className="listing-card__body">
                    <div className="tag-row listing-card__tags">
                      <small>{SALE_TYPE_LABELS[product.saleType] || product.saleType}</small>
                      <small>{STATUS_LABELS[product.status] || product.status}</small>
                    </div>
                    <strong className="listing-card__title">{product.title}</strong>
                    <span className="price">{formatPrice(getDisplayPrice(product))} VND</span>
                    <span className="muted">{joinLocation(product.ward, product.district, product.province)}</span>
                    <div className="listing-card__footer">
                      <span>{product.seller?.fullName || product.seller?.username || 'Người bán'}</span>
                      <span>{product.viewsCount || 0} lượt xem</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : null}

          {!isCatalogLoading && !visibleProducts.length ? (
            <div className="empty-state">
              <strong>Chưa có sản phẩm nào.</strong>
              <p className="muted">Hãy quay lại trang chủ hoặc đổi bộ lọc để xem thêm sản phẩm.</p>
            </div>
          ) : null}
        </SectionCard>
      ) : null}

      <SectionCard
        title={selectedProduct?.title || 'Chi tiết sản phẩm'}
        subtitle={selectedProduct ? joinLocation(selectedProduct.ward, selectedProduct.district, selectedProduct.province) : 'Chọn một sản phẩm'}
        className="wide"
        actions={
          selectedProduct ? (
            <>
              <button type="button" onClick={onCreateOrder} disabled={!user}>
                Mua ngay
              </button>
              <button
                type="button"
                onClick={onPlaceBid}
                disabled={!user || !selectedAuction || selectedAuction.status !== 'live'}
              >
                Đặt giá
              </button>
              <button type="button" onClick={onStartConversation} disabled={!user}>
                Chat với người bán
              </button>
            </>
          ) : null
        }
      >
        {selectedProduct ? (
          <div className="detail-layout product-detail">
            <div className="detail-gallery product-detail__gallery">
              {selectedProduct.thumbnailImage ? <img className="hero-image" src={selectedProduct.thumbnailImage} alt={selectedProduct.title} /> : null}
              <div className="thumb-row">
                {(selectedProduct.images || []).slice(0, 4).map((image) => (
                  <img key={image} src={image} alt={selectedProduct.title} />
                ))}
              </div>
            </div>
            <div className="product-detail__main">
              <div className="stack gap-sm">
                <div className="tag-row">
                  <small>{selectedProduct.category?.name || 'Danh mục'}</small>
                  <small>{CONDITION_LABELS[selectedProduct.condition] || selectedProduct.condition}</small>
                </div>
                <div className="price price--big">{formatPrice(getDisplayPrice(selectedProduct))} VND</div>
                <div className="product-highlight-row">
                  <div className="product-highlight-card">
                    <span>Hình thức</span>
                    <strong>{SALE_TYPE_LABELS[selectedProduct.saleType] || selectedProduct.saleType}</strong>
                  </div>
                  <div className="product-highlight-card">
                    <span>Nguồn đăng</span>
                    <strong>{selectedProduct.source || 'manual'}</strong>
                  </div>
                  <div className="product-highlight-card">
                    <span>Giao dịch</span>
                    <strong>{selectedProduct.fulfillmentType || 'shipping'}</strong>
                  </div>
                </div>
                <p>{selectedProduct.description}</p>
                <div className="meta-grid product-meta-grid">
                  <span>Người bán: {selectedProduct.seller?.fullName || selectedProduct.seller?.username || 'Chưa có'}</span>
                  <span>Danh mục: {selectedProduct.category?.name || 'Chưa có'}</span>
                  <span>Khu vực: {joinLocation(selectedProduct.ward, selectedProduct.district, selectedProduct.province)}</span>
                  <span>Lượt xem: {selectedProduct.viewsCount || 0}</span>
                  <span>Lượt thích: {selectedProduct.favoritesCount || 0}</span>
                  <span>Trạng thái: {STATUS_LABELS[selectedProduct.status] || selectedProduct.status}</span>
                  <span>
                    Phiên đấu giá: {selectedAuction ? `${formatPrice(selectedAuction.currentBid || selectedAuction.startingBid)} VND` : 'Chưa có'}
                  </span>
                  <span>Kết thúc: {selectedAuction ? formatDateTime(selectedAuction.endAt) : 'Chưa có'}</span>
                </div>
              </div>
              <aside className="seller-panel">
                <div className="seller-panel__head">
                  <span className="seller-avatar">
                    {(selectedProduct.seller?.fullName || selectedProduct.seller?.username || 'N').slice(0, 1).toUpperCase()}
                  </span>
                  <div>
                    <strong>{selectedProduct.seller?.fullName || selectedProduct.seller?.username || 'Người bán'}</strong>
                    <p className="muted">{joinLocation(selectedProduct.ward, selectedProduct.district, selectedProduct.province)}</p>
                  </div>
                </div>
                <div className="seller-panel__actions">
                  <button type="button" className="primary-btn" onClick={onCreateOrder} disabled={!user}>
                    Mua ngay
                  </button>
                  <button
                    type="button"
                    onClick={onPlaceBid}
                    disabled={!user || !selectedAuction || selectedAuction.status !== 'live'}
                  >
                    Đặt giá
                  </button>
                  <button type="button" onClick={onStartConversation} disabled={!user}>
                    Chat với người bán
                  </button>
                  {selectedAuction ? (
                    <button type="button" className="ghost-btn" onClick={() => onViewAuctionDetail(selectedAuction._id)}>
                      Mở trang đấu giá
                    </button>
                  ) : null}
                  <button type="button" className="ghost-btn" onClick={() => onViewSellerStore(selectedProduct.seller?._id || selectedProduct.seller)}>
                    Xem gian hàng
                  </button>
                </div>
              </aside>
              {selectedProduct.attributes && Object.keys(selectedProduct.attributes).length ? (
                <pre className="json-box">{JSON.stringify(selectedProduct.attributes, null, 2)}</pre>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <strong>Chọn một sản phẩm để xem chi tiết.</strong>
            <p className="muted">Bạn có thể xem mô tả, giá bán, trạng thái và chọn mua ngay, đặt giá hoặc nhắn tin với người bán.</p>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Đánh giá sản phẩm" subtitle="Phản hồi từ người dùng" className="wide">
        {selectedProduct ? (
          <div className="resource-list">
            {selectedProductReviews.map((review) => (
              <article key={review._id} className="resource-item review-card">
                <div>
                  <strong>{review.reviewer?.fullName || review.reviewer?.username || 'Người dùng'}</strong>
                  <p>{compactText(review.comment || 'Không có nội dung', 160)}</p>
                </div>
                <div className="resource-item__meta">
                  <span>{review.score}/5</span>
                  <small>{formatDateTime(review.createdAt)}</small>
                </div>
              </article>
            ))}
            {!selectedProductReviews.length ? <p className="muted">Chưa có đánh giá nào cho sản phẩm này.</p> : null}
          </div>
        ) : (
          <p className="muted">Chọn một sản phẩm để xem đánh giá.</p>
        )}
      </SectionCard>

      {selectedProduct ? (
        <SectionCard title="Sản phẩm liên quan" subtitle="Cùng danh mục" className="wide">
          {relatedProducts.length ? (
            <div className="resource-list cards-list">
              {relatedProducts.map((product) => (
                <button key={`related-${product._id}`} className="resource-card listing-card listing-card--compact" onClick={() => onSelectProduct(product._id)}>
                  <div className="resource-card__image listing-card__image">
                    {product.thumbnailImage ? (
                      <img src={product.thumbnailImage} alt={product.title} />
                    ) : (
                      <span className="listing-card__placeholder" style={{ background: fallbackArtwork(product.title) }}>
                        <span>{product.category?.name || 'Listing'}</span>
                      </span>
                    )}
                  </div>
                  <div className="listing-card__body">
                    <strong className="listing-card__title">{product.title}</strong>
                    <span className="price">{formatPrice(getDisplayPrice(product))} VND</span>
                    <span className="muted">{joinLocation(product.ward, product.district, product.province)}</span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="muted">Chưa có sản phẩm liên quan trong cùng danh mục.</p>
          )}
        </SectionCard>
      ) : null}
    </div>
  );
};

export default CatalogView;
