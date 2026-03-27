import SectionCard from '../components/SectionCard';
import { AUCTION_STATUS_OPTIONS, FULFILLMENT_TYPES, PRODUCT_CONDITIONS, PRODUCT_STATUS_OPTIONS, SALE_TYPES } from '@frontend-utils/constants';
import { compactText, formatDateTime, formatPrice, joinLocation } from '@frontend-utils/format';

const SellerView = ({
  categories,
  productForm,
  setProductForm,
  setProductFile,
  editingProductId,
  onSaveProduct,
  onResetProductForm,
  sellerProducts,
  onEditProduct,
  onDeleteProduct,
  auctionForm,
  setAuctionForm,
  onSaveAuction,
  onResetAuctionForm,
  sellerAuctions,
  onEditAuction,
  onViewAuction,
  onCloseAuction,
  onDeleteAuction,
  showProductForm = true,
  showProductList = true,
  showAuctionForm = true,
  showAuctionList = true,
}) => (
  <div className="view-grid">
    {showProductForm ? (
    <SectionCard title={editingProductId ? 'Sua listing' : 'Tao listing moi'} subtitle="Product CRUD" className="wide">
      <div className="workspace-form">
        <form className="stack gap-sm" onSubmit={onSaveProduct}>
          <div className="form-grid form-grid--three">
            <select value={productForm.categoryId} onChange={(event) => setProductForm((current) => ({ ...current, categoryId: event.target.value }))} required>
              <option value="">Chon category</option>
              {categories.map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}
            </select>
            <select value={productForm.saleType} onChange={(event) => setProductForm((current) => ({ ...current, saleType: event.target.value }))}>
              {SALE_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select value={productForm.status} onChange={(event) => setProductForm((current) => ({ ...current, status: event.target.value }))}>
              {PRODUCT_STATUS_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <input value={productForm.title} onChange={(event) => setProductForm((current) => ({ ...current, title: event.target.value }))} placeholder="Tieu de" required />
            <input type="number" value={productForm.price} onChange={(event) => setProductForm((current) => ({ ...current, price: event.target.value }))} placeholder="Gia" required />
            <select value={productForm.condition} onChange={(event) => setProductForm((current) => ({ ...current, condition: event.target.value }))}>
              {PRODUCT_CONDITIONS.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select value={productForm.fulfillmentType} onChange={(event) => setProductForm((current) => ({ ...current, fulfillmentType: event.target.value }))}>
              {FULFILLMENT_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <input value={productForm.tags} onChange={(event) => setProductForm((current) => ({ ...current, tags: event.target.value }))} placeholder="tags, cach nhau boi dau phay" />
            <input type="file" accept="image/*" onChange={(event) => setProductFile(event.target.files?.[0] || null)} />
            <input value={productForm.province} onChange={(event) => setProductForm((current) => ({ ...current, province: event.target.value }))} placeholder="Tinh / Thanh" />
            <input value={productForm.district} onChange={(event) => setProductForm((current) => ({ ...current, district: event.target.value }))} placeholder="Quan / Huyen" />
            <input value={productForm.ward} onChange={(event) => setProductForm((current) => ({ ...current, ward: event.target.value }))} placeholder="Phuong / Xa" />
          </div>
          <textarea value={productForm.addressText} onChange={(event) => setProductForm((current) => ({ ...current, addressText: event.target.value }))} placeholder="Dia chi hien thi" rows={2} />
          <textarea value={productForm.description} onChange={(event) => setProductForm((current) => ({ ...current, description: event.target.value }))} placeholder="Mo ta san pham" rows={4} required />
          <div className="actions-row">
            <button type="submit" className="primary-btn">{editingProductId ? 'Cap nhat listing' : 'Tao listing'}</button>
            <button type="button" className="ghost-btn" onClick={onResetProductForm}>Reset form</button>
          </div>
        </form>
        <aside className="workspace-form__aside">
          <div className="workspace-note">
            <strong>Xem truoc listing</strong>
            <p className="muted">{productForm.title || 'Tieu de san pham se hien o day.'}</p>
            <div className="tag-row">
              <small>{productForm.saleType}</small>
              <small>{productForm.status}</small>
              <small>{productForm.condition}</small>
            </div>
            <span className="price">{formatPrice(productForm.price || 0)} VND</span>
            <small>{joinLocation(productForm.ward, productForm.district, productForm.province)}</small>
          </div>
          <div className="workspace-note">
            <strong>Checklist dang tin</strong>
            <ul className="sidebar-tips">
              <li>Tieu de ngan, ro, dung nhu tu khoa user hay tim.</li>
              <li>Gia va condition can khop voi thuc te.</li>
              <li>Nen co hinh anh va khu vuc de user yen tam chat/mua.</li>
            </ul>
          </div>
        </aside>
      </div>
    </SectionCard>
    ) : null}

    {showProductList ? (
    <SectionCard title="Listing cua toi" subtitle={`${sellerProducts.length} san pham`} className="wide">
      <div className="resource-list">
        {sellerProducts.map((product) => (
          <article key={product._id} className="resource-item">
            <div>
              <strong>{product.title}</strong>
              <p>{compactText(product.description, 110)}</p>
              <small>{joinLocation(product.ward, product.district, product.province)} | {product.saleType} | {product.status}</small>
            </div>
            <div className="resource-item__meta">
              <span>{formatPrice(product.price)} VND</span>
              <div className="mini-actions">
                <button type="button" onClick={() => onEditProduct(product)}>Sua</button>
                <button type="button" onClick={() => onDeleteProduct(product._id)}>Xoa</button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </SectionCard>
    ) : null}

    {showAuctionForm ? (
    <SectionCard title={auctionForm.id ? 'Sua auction' : 'Tao auction'} subtitle="Auction CRUD" className="wide">
      <div className="workspace-form">
        <form className="stack gap-sm" onSubmit={onSaveAuction}>
          <div className="form-grid form-grid--three">
            <select value={auctionForm.productId} onChange={(event) => setAuctionForm((current) => ({ ...current, productId: event.target.value }))} required>
              <option value="">Chon product</option>
              {sellerProducts.map((product) => <option key={product._id} value={product._id}>{product.title}</option>)}
            </select>
            <select value={auctionForm.status} onChange={(event) => setAuctionForm((current) => ({ ...current, status: event.target.value }))}>
              {AUCTION_STATUS_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <input type="number" value={auctionForm.bidStep} onChange={(event) => setAuctionForm((current) => ({ ...current, bidStep: event.target.value }))} placeholder="Bid step" />
            <input type="datetime-local" value={auctionForm.startAt} onChange={(event) => setAuctionForm((current) => ({ ...current, startAt: event.target.value }))} required />
            <input type="datetime-local" value={auctionForm.endAt} onChange={(event) => setAuctionForm((current) => ({ ...current, endAt: event.target.value }))} required />
            <input type="number" value={auctionForm.startingBid} onChange={(event) => setAuctionForm((current) => ({ ...current, startingBid: event.target.value }))} placeholder="Gia khoi diem" required />
            <input type="number" value={auctionForm.currentBid} onChange={(event) => setAuctionForm((current) => ({ ...current, currentBid: event.target.value }))} placeholder="Current bid" />
            <input type="number" value={auctionForm.reservePrice} onChange={(event) => setAuctionForm((current) => ({ ...current, reservePrice: event.target.value }))} placeholder="Reserve price" />
            <input type="number" value={auctionForm.buyNowPrice} onChange={(event) => setAuctionForm((current) => ({ ...current, buyNowPrice: event.target.value }))} placeholder="Buy now" />
          </div>
          <div className="actions-row">
            <button type="submit" className="primary-btn">{auctionForm.id ? 'Cap nhat auction' : 'Tao auction'}</button>
            <button type="button" className="ghost-btn" onClick={onResetAuctionForm}>Reset auction form</button>
          </div>
        </form>
        <aside className="workspace-form__aside">
          <div className="workspace-note">
            <strong>Tong quan auction</strong>
            <div className="tag-row">
              <small>{auctionForm.status || 'scheduled'}</small>
              <small>step {formatPrice(auctionForm.bidStep || 0)}</small>
            </div>
            <span className="price">{formatPrice(auctionForm.startingBid || 0)} VND</span>
            <small>Bat dau: {auctionForm.startAt || 'chua chon'}</small>
            <small>Ket thuc: {auctionForm.endAt || 'chua chon'}</small>
          </div>
          <div className="workspace-note">
            <strong>Luu y auction</strong>
            <ul className="sidebar-tips">
              <li>Bid step khong nen qua nho de tranh spam gia.</li>
              <li>Thoi gian ket thuc nen ro rang de user de theo doi.</li>
              <li>San pham auction nen co mo ta va anh ro rang hon mua ngay.</li>
            </ul>
          </div>
        </aside>
      </div>
    </SectionCard>
    ) : null}

    {showAuctionList ? (
    <SectionCard title="Auction cua toi" subtitle={`${sellerAuctions.length} auction`} className="wide">
      <div className="resource-list">
        {sellerAuctions.map((auction) => (
          <article key={auction._id} className="resource-item">
            <div>
              <strong>{auction.product?.title || 'Auction'}</strong>
              <p>{auction.status} | current {formatPrice(auction.currentBid || auction.startingBid)} VND</p>
              <small>{formatDateTime(auction.startAt)} {'->'} {formatDateTime(auction.endAt)}</small>
            </div>
            <div className="resource-item__meta">
              <div className="mini-actions">
                <button type="button" onClick={() => onViewAuction(auction._id)}>Chi tiet</button>
                <button type="button" onClick={() => onEditAuction(auction)}>Sua</button>
                <button type="button" onClick={() => onCloseAuction(auction._id)}>Dong</button>
                <button type="button" onClick={() => onDeleteAuction(auction._id)}>Xoa</button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </SectionCard>
    ) : null}
  </div>
);

export default SellerView;
