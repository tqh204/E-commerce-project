import { useMemo, useState } from 'react';
import AppLink from '../components/AppLink';
import SectionCard from '../components/SectionCard';
import { FULFILLMENT_TYPES, PRODUCT_CONDITIONS } from '@frontend-utils/constants';
import { compactText, formatDateTime, formatPrice, joinLocation } from '@frontend-utils/format';

const CONDITION_LABELS = {
  new: 'Mới',
  like_new: 'Như mới',
  good: 'Tốt',
  fair: 'Khá',
  poor: 'Kém',
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

const FULFILLMENT_LABELS = {
  meetup: 'Gặp mặt trực tiếp',
  shipping: 'Giao hàng',
  both: 'Cả hai',
};

const SELLER_PRODUCT_STATUS_OPTIONS = ['draft', 'active', 'hidden', 'sold'];
const SELLER_AUCTION_STATUS_OPTIONS = ['scheduled', 'cancelled'];

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
      'Chưa chọn danh mục',
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
      { label: 'Tổng listing', value: sellerProducts.length },
      { label: 'Đang hiển thị', value: sellerProducts.filter((item) => item.status === 'active').length },
      { label: 'Đã ẩn', value: sellerProducts.filter((item) => item.status === 'hidden').length },
      { label: 'Bản nháp', value: sellerProducts.filter((item) => item.status === 'draft').length },
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
          title={editingProductId ? 'Sửa tin đăng' : 'Đăng tin mới'}
          subtitle="Thông tin đăng bán"
          className="wide"
        >
          <div className="workspace-form">
            <form className="stack gap-sm" onSubmit={onSaveProduct}>
              <div className="workspace-note">
                <strong>Danh mục được tạo ở form riêng</strong>
                <small className="muted">
                  Nếu chưa có danh mục phù hợp, tạo danh mục trước rồi quay lại đăng tin.
                </small>
                <div className="actions-row wrap">
                  {canManageCategories ? (
                    <AppLink to={categoryCreatePath} className="route-pill">
                      Tạo danh mục
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
                  placeholder="Tiêu đề tin đăng"
                  required
                />
                <select
                  value={productForm.categoryId}
                  onChange={(event) =>
                    setProductForm((current) => ({ ...current, categoryId: event.target.value }))
                  }
                  required
                >
                  <option value="">Chọn danh mục</option>
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
                  placeholder="Giá bán"
                  required
                />
                <input
                  value={productForm.region}
                  onChange={(event) => setProductForm((current) => ({ ...current, region: event.target.value }))}
                  placeholder="Khu vực"
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
                  placeholder="Tỉnh / Thành phố"
                  required
                />

                <input
                  value={productForm.district}
                  onChange={(event) => setProductForm((current) => ({ ...current, district: event.target.value }))}
                  placeholder="Quận / Huyện"
                />
                <input
                  value={productForm.ward}
                  onChange={(event) => setProductForm((current) => ({ ...current, ward: event.target.value }))}
                  placeholder="Phường / Xã"
                />
                <input
                  type="number"
                  min="0"
                  value={productForm.inventory || '1'}
                  onChange={(event) => setProductForm((current) => ({ ...current, inventory: event.target.value }))}
                  placeholder="Số lượng"
                />
              </div>

              <label className="workspace-note upload-dropzone">
                <strong>Ảnh sản phẩm</strong>
                <small className="muted">
                  Tải lên 1 hoặc nhiều ảnh. {existingImageCount ? `Đang có ${existingImageCount} ảnh cũ.` : ''}
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
                  <strong>Hình thức bán</strong>
                  <span className="muted">Bán ngay</span>
                </div>
                <div className="workspace-note compact-note">
                  <strong>Trạng thái</strong>
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
                <span>Cho phép thương lượng giá</span>
              </label>

              <textarea
                value={productForm.description}
                onChange={(event) =>
                  setProductForm((current) => ({ ...current, description: event.target.value }))
                }
                placeholder="Mô tả tình trạng, phụ kiện đi kèm, lý do bán..."
                rows={5}
                required
              />

              <input
                value={productForm.tags}
                onChange={(event) => setProductForm((current) => ({ ...current, tags: event.target.value }))}
                placeholder="Từ khóa tìm kiếm, cách nhau bởi dấu phẩy"
              />

              <textarea
                value={productForm.addressText}
                onChange={(event) =>
                  setProductForm((current) => ({ ...current, addressText: event.target.value }))
                }
                placeholder="Địa chỉ hiển thị hoặc điểm hẹn giao dịch"
                rows={2}
              />

              <div className="actions-row">
                <button type="submit" className="primary-btn">
                  {editingProductId ? 'Cập nhật tin đăng' : 'Đăng tin'}
                </button>
                <button type="button" className="ghost-btn" onClick={onResetProductForm}>
                  Làm mới
                </button>
              </div>
            </form>

            <aside className="workspace-form__aside">
              <div className="workspace-note">
                <strong>Xem trước tin đăng</strong>
                <p className="muted">{productForm.title || 'Tiêu đề tin đăng sẽ hiện ở đây.'}</p>
                <div className="tag-row">
                  <small>{categoryName}</small>
                  <small>{CONDITION_LABELS[productForm.condition] || productForm.condition}</small>
                  <small>{STATUS_LABELS[productForm.status] || productForm.status}</small>
                </div>
                <span className="price">{formatPrice(productForm.price || 0)} VND</span>
                <small>{listingPreviewLocation}</small>
                <small>
                  {productForm.isNegotiable ? 'Có thương lượng' : 'Không thương lượng'} |{' '}
                  {FULFILLMENT_LABELS[productForm.fulfillmentType] || productForm.fulfillmentType}
                </small>
              </div>
              <div className="workspace-note">
                <strong>Nhắc nhanh</strong>
                <ul className="sidebar-tips">
                  <li>Tiêu đề rõ ràng sẽ dễ tìm kiếm hơn.</li>
                  <li>Giá và khu vực là 2 thông tin người mua xem đầu tiên.</li>
                  <li>Mô tả ngắn gọn nhưng đủ thông tin sẽ dễ chốt đơn hơn.</li>
                </ul>
              </div>
            </aside>
          </div>
        </SectionCard>
      ) : null}

      {showProductList ? (
        <SectionCard title="Listing của tôi" subtitle={`${sellerProducts.length} sản phẩm`} className="wide">
          <div className="actions-row wrap">
            <button type="button" className="primary-btn" onClick={onResetProductForm}>
              Tạo listing mới
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
              placeholder="Tìm theo tiêu đề, mô tả, tags..."
            />
            <select
              value={productStatusFilter}
              onChange={(event) => setProductStatusFilter(event.target.value)}
            >
              <option value="all">Tất cả trạng thái</option>
              {SELLER_PRODUCT_STATUS_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {STATUS_LABELS[item] || item}
                </option>
              ))}
            </select>
            <div className="workspace-note compact-note">
              <strong>{filteredProducts.length}</strong>
              <span className="muted">listing phù hợp bộ lọc hiện tại</span>
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
                  <small>{product.category?.name || 'Không rõ danh mục'} | số lượng {product.inventory ?? 1}</small>
                  <small>{joinLocation(product.city || product.province, product.region)}</small>
                  <small>
                    {product.isNegotiable ? 'Có thương lượng' : 'Giá cố định'} |{' '}
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
                      Sửa
                    </button>
                    <button type="button" onClick={() => onDeleteProduct(product._id)}>
                      Xóa
                    </button>
                  </div>
                </div>
              </article>
            ))}
            {!filteredProducts.length ? (
              <div className="empty-state compact-empty">
                <strong>Chưa có listing phù hợp.</strong>
                <p className="muted">Thử đổi bộ lọc hoặc tạo listing mới để bắt đầu bán hàng.</p>
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
                  <option value="">Chọn sản phẩm</option>
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
                  {SELLER_AUCTION_STATUS_OPTIONS.map((item) => (
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
                  placeholder="Bước giá"
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
                  placeholder="Giá khởi điểm"
                  required
                />
              </div>

              <div className="actions-row">
                <button type="submit" className="primary-btn">
                  {auctionForm.id ? 'Cập nhật đấu giá' : 'Tạo đấu giá'}
                </button>
                <button type="button" className="ghost-btn" onClick={onResetAuctionForm}>
                  Làm mới
                </button>
              </div>
            </form>

            <aside className="workspace-form__aside">
              <div className="workspace-note">
                <strong>Tổng quan đấu giá</strong>
                <div className="tag-row">
                  <small>{auctionForm.status || 'scheduled'}</small>
                  <small>bước giá {formatPrice(auctionForm.bidStep || 0)}</small>
                </div>
                <small>Sản phẩm: {selectedAuctionProduct?.title || 'chưa chọn'}</small>
                <small>Giá listing: {formatPrice(selectedAuctionProduct?.price || 0)} VND</small>
                <span className="price">{formatPrice(auctionForm.startingBid || 0)} VND</span>
                <small>Giá hiện tại: {formatPrice(auctionForm.currentBid || auctionForm.startingBid || 0)} VND</small>
                <small>Bắt đầu: {auctionForm.startAt || 'chưa chọn'}</small>
                <small>Kết thúc: {auctionForm.endAt || 'chưa chọn'}</small>
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
