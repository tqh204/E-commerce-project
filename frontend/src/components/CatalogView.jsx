import { formatPrice, joinLocation } from '../utils/format';

const CatalogView = ({ products, categories, filters, setFilters, loadProducts, selectedProduct, selectedAuction, onSelectProduct, onCreateOrder, onPlaceBid, onStartConversation, user }) => (
  <>
    <section className="grid-two">
      <article className="panel filter-panel">
        <h3>Catalog Filter</h3>
        <div className="filter-grid">
          <input value={filters.q} onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))} placeholder="Tim san pham" />
          <select value={filters.categoryId} onChange={(event) => setFilters((current) => ({ ...current, categoryId: event.target.value }))}>
            <option value="">Tat ca danh muc</option>
            {categories.map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}
          </select>
          <select value={filters.saleType} onChange={(event) => setFilters((current) => ({ ...current, saleType: event.target.value }))}>
            <option value="">Tat ca giao dich</option>
            <option value="fixed_price">Mua ngay</option>
            <option value="auction">Dau gia</option>
          </select>
          <select value={filters.source} onChange={(event) => setFilters((current) => ({ ...current, source: event.target.value }))}>
            <option value="">Tat ca source</option>
            <option value="manual">manual</option>
            <option value="chotot">chotot</option>
          </select>
        </div>
        <button onClick={loadProducts}>Ap dung bo loc</button>
      </article>
    </section>

    <section className="grid-main">
      <article className="panel product-grid">
        <div className="section-head"><h3>Catalog</h3><span>{products.length} san pham</span></div>
        <div className="cards">
          {products.map((product) => (
            <button key={product._id} className="product-card" onClick={() => onSelectProduct(product._id)}>
              <div className="thumb-wrap">{product.thumbnailImage ? <img src={product.thumbnailImage} alt={product.title} /> : <span>No image</span>}</div>
              <strong>{product.title}</strong>
              <span className="price">{formatPrice(product.price)} VND</span>
              <span className="muted">{joinLocation(product.ward, product.district, product.province)}</span>
              <span className="muted">{product.saleType}</span>
            </button>
          ))}
        </div>
      </article>
      <article className="panel detail-panel">
        {selectedProduct ? (
          <>
            <div className="section-head"><h3>{selectedProduct.title}</h3><span>{selectedProduct.source}</span></div>
            {selectedProduct.thumbnailImage ? <img className="hero-image" src={selectedProduct.thumbnailImage} alt={selectedProduct.title} /> : null}
            <div className="price big">{formatPrice(selectedProduct.price)} VND</div>
            <p className="muted">{selectedProduct.description}</p>
            <div className="meta-list">
              <span>Seller: {selectedProduct.seller?.fullName || selectedProduct.seller?.username || 'n/a'}</span>
              <span>Location: {joinLocation(selectedProduct.ward, selectedProduct.district, selectedProduct.province)}</span>
              <span>Auction: {selectedAuction ? `${formatPrice(selectedAuction.currentBid || selectedAuction.startingBid)} VND` : 'none'}</span>
            </div>
            <div className="actions-row">
              <button onClick={onCreateOrder} disabled={!user || selectedProduct.saleType === 'auction'}>Mua ngay</button>
              <button onClick={onPlaceBid} disabled={!user || !selectedAuction}>Dat bid</button>
              <button onClick={onStartConversation} disabled={!user}>Mo chat</button>
            </div>
          </>
        ) : <div className="muted">Chon mot san pham de xem chi tiet.</div>}
      </article>
    </section>
  </>
);

export default CatalogView;
