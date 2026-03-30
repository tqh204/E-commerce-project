import { useMemo, useState } from 'react';
import AppLink from '../components/AppLink';
import SectionCard from '../components/SectionCard';
import { AUCTION_STATUS_OPTIONS, FULFILLMENT_TYPES, PRODUCT_CONDITIONS } from '@frontend-utils/constants';
import { compactText, formatDateTime, formatPrice, joinLocation } from '@frontend-utils/format';

const CONDITION_LABELS = {
  new: 'Moi',
  like_new: 'Nhu moi',
  good: 'Tot',
  fair: 'Kha',
  poor: 'Kem',
};

const STATUS_LABELS = {
  draft: 'Ban nhap',
  pending: 'Cho duyet',
  active: 'Dang hien thi',
  hidden: 'Da an',
  sold: 'Da ban',
  rejected: 'Bi tu choi',
  archived: 'Luu tru',
};

const FULFILLMENT_LABELS = {
  meetup: 'Gap mat truc tiep',
  shipping: 'Giao hang',
  both: 'Ca hai',
};

const SELLER_PRODUCT_STATUS_OPTIONS = ['draft', 'pending', 'active', 'hidden', 'sold'];

const SellerView = ({
  categories,
  productForm,
  setProductForm,
  setProductFiles,
  canManageCategories = false,
  categoryCreatePath = '/admin/categories/create',
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
  onOpenAuction,
  onCloseAuction,
  onDeleteAuction,
  showProductForm = true,
  showProductList = true,
  showAuctionForm = true,
  showAuctionList = true,
}) => {
  const [productQuery, setProductQuery] = useState('');
  const [productStatusFilter, setProductStatusFilter] = useState('all');

  const categoryName = useMemo(
    () =>
      categories.find((category) => String(category._id) === String(productForm.categoryId))?.name ||
      'Chua chon danh muc',
    [categories, productForm.categoryId]
  );

  const filteredProducts = useMemo(() => {
    const query = productQuery.trim().toLowerCase();
    return sellerProducts.filter((product) => {
      const matchesStatus = productStatusFilter === 'all' || product.status === productStatusFilter;
      const haystack = [
        product.title,
        product.description,
        product.category?.name,
        product.region,
        product.city,
        ...(product.tags || []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return matchesStatus && (!query || haystack.includes(query));
    });
  }, [productQuery, productStatusFilter, sellerProducts]);

  const listingSummary = useMemo(
    () => [
      { label: 'Tong listing', value: sellerProducts.length },
      { label: 'Dang hien thi', value: sellerProducts.filter((item) => item.status === 'active').length },
      { label: 'Cho duyet', value: sellerProducts.filter((item) => item.status === 'pending').length },
      { label: 'Ban nhap', value: sellerProducts.filter((item) => item.status === 'draft').length },
    ],
    [sellerProducts]
  );

  const existingImageCount = Array.isArray(productForm.images) ? productForm.images.length : 0;
  const listingPreviewLocation = joinLocation(
    productForm.ward,
    productForm.district,
    productForm.city || productForm.province,
    productForm.region
  );
  const selectedAuctionProduct = useMemo(
    () => sellerProducts.find((product) => String(product._id) === String(auctionForm.productId)) || null,
    [auctionForm.productId, sellerProducts]
  );

  return (
    <div className="view-grid">
      {showProductForm ? (
        <SectionCard
          title={editingProductId ? 'Sua tin dang' : 'Dang tin moi'}
          subtitle="Thong tin dang ban"
          className="wide"
        >
          <div className="workspace-form">
            <form className="stack gap-sm" onSubmit={onSaveProduct}>
              <div className="workspace-note">
                <strong>Danh muc duoc tao o form rieng</strong>
                <small className="muted">
                  Neu chua co danh muc phu hop, tao danh muc truoc roi quay lai dang tin.
                </small>
                <div className="actions-row wrap">
                  {canManageCategories ? (
                    <AppLink to={categoryCreatePath} className="route-pill">
                      Tao danh muc
                    </AppLink>
                  ) : (
                    <span className="route-pill">{categoryCreatePath}</span>
                  )}
                </div>
              </div>

              <div className="form-grid form-grid--three">
                <input
                  value={productForm.title}
                  onChange={(event) => setProductForm((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Tieu de tin dang"
                  required
                />
                <select
                  value={productForm.categoryId}
                  onChange={(event) =>
                    setProductForm((current) => ({ ...current, categoryId: event.target.value }))
                  }
                  required
                >
                  <option value="">Chon danh muc</option>
                  {categories.map((category) => (
                    <option key={category._id} value={category._id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <select
                  value={productForm.condition}
                  onChange={(event) => setProductForm((current) => ({ ...current, condition: event.target.value }))}
                  required
                >
                  {PRODUCT_CONDITIONS.map((item) => (
                    <option key={item} value={item}>
                      {CONDITION_LABELS[item] || item}
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  min="0"
                  value={productForm.price}
                  onChange={(event) => setProductForm((current) => ({ ...current, price: event.target.value }))}
                  placeholder="Gia ban"
                  required
                />
                <input
                  value={productForm.region}
                  onChange={(event) => setProductForm((current) => ({ ...current, region: event.target.value }))}
                  placeholder="Khu vuc"
                  required
                />
                <input
                  value={productForm.city}
                  onChange={(event) =>
                    setProductForm((current) => ({
                      ...current,
                      city: event.target.value,
                      province: event.target.value,
                    }))
                  }
                  placeholder="Tinh / Thanh pho"
                  required
                />

                <input
                  value={productForm.district}
                  onChange={(event) => setProductForm((current) => ({ ...current, district: event.target.value }))}
                  placeholder="Quan / Huyen"
                />
                <input
                  value={productForm.ward}
                  onChange={(event) => setProductForm((current) => ({ ...current, ward: event.target.value }))}
                  placeholder="Phuong / Xa"
                />
                <input
                  type="number"
                  min="0"
                  value={productForm.inventory || '1'}
                  onChange={(event) => setProductForm((current) => ({ ...current, inventory: event.target.value }))}
                  placeholder="So luong"
                />
              </div>

              <label className="workspace-note upload-dropzone">
                <strong>Anh san pham</strong>
                <small className="muted">
                  Tai len 1 hoac nhieu anh. {existingImageCount ? `Dang co ${existingImageCount} anh cu.` : ''}
                </small>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(event) => setProductFiles(Array.from(event.target.files || []))}
                />
              </label>

              <div className="form-grid form-grid--three">
                <select
                  value={productForm.fulfillmentType}
                  onChange={(event) =>
                    setProductForm((current) => ({ ...current, fulfillmentType: event.target.value }))
                  }
                >
                  {FULFILLMENT_TYPES.map((item) => (
                    <option key={item} value={item}>
                      {FULFILLMENT_LABELS[item] || item}
                    </option>
                  ))}
                </select>
                <div className="workspace-note compact-note">
                  <strong>Hinh thuc ban</strong>
                  <span className="muted">Ban ngay</span>
                </div>
                <div className="workspace-note compact-note">
                  <strong>Trang thai</strong>
                  <span className="muted">{STATUS_LABELS[productForm.status] || productForm.status}</span>
                </div>
              </div>

              <label className="checkbox-row auth-checkbox">
                <input
                  type="checkbox"
                  checked={Boolean(productForm.isNegotiable)}
                  onChange={(event) =>
                    setProductForm((current) => ({ ...current, isNegotiable: event.target.checked }))
                  }
                />
                <span>Cho phep thuong luong gia</span>
              </label>

              <textarea
                value={productForm.description}
                onChange={(event) =>
                  setProductForm((current) => ({ ...current, description: event.target.value }))
                }
                placeholder="Mo ta tinh trang, phu kien di kem, ly do ban..."
                rows={5}
                required
              />

              <input
                value={productForm.tags}
                onChange={(event) => setProductForm((current) => ({ ...current, tags: event.target.value }))}
                placeholder="Tu khoa tim kiem, cach nhau boi dau phay"
              />

              <textarea
                value={productForm.addressText}
                onChange={(event) =>
                  setProductForm((current) => ({ ...current, addressText: event.target.value }))
                }
                placeholder="Dia chi hien thi hoac diem hen giao dich"
                rows={2}
              />

              <div className="actions-row">
                <button type="submit" className="primary-btn">
                  {editingProductId ? 'Cap nhat tin dang' : 'Dang tin'}
                </button>
                <button type="button" className="ghost-btn" onClick={onResetProductForm}>
                  Lam moi
                </button>
              </div>
            </form>

            <aside className="workspace-form__aside">
              <div className="workspace-note">
                <strong>Xem truoc tin dang</strong>
                <p className="muted">{productForm.title || 'Tieu de tin dang se hien o day.'}</p>
                <div className="tag-row">
                  <small>{categoryName}</small>
                  <small>{CONDITION_LABELS[productForm.condition] || productForm.condition}</small>
                  <small>{STATUS_LABELS[productForm.status] || productForm.status}</small>
                </div>
                <span className="price">{formatPrice(productForm.price || 0)} VND</span>
                <small>{listingPreviewLocation}</small>
                <small>
                  {productForm.isNegotiable ? 'Co thuong luong' : 'Khong thuong luong'} |{' '}
                  {FULFILLMENT_LABELS[productForm.fulfillmentType] || productForm.fulfillmentType}
                </small>
              </div>
              <div className="workspace-note">
                <strong>Nhac nhanh</strong>
                <ul className="sidebar-tips">
                  <li>Tieu de ro rang se de tim kiem hon.</li>
                  <li>Gia va khu vuc la 2 thong tin nguoi mua xem dau tien.</li>
                  <li>Mo ta ngan gon nhung du thong tin se de chot don hon.</li>
                </ul>
              </div>
            </aside>
          </div>
        </SectionCard>
      ) : null}

      {showProductList ? (
        <SectionCard title="Listing cua toi" subtitle={`${sellerProducts.length} san pham`} className="wide">
          <div className="actions-row wrap">
            <button type="button" className="primary-btn" onClick={onResetProductForm}>
              Tao listing moi
            </button>
            {listingSummary.map((item) => (
              <span key={item.label} className="route-pill">
                {item.label}: {item.value}
              </span>
            ))}
          </div>

          <div className="form-grid form-grid--three">
            <input
              value={productQuery}
              onChange={(event) => setProductQuery(event.target.value)}
              placeholder="Tim theo tieu de, mo ta, tags..."
            />
            <select
              value={productStatusFilter}
              onChange={(event) => setProductStatusFilter(event.target.value)}
            >
              <option value="all">Tat ca trang thai</option>
              {SELLER_PRODUCT_STATUS_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {STATUS_LABELS[item] || item}
                </option>
              ))}
            </select>
            <div className="workspace-note compact-note">
              <strong>{filteredProducts.length}</strong>
              <span className="muted">listing phu hop bo loc hien tai</span>
            </div>
          </div>

          <div className="resource-list">
            {filteredProducts.map((product) => (
              <article key={product._id} className="resource-item admin-item-card">
                <div>
                  <div className="tag-row">
                    <strong>{product.title}</strong>
                    <small>{STATUS_LABELS[product.status] || product.status}</small>
                    <small>{CONDITION_LABELS[product.condition] || product.condition}</small>
                  </div>
                  <p>{compactText(product.description, 140)}</p>
                  <small>{product.category?.name || 'Khong ro danh muc'} | so luong {product.inventory ?? 1}</small>
                  <small>{joinLocation(product.city || product.province, product.region)}</small>
                  <small>
                    {product.isNegotiable ? 'Co thuong luong' : 'Gia co dinh'} |{' '}
                    {FULFILLMENT_LABELS[product.fulfillmentType] || product.fulfillmentType}
                  </small>
                  {(product.tags || []).length ? (
                    <div className="tag-row listing-card__tags">
                      {(product.tags || []).slice(0, 6).map((tag) => (
                        <small key={`${product._id}-${tag}`}>{tag}</small>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="resource-item__meta">
                  <span>{formatPrice(product.price)} VND</span>
                  <div className="mini-actions wrap">
                    <button type="button" onClick={() => onEditProduct(product)}>
                      Sua
                    </button>
                    <button type="button" onClick={() => onDeleteProduct(product._id)}>
                      Xoa
                    </button>
                  </div>
                </div>
              </article>
            ))}
            {!filteredProducts.length ? (
              <div className="empty-state compact-empty">
                <strong>Chua co listing phu hop.</strong>
                <p className="muted">Thu doi bo loc hoac tao listing moi de bat dau ban hang.</p>
              </div>
            ) : null}
          </div>
        </SectionCard>
      ) : null}

      {showAuctionForm ? (
        <SectionCard title={auctionForm.id ? 'Sửa đấu giá' : 'Tạo đấu giá'} subtitle="Tạo phiên đấu giá gọn, dễ dùng" className="wide">
          <div className="workspace-form">
            <form className="stack gap-sm" onSubmit={onSaveAuction}>
              <div className="form-grid form-grid--three">
                <select
                  value={auctionForm.productId}
                  onChange={(event) =>
                    setAuctionForm((current) => ({ ...current, productId: event.target.value }))
                  }
                  required
                >
                  <option value="">Chon san pham</option>
                  {sellerProducts.map((product) => (
                    <option key={product._id} value={product._id}>
                      {product.title}
                    </option>
                  ))}
                </select>
                <select
                  value={auctionForm.status}
                  onChange={(event) =>
                    setAuctionForm((current) => ({ ...current, status: event.target.value }))
                  }
                >
                  {AUCTION_STATUS_OPTIONS.map((item) => (
                    <option key={item} value={item}>
                      {item === 'scheduled' ? 'scheduled - chờ mở' : item === 'live' ? 'live - đang diễn ra' : item === 'ended' ? 'ended - đã kết thúc' : item}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  value={auctionForm.bidStep}
                  onChange={(event) =>
                    setAuctionForm((current) => ({ ...current, bidStep: event.target.value }))
                  }
                  placeholder="Buoc gia"
                />

                <input
                  type="datetime-local"
                  value={auctionForm.startAt}
                  onChange={(event) =>
                    setAuctionForm((current) => ({ ...current, startAt: event.target.value }))
                  }
                  required
                />
                <input
                  type="datetime-local"
                  value={auctionForm.endAt}
                  onChange={(event) =>
                    setAuctionForm((current) => ({ ...current, endAt: event.target.value }))
                  }
                  required
                />
                <input
                  type="number"
                  min="0"
                  value={auctionForm.startingBid}
                  onChange={(event) =>
                    setAuctionForm((current) => ({ ...current, startingBid: event.target.value }))
                  }
                  placeholder="Gia khoi diem"
                  required
                />
              </div>

              <div className="actions-row">
                <button type="submit" className="primary-btn">
                  {auctionForm.id ? 'Cap nhat dau gia' : 'Tao dau gia'}
                </button>
                <button type="button" className="ghost-btn" onClick={onResetAuctionForm}>
                  Lam moi
                </button>
              </div>
            </form>

            <aside className="workspace-form__aside">
              <div className="workspace-note">
                <strong>Tong quan dau gia</strong>
                <div className="tag-row">
                  <small>{auctionForm.status || 'scheduled'}</small>
                  <small>buoc gia {formatPrice(auctionForm.bidStep || 0)}</small>
                </div>
                <small>San pham: {selectedAuctionProduct?.title || 'chua chon'}</small>
                <small>Gia listing: {formatPrice(selectedAuctionProduct?.price || 0)} VND</small>
                <span className="price">{formatPrice(auctionForm.startingBid || 0)} VND</span>
                <small>Gia hien tai: {formatPrice(auctionForm.currentBid || auctionForm.startingBid || 0)} VND</small>
                <small>Bat dau: {auctionForm.startAt || 'chua chon'}</small>
                <small>Ket thuc: {auctionForm.endAt || 'chua chon'}</small>
              </div>
            </aside>
          </div>
        </SectionCard>
      ) : null}

      {showAuctionList ? (
        <SectionCard title="Đấu giá của tôi" subtitle={`${sellerAuctions.length} phiên`} className="wide">
          <div className="resource-list">
            {sellerAuctions.map((auction) => (
              <article key={auction._id} className="resource-item">
                <div>
                  <strong>{auction.product?.title || 'Đấu giá'}</strong>
                  <p>
                    {auction.status} | hiện tại {formatPrice(auction.currentBid || auction.startingBid)} VND
                  </p>
                  <small>
                    {formatDateTime(auction.startAt)} {'->'} {formatDateTime(auction.endAt)}
                  </small>
                </div>
                <div className="resource-item__meta">
                  <div className="mini-actions wrap">
                    <button type="button" onClick={() => onViewAuction(auction._id)}>
                      Chi tiết
                    </button>
                    <button type="button" onClick={() => onEditAuction(auction)}>
                      Sửa
                    </button>
                    {auction.status !== 'live' ? (
                      <button type="button" onClick={() => onOpenAuction(auction._id)}>
                        Mở
                      </button>
                    ) : (
                      <button type="button" onClick={() => onCloseAuction(auction._id)}>
                        Đóng
                      </button>
                    )}
                    <button type="button" onClick={() => onDeleteAuction(auction._id)}>
                      Xóa
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </SectionCard>
      ) : null}
    </div>
  );
};

export default SellerView;
