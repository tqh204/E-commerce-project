import SectionCard from '../components/SectionCard';
import { compactText, formatDateTime, formatPrice, joinLocation } from '@frontend-utils/format';

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
}) => {
  const freshProducts = products.slice(0, 4);
  const auctionHighlights = products.filter((item) => item.saleType === 'auction').slice(0, 4);
  const chototHighlights = products.filter((item) => item.source === 'chotot').slice(0, 4);
  const browserMode = showFilters && showCatalog;
  const relatedProducts = selectedProduct
    ? products
        .filter((item) => item._id !== selectedProduct._id)
        .filter((item) =>
          String(item.category?._id || item.category || '') ===
          String(selectedProduct.category?._id || selectedProduct.category || '')
        )
        .slice(0, 4)
    : [];

  return (
  <div className="view-grid">
    {showFilters ? (
      <section className="market-hero section-card wide">
        <div className="market-hero__copy">
          <p className="eyebrow">ChoMarket x Chotot x Mercari</p>
          <h2>San pham cu, auction va giao dich truc tiep tren cung mot marketplace.</h2>
          <p className="muted">
            Xem listing moi, loc theo khu vuc va gia, mo chat voi nguoi ban, hoac dat mua ngay neu san pham phu hop.
          </p>
          <div className="market-stats">
            <div className="market-stat">
              <strong>{products.length}</strong>
              <span>Listing dang hien</span>
            </div>
            <div className="market-stat">
              <strong>{categories.length}</strong>
              <span>Danh muc</span>
            </div>
            <div className="market-stat">
              <strong>{products.filter((item) => item.saleType === 'auction').length}</strong>
              <span>Dau gia</span>
            </div>
          </div>
        </div>
        <div className="market-hero__panel">
          <div className="hero-note">
            <span className="hero-note__pill">Moi cap nhat</span>
            <strong>Tin gan ban va dang co luot hoi mua</strong>
            <p className="muted">Uu tien listing co hinh anh, gia ro rang va seller phan hoi nhanh.</p>
          </div>
          <div className="chip-grid">
            {categories.slice(0, 6).map((category) => (
              <button
                key={category._id}
                type="button"
                className={`category-chip${filters.categoryId === category._id ? ' active' : ''}`}
                onClick={() => onApplyFilters({ ...filters, categoryId: category._id })}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>
      </section>
    ) : null}

    {showFilters && !browserMode ? (
      <SectionCard title="Tim san pham" subtitle="Marketplace filters" className="wide">
        <div className="form-grid form-grid--four market-filter-grid">
          <input value={filters.q} onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))} placeholder="Tu khoa" />
          <select value={filters.categoryId} onChange={(event) => setFilters((current) => ({ ...current, categoryId: event.target.value }))}>
            <option value="">Tat ca danh muc</option>
            {categories.map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}
          </select>
          <select value={filters.saleType} onChange={(event) => setFilters((current) => ({ ...current, saleType: event.target.value }))}>
            <option value="">Tat ca hinh thuc</option>
            <option value="fixed_price">Mua ngay</option>
            <option value="auction">Dau gia</option>
          </select>
          <select value={filters.source} onChange={(event) => setFilters((current) => ({ ...current, source: event.target.value }))}>
            <option value="">Tat ca nguon</option>
            <option value="manual">manual</option>
            <option value="chotot">chotot</option>
            <option value="ebay">ebay</option>
          </select>
          <input type="number" value={filters.minPrice} onChange={(event) => setFilters((current) => ({ ...current, minPrice: event.target.value }))} placeholder="Gia tu" />
          <input type="number" value={filters.maxPrice} onChange={(event) => setFilters((current) => ({ ...current, maxPrice: event.target.value }))} placeholder="Gia den" />
          <select value={filters.sort} onChange={(event) => setFilters((current) => ({ ...current, sort: event.target.value }))}>
            <option value="">Moi nhat</option>
            <option value="price_asc">Gia tang dan</option>
            <option value="price_desc">Gia giam dan</option>
          </select>
          <button type="button" className="primary-btn" onClick={onApplyFilters}>Ap dung bo loc</button>
        </div>
      </SectionCard>
    ) : null}

    {showCatalog ? (
      <section className="market-showcase section-card wide">
        <div className="category-ribbon">
          {categories.slice(0, 10).map((category) => (
            <button
              key={`ribbon-${category._id}`}
              type="button"
              className={`category-ribbon__item${filters.categoryId === category._id ? ' active' : ''}`}
              onClick={() => onApplyFilters({ ...filters, categoryId: category._id })}
            >
              {category.name}
            </button>
          ))}
        </div>
        <div className="market-showcase__grid">
          <div className="showcase-column">
            <div className="showcase-column__head">
              <strong>Tin moi len</strong>
              <span className="muted">Cap nhat gan day</span>
            </div>
            {freshProducts.map((product) => (
              <button key={`fresh-${product._id}`} type="button" className="showcase-item" onClick={() => onSelectProduct(product._id)}>
                <span>{product.title}</span>
                <strong>{formatPrice(product.price)} VND</strong>
              </button>
            ))}
          </div>
          <div className="showcase-column">
            <div className="showcase-column__head">
              <strong>Auction noi bat</strong>
              <span className="muted">Dang nhan gia</span>
            </div>
            {(auctionHighlights.length ? auctionHighlights : freshProducts).map((product) => (
              <button key={`auction-${product._id}`} type="button" className="showcase-item" onClick={() => onSelectProduct(product._id)}>
                <span>{product.title}</span>
                <strong>{formatPrice(product.currentBid || product.price)} VND</strong>
              </button>
            ))}
          </div>
          <div className="showcase-column">
            <div className="showcase-column__head">
              <strong>Tu nguon Chotot</strong>
              <span className="muted">Du lieu da import</span>
            </div>
            {(chototHighlights.length ? chototHighlights : freshProducts).map((product) => (
              <button key={`source-${product._id}`} type="button" className="showcase-item" onClick={() => onSelectProduct(product._id)}>
                <span>{product.title}</span>
                <strong>{joinLocation(product.district, product.province)}</strong>
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
            <p className="eyebrow">Bo loc nhanh</p>
            <div className="form-grid">
              <input value={filters.q} onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))} placeholder="Tu khoa" />
              <select value={filters.categoryId} onChange={(event) => setFilters((current) => ({ ...current, categoryId: event.target.value }))}>
                <option value="">Tat ca danh muc</option>
                {categories.map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}
              </select>
              <select value={filters.saleType} onChange={(event) => setFilters((current) => ({ ...current, saleType: event.target.value }))}>
                <option value="">Tat ca hinh thuc</option>
                <option value="fixed_price">Mua ngay</option>
                <option value="auction">Dau gia</option>
              </select>
              <select value={filters.source} onChange={(event) => setFilters((current) => ({ ...current, source: event.target.value }))}>
                <option value="">Tat ca nguon</option>
                <option value="manual">manual</option>
                <option value="chotot">chotot</option>
                <option value="ebay">ebay</option>
              </select>
              <input type="number" value={filters.minPrice} onChange={(event) => setFilters((current) => ({ ...current, minPrice: event.target.value }))} placeholder="Gia tu" />
              <input type="number" value={filters.maxPrice} onChange={(event) => setFilters((current) => ({ ...current, maxPrice: event.target.value }))} placeholder="Gia den" />
              <select value={filters.sort} onChange={(event) => setFilters((current) => ({ ...current, sort: event.target.value }))}>
                <option value="">Moi nhat</option>
                <option value="price_asc">Gia tang dan</option>
                <option value="price_desc">Gia giam dan</option>
              </select>
              <button type="button" className="primary-btn" onClick={onApplyFilters}>Ap dung bo loc</button>
            </div>
          </div>
          <div className="catalog-sidebar-card">
            <p className="eyebrow">Kinh nghiem</p>
            <ul className="sidebar-tips">
              <li>Mo chi tiet listing de xem khu vuc, condition va thong tin seller.</li>
              <li>Neu can chac chan, bam chat voi nguoi ban truoc khi dat mua.</li>
              <li>Voi auction, hay kiem tra current bid va thoi gian ket thuc.</li>
            </ul>
          </div>
        </aside>
          <div className="catalog-browser__content">
            <div className="catalog-browser__head">
              <div>
                <strong>Danh sach san pham</strong>
                <p className="muted">
                  {catalogMeta?.total || products.length} listing, trang {catalogPage} / {catalogMeta?.totalPages || 1}.
                </p>
              </div>
              <span className="route-pill">Listing near feed</span>
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
            {products.map((product) => (
              <button key={product._id} className="resource-card listing-card" onClick={() => onSelectProduct(product._id)}>
                <div className="resource-card__image listing-card__image">
                  {product.thumbnailImage ? <img src={product.thumbnailImage} alt={product.title} /> : <span>No image</span>}
                </div>
                <div className="listing-card__body">
                  <div className="tag-row listing-card__tags">
                    <small>{product.saleType}</small>
                    <small>{product.source}</small>
                    <small>{product.status}</small>
                  </div>
                  <strong className="listing-card__title">{product.title}</strong>
                  <span className="price">{formatPrice(product.price)} VND</span>
                  <span className="muted">{joinLocation(product.ward, product.district, product.province)}</span>
                  <div className="listing-card__footer">
                    <span>{product.seller?.fullName || product.seller?.username || 'Nguoi ban'}</span>
                    <span>{product.viewsCount || 0} views</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
          ) : null}
          {!isCatalogLoading && !products.length ? (
            <div className="empty-state">
              <strong>Khong co listing nao khop voi bo loc hien tai.</strong>
              <p className="muted">Thu doi category, tu khoa, muc gia hoac nguon du lieu de mo rong ket qua.</p>
            </div>
          ) : null}
          <div className="pagination-row">
            <button type="button" onClick={() => onCatalogPageChange(Math.max(1, catalogPage - 1))} disabled={catalogPage <= 1}>
              Trang truoc
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
      <SectionCard title="Catalog" subtitle={`${products.length} listing`}>
        {isCatalogLoading ? (
          <div className="skeleton-grid">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={`catalog-plain-skeleton-${index}`} className="skeleton-card" />
            ))}
          </div>
        ) : null}
        {!isCatalogLoading ? (
        <div className="resource-list cards-list">
          {products.map((product) => (
            <button key={product._id} className="resource-card listing-card" onClick={() => onSelectProduct(product._id)}>
              <div className="resource-card__image listing-card__image">
                {product.thumbnailImage ? <img src={product.thumbnailImage} alt={product.title} /> : <span>No image</span>}
              </div>
              <div className="listing-card__body">
                <div className="tag-row listing-card__tags">
                  <small>{product.saleType}</small>
                  <small>{product.source}</small>
                  <small>{product.status}</small>
                </div>
                <strong className="listing-card__title">{product.title}</strong>
                <span className="price">{formatPrice(product.price)} VND</span>
                <span className="muted">{joinLocation(product.ward, product.district, product.province)}</span>
                <div className="listing-card__footer">
                  <span>{product.seller?.fullName || product.seller?.username || 'Nguoi ban'}</span>
                  <span>{product.viewsCount || 0} views</span>
                </div>
              </div>
            </button>
          ))}
        </div>
        ) : null}
        {!isCatalogLoading && !products.length ? (
          <div className="empty-state">
            <strong>Chua co listing nao.</strong>
            <p className="muted">Hay quay lai trang chu hoac doi bo loc de xem them san pham.</p>
          </div>
        ) : null}
      </SectionCard>
    ) : null}

    <SectionCard
      title={selectedProduct?.title || 'Chi tiet san pham'}
      subtitle={selectedProduct ? joinLocation(selectedProduct.ward, selectedProduct.district, selectedProduct.province) : 'Chon mot listing'}
      className="wide"
      actions={selectedProduct ? (
        <>
          <button type="button" onClick={onCreateOrder} disabled={!user || selectedProduct.saleType === 'auction'}>Mua ngay</button>
          <button type="button" onClick={onPlaceBid} disabled={!user || !selectedAuction}>Dat gia</button>
          <button type="button" onClick={onStartConversation} disabled={!user}>Chat voi nguoi ban</button>
        </>
      ) : null}
    >
      {selectedProduct ? (
        <div className="detail-layout product-detail">
          <div className="detail-gallery product-detail__gallery">
            {selectedProduct.thumbnailImage ? <img className="hero-image" src={selectedProduct.thumbnailImage} alt={selectedProduct.title} /> : null}
            <div className="thumb-row">
              {(selectedProduct.images || []).slice(0, 4).map((image) => <img key={image} src={image} alt={selectedProduct.title} />)}
            </div>
          </div>
          <div className="product-detail__main">
            <div className="stack gap-sm">
              <div className="tag-row">
                <small>{selectedProduct.category?.name || 'category'}</small>
                <small>{selectedProduct.condition}</small>
                <small>{selectedProduct.source}</small>
              </div>
              <div className="price price--big">{formatPrice(selectedProduct.price)} VND</div>
              <p>{selectedProduct.description}</p>
              <div className="meta-grid product-meta-grid">
                <span>Seller: {selectedProduct.seller?.fullName || selectedProduct.seller?.username || 'n/a'}</span>
                <span>Danh muc: {selectedProduct.category?.name || 'n/a'}</span>
                <span>Khu vuc: {joinLocation(selectedProduct.ward, selectedProduct.district, selectedProduct.province)}</span>
                <span>Views: {selectedProduct.viewsCount || 0}</span>
                <span>Favorite: {selectedProduct.favoritesCount || 0}</span>
                <span>Trang thai: {selectedProduct.status}</span>
                <span>
                  Auction: {selectedAuction ? `${formatPrice(selectedAuction.currentBid || selectedAuction.startingBid)} VND` : 'khong co'}
                </span>
                <span>Ket thuc: {selectedAuction ? formatDateTime(selectedAuction.endAt) : 'n/a'}</span>
              </div>
            </div>
            <aside className="seller-panel">
              <div className="seller-panel__head">
                <span className="seller-avatar">
                  {(selectedProduct.seller?.fullName || selectedProduct.seller?.username || 'N').slice(0, 1).toUpperCase()}
                </span>
                <div>
                  <strong>{selectedProduct.seller?.fullName || selectedProduct.seller?.username || 'Nguoi ban'}</strong>
                  <p className="muted">{joinLocation(selectedProduct.ward, selectedProduct.district, selectedProduct.province)}</p>
                </div>
              </div>
              <div className="seller-panel__actions">
                <button type="button" className="primary-btn" onClick={onCreateOrder} disabled={!user || selectedProduct.saleType === 'auction'}>
                  Mua ngay
                </button>
                <button type="button" onClick={onPlaceBid} disabled={!user || !selectedAuction}>
                  Dat gia
                </button>
                <button type="button" onClick={onStartConversation} disabled={!user}>
                  Chat voi nguoi ban
                </button>
                {selectedAuction ? (
                  <button type="button" className="ghost-btn" onClick={() => onViewAuctionDetail(selectedAuction._id)}>
                    Mo trang auction
                  </button>
                ) : null}
                <button type="button" className="ghost-btn" onClick={() => onViewSellerStore(selectedProduct.seller?._id || selectedProduct.seller)}>
                  Xem gian hang
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
          <strong>Chon mot san pham de xem chi tiet.</strong>
          <p className="muted">Trang nay duoc to chuc theo flow marketplace thong thuong: xem listing, mo chi tiet, sau do mua ngay hoac chat nguoi ban.</p>
        </div>
      )}
    </SectionCard>

    <SectionCard title="Reviews theo listing" subtitle="Review frontend" className="wide">
      {selectedProduct ? (
        <div className="resource-list">
          {selectedProductReviews.map((review) => (
            <article key={review._id} className="resource-item review-card">
              <div>
                <strong>{review.reviewer?.fullName || review.reviewer?.username || 'Nguoi dung'}</strong>
                <p>{compactText(review.comment || 'Khong co noi dung', 160)}</p>
              </div>
              <div className="resource-item__meta">
                <span>{review.score}/5</span>
                <small>{formatDateTime(review.createdAt)}</small>
              </div>
            </article>
          ))}
          {!selectedProductReviews.length ? <p className="muted">Chua co review cho listing nay.</p> : null}
        </div>
      ) : <p className="muted">Chon mot listing de xem review.</p>}
    </SectionCard>

    {selectedProduct ? (
      <SectionCard title="San pham lien quan" subtitle="Cung category" className="wide">
        {relatedProducts.length ? (
          <div className="resource-list cards-list">
            {relatedProducts.map((product) => (
              <button key={`related-${product._id}`} className="resource-card listing-card listing-card--compact" onClick={() => onSelectProduct(product._id)}>
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
        ) : (
          <p className="muted">Chua co san pham lien quan trong cung danh muc.</p>
        )}
      </SectionCard>
    ) : null}
  </div>
  );
};

export default CatalogView;
