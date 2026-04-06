import { useMemo, useState } from 'react';
import SectionCard from '../components/SectionCard';
import AppLink from '../components/AppLink';
import {
  ESCROW_ACTIONS,
  ORDER_STATUS_OPTIONS,
  PRODUCT_STATUS_OPTIONS,
  ROLE_OPTIONS,
} from '@frontend-utils/constants';
import {
  compactText,
  formatDateTime,
  formatPrice,
  joinLocation,
  roleNames,
  toPrettyJson,
} from '@frontend-utils/format';

const PRODUCT_STATUS_LABELS = {
  draft: 'Bản nháp',
  pending: 'Chờ duyệt',
  active: 'Đang hiển thị',
  hidden: 'Đã ẩn',
  sold: 'Đã bán',
  rejected: 'Từ chối',
  archived: 'Lưu trữ',
};

const PRODUCT_CONDITION_LABELS = {
  new: 'Mới',
  like_new: 'Như mới',
  good: 'Tốt',
  fair: 'Khá',
  poor: 'Kém',
};

const SALE_TYPE_LABELS = {
  fixed_price: 'Mua ngay',
  auction: 'Đấu giá',
};

const FULFILLMENT_LABELS = {
  meetup: 'Gặp mặt',
  shipping: 'Giao hàng',
  both: 'Cả hai',
};

const AdminView = ({
  isAdmin,
  canDeleteProducts = true,
  users = [],
  onPatchUser,
  onDeleteUser,
  categories = [],
  categoryForm,
  setCategoryForm,
  categoryEditId,
  categoryImagePreview = '',
  categoryCreateMode = false,
  onSaveCategory,
  onCategoryImageSelect,
  onClearCategoryImage,
  onEditCategory,
  onResetCategoryForm,
  onDeleteCategory,
  products = [],
  onModerateProduct,
  onDeleteProduct,
  orders = [],
  onUpdateOrderStatus,
  onDeleteOrder,
  auctions = [],
  onOpenAuction,
  onCloseAuction,
  onDeleteAuction,
  escrows = [],
  onEscrowAction,
  reviews = [],
  onToggleReviewVisibility,
  onRespondReview,
  importForm,
  setImportForm,
  onRunImport,
  importBatches = [],
  selectedBatch,
  onSelectBatch,
  showImport = true,
  showUsers = true,
  showCategories = true,
  showProducts = true,
  showOperations = true,
}) => {
  const [categoryQuery, setCategoryQuery] = useState('');
  const [productQuery, setProductQuery] = useState('');
  const [productStatusFilter, setProductStatusFilter] = useState('all');

  const filteredCategories = useMemo(() => {
    const query = categoryQuery.trim().toLowerCase();
    return categories.filter((category) => {
      const haystack = [category.name, category.slug, category.description]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return !query || haystack.includes(query);
    });
  }, [categories, categoryQuery]);

  const filteredProducts = useMemo(() => {
    const query = productQuery.trim().toLowerCase();
    return products.filter((item) => {
      const matchesStatus = productStatusFilter === 'all' ? true : item.status === productStatusFilter;
      const haystack = [
        item.title,
        item.description,
        item.category?.name,
        item.seller?.fullName,
        item.seller?.username,
        ...(item.tags || []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return matchesStatus && (!query || haystack.includes(query));
    });
  }, [productQuery, productStatusFilter, products]);
  const categoryPreviewSrc = categoryImagePreview || categoryForm?.image || '';

  if (!isAdmin) {
    return (
      <SectionCard title="Khu quản trị" subtitle="Giới hạn quyền truy cập">
        <p className="muted">Khu quản trị chỉ mở cho tài khoản quản trị viên.</p>
      </SectionCard>
    );
  }

  return (
    <div className="view-grid">
      {showImport ? (
        <SectionCard
          title="Nhập dữ liệu từ Chợ Tốt"
          subtitle="Chạy batch và xem chi tiết import"
          className="wide"
        >
          <form className="stack gap-sm" onSubmit={onRunImport}>
            <div className="form-grid form-grid--three">
              <input
                value={importForm.categoryUrl}
                onChange={(event) =>
                  setImportForm((current) => ({ ...current, categoryUrl: event.target.value }))
                }
                placeholder="URL danh mục"
              />
              <input
                value={importForm.categoryName}
                onChange={(event) =>
                  setImportForm((current) => ({ ...current, categoryName: event.target.value }))
                }
                placeholder="Tên danh mục"
              />
              <input
                type="number"
                value={importForm.maxPages}
                onChange={(event) =>
                  setImportForm((current) => ({ ...current, maxPages: event.target.value }))
                }
                placeholder="Số trang tối đa"
              />
              <input
                value={importForm.keyword}
                onChange={(event) =>
                  setImportForm((current) => ({ ...current, keyword: event.target.value }))
                }
                placeholder="Từ khóa"
              />
              <select
                value={importForm.mode}
                onChange={(event) =>
                  setImportForm((current) => ({ ...current, mode: event.target.value }))
                }
              >
                <option value="html">HTML</option>
                <option value="api">API</option>
              </select>
              <button type="submit">Chạy nhập dữ liệu</button>
            </div>
          </form>

          <div className="two-col">
            <div className="resource-list">
              {importBatches.map((batch) => (
                <button
                  key={batch._id}
                  className={selectedBatch?._id === batch._id ? 'resource-item active' : 'resource-item'}
                  onClick={() => onSelectBatch(batch._id)}
                >
                  <div>
                    <strong>{batch.source}</strong>
                    <p>
                      {batch.status} | thêm mới {batch.totalInserted || 0} | cập nhật {batch.totalUpdated || 0}
                    </p>
                  </div>
                  <small>{formatDateTime(batch.startedAt)}</small>
                </button>
              ))}
            </div>
            <div>
              {selectedBatch ? (
                <pre className="json-box">{toPrettyJson(selectedBatch)}</pre>
              ) : (
                <p className="muted">Chọn một batch để xem chi tiết.</p>
              )}
            </div>
          </div>
        </SectionCard>
      ) : null}

      {showUsers ? (
        <SectionCard
          title="Người dùng"
          subtitle="Hệ thống chỉ còn hai role: user và admin"
          className="wide"
        >
          <div className="resource-list admin-resource-list">
            {users.map((item) => (
              <article key={item._id} className="resource-item admin-item-card">
                <div>
                  <strong>{item.fullName || item.username}</strong>
                  <p>{item.email}</p>
                  <small>
                    {roleNames(item.roles)} | {item.isActive ? 'đang hoạt động' : 'đã khóa'} |{' '}
                    {item.isVerified ? 'đã xác minh' : 'chưa xác minh'}
                  </small>
                </div>
                <div className="resource-item__meta">
                  <div className="mini-actions wrap">
                    {ROLE_OPTIONS.map((role) => (
                      <button key={role} type="button" onClick={() => onPatchUser(item, { roles: [role] })}>
                        {role}
                      </button>
                    ))}
                    <button type="button" onClick={() => onPatchUser(item, { isActive: !item.isActive })}>
                      {item.isActive ? 'Tạm khóa' : 'Kích hoạt'}
                    </button>
                    <button type="button" onClick={() => onPatchUser(item, { isVerified: !item.isVerified })}>
                      {item.isVerified ? 'Bỏ xác minh' : 'Xác minh'}
                    </button>
                    <button type="button" onClick={() => onDeleteUser(item._id)}>
                      Xóa
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </SectionCard>
      ) : null}

      {showCategories ? (
        <SectionCard
          title={categoryEditId ? 'Sửa danh mục' : categoryCreateMode ? 'Tạo danh mục' : 'Quản lý danh mục'}
          subtitle="Nhóm sản phẩm hiển thị trên giao diện trang chủ"
          className="wide"
        >
          <div className="workspace-form">
            <form className="stack gap-sm" onSubmit={onSaveCategory}>
              <div className="form-grid form-grid--three">
                <input
                  value={categoryForm.name}
                  onChange={(event) =>
                    setCategoryForm((current) => ({ ...current, name: event.target.value }))
                  }
                  placeholder="Tên danh mục"
                  required
                />
                <input
                  value={categoryForm.slug}
                  onChange={(event) =>
                    setCategoryForm((current) => ({ ...current, slug: event.target.value }))
                  }
                  placeholder="Slug URL"
                />
                <input
                  type="number"
                  value={categoryForm.sortOrder}
                  onChange={(event) =>
                    setCategoryForm((current) => ({ ...current, sortOrder: event.target.value }))
                  }
                  placeholder="Thứ tự hiển thị"
                />
              </div>
              <div className="category-upload-card">
                <div className="category-upload-card__copy">
                  <strong>Ảnh danh mục</strong>
                  <p className="muted">
                    Chọn ảnh trực tiếp từ máy để hiển thị ở phần danh mục quản trị và ngoài trang chủ.
                  </p>
                </div>
                <div className="category-upload-card__actions">
                  <label className="category-upload-input" htmlFor="category-image-input">
                    <span>Chọn ảnh từ máy</span>
                    <input
                      key={categoryPreviewSrc || categoryEditId || 'category-image-empty'}
                      id="category-image-input"
                      type="file"
                      accept="image/*"
                      onChange={(event) => onCategoryImageSelect?.(event.target.files?.[0] || null)}
                    />
                  </label>
                  {categoryPreviewSrc ? (
                    <button type="button" className="ghost-btn" onClick={onClearCategoryImage}>
                      Xóa ảnh
                    </button>
                  ) : null}
                </div>
              </div>
              <textarea
                value={categoryForm.description}
                onChange={(event) =>
                  setCategoryForm((current) => ({ ...current, description: event.target.value }))
                }
                placeholder="Mô tả ngắn"
                rows={3}
              />
              <label className="checkbox-row auth-checkbox">
                <input
                  type="checkbox"
                  checked={categoryForm.isActive !== false}
                  onChange={(event) =>
                    setCategoryForm((current) => ({ ...current, isActive: event.target.checked }))
                  }
                />
                <span>Hiển thị danh mục cho người dùng</span>
              </label>
              <div className="actions-row">
                <button type="submit" className="primary-btn">
                  {categoryEditId ? 'Cập nhật danh mục' : 'Tạo danh mục'}
                </button>
                <button type="button" className="ghost-btn" onClick={onResetCategoryForm}>
                  Làm mới form
                </button>
              </div>
            </form>

            <aside className="workspace-form__aside">
              <div className="workspace-note">
                <strong>Xem trước danh mục</strong>
                {categoryPreviewSrc ? (
                  <div className="category-preview-media">
                    <img src={categoryPreviewSrc} alt={categoryForm.name || 'Danh mục'} />
                  </div>
                ) : (
                  <div className="category-preview-placeholder">
                    <span>Chưa có ảnh danh mục</span>
                  </div>
                )}
                <p className="muted">{categoryForm.name || 'Tên danh mục sẽ hiển thị ở đây.'}</p>
                <div className="tag-row">
                  <small>{categoryForm.slug || 'slug-tu-dong'}</small>
                  <small>thứ tự {categoryForm.sortOrder || 0}</small>
                  <small>{categoryForm.isActive !== false ? 'đang hiển thị' : 'đang ẩn'}</small>
                </div>
              </div>
            </aside>
          </div>

          <div className="form-grid form-grid--three">
            <input
              value={categoryQuery}
              onChange={(event) => setCategoryQuery(event.target.value)}
              placeholder="Tìm theo tên, slug hoặc mô tả..."
            />
          </div>

          <div className="resource-list admin-resource-list">
            {filteredCategories.map((category) => (
              <article key={category._id} className="resource-item admin-item-card">
                <div>
                  {category.image ? (
                    <div className="category-card-media">
                      <img src={category.image} alt={category.name} />
                    </div>
                  ) : null}
                  <div className="tag-row">
                    <strong>{category.name}</strong>
                    <small>{category.isActive !== false ? 'đang hiển thị' : 'đang ẩn'}</small>
                    <small>{category.productCount || 0} sản phẩm</small>
                  </div>
                  <p>{category.description || 'Chưa có mô tả danh mục.'}</p>
                  <small>/{category.slug} | thứ tự {category.sortOrder || 0}</small>
                </div>
                <div className="resource-item__meta">
                  <div className="mini-actions wrap">
                    <button type="button" onClick={() => onEditCategory(category)}>
                      Sửa
                    </button>
                    <button type="button" onClick={() => onDeleteCategory(category._id)}>
                      Xóa
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </SectionCard>
      ) : null}

      {showProducts ? (
        <SectionCard
          title="Quản lý sản phẩm"
          subtitle="Kiểm tra tin đăng, cập nhật trạng thái và chỉnh sửa nhanh"
          className="wide"
        >
          <div className="actions-row wrap admin-toolbar">
            <AppLink to="/admin/products/create" className="route-pill route-pill--highlight">
              Tạo tin đăng mới
            </AppLink>
            <span className="route-pill">Bản nháp: {products.filter((item) => item.status === 'draft').length}</span>
            <span className="route-pill">Đang hiển thị: {products.filter((item) => item.status === 'active').length}</span>
            <span className="route-pill">Đã ẩn: {products.filter((item) => item.status === 'hidden').length}</span>
          </div>

          <div className="form-grid form-grid--three">
            <input
              value={productQuery}
              onChange={(event) => setProductQuery(event.target.value)}
              placeholder="Tìm theo tên, người bán, danh mục hoặc từ khóa..."
            />
            <select value={productStatusFilter} onChange={(event) => setProductStatusFilter(event.target.value)}>
              <option value="all">Tất cả trạng thái</option>
              {PRODUCT_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {PRODUCT_STATUS_LABELS[status] || status}
                </option>
              ))}
            </select>
            <div className="workspace-note compact-note">
              <strong>{filteredProducts.length}</strong>
              <span className="muted">tin đăng khớp với bộ lọc hiện tại</span>
            </div>
          </div>

          <div className="resource-list admin-resource-list admin-resource-list--products">
            {filteredProducts.map((item) => (
              <article key={item._id} className="resource-item admin-item-card admin-product-card">
                <div className="admin-product-card__content">
                  <div className="admin-product-card__head">
                    <div>
                      <strong>{item.title}</strong>
                      <p className="admin-product-card__price">{formatPrice(item.price)} VND</p>
                    </div>
                    <small>{formatDateTime(item.createdAt)}</small>
                  </div>

                  <div className="tag-row listing-card__tags admin-product-card__tags">
                    <small>{PRODUCT_STATUS_LABELS[item.status] || item.status}</small>
                    <small>{PRODUCT_CONDITION_LABELS[item.condition] || item.condition}</small>
                    <small>{SALE_TYPE_LABELS[item.saleType] || item.saleType}</small>
                  </div>

                  <p>{compactText(item.description, 120)}</p>

                  <div className="admin-product-card__meta">
                    <small>Danh mục: {item.category?.name || 'Chưa rõ'}</small>
                    <small>Người bán: {item.seller?.fullName || item.seller?.username || 'Chưa rõ'}</small>
                    <small>Khu vực: {joinLocation(item.city || item.province, item.region || item.district)}</small>
                    <small>
                      Giao dịch: {item.isNegotiable ? 'Có thương lượng' : 'Không thương lượng'} ·{' '}
                      {FULFILLMENT_LABELS[item.fulfillmentType] || item.fulfillmentType || 'Cả hai'}
                    </small>
                  </div>
                </div>

                <div className="resource-item__meta admin-product-card__actions">
                  <AppLink to={`/admin/products/${item._id}/edit`} className="route-pill route-pill--button">
                    Sửa
                  </AppLink>
                  <div className="mini-actions wrap admin-status-actions">
                    {['draft', 'active', 'hidden', 'sold', 'archived'].map((status) => (
                      <button
                        key={`${item._id}-${status}`}
                        type="button"
                        className={item.status === status ? 'admin-status-btn active' : 'admin-status-btn'}
                        onClick={() => onModerateProduct(item._id, status)}
                      >
                        {PRODUCT_STATUS_LABELS[status] || status}
                      </button>
                    ))}
                  </div>
                  {canDeleteProducts ? (
                    <button type="button" className="admin-delete-btn" onClick={() => onDeleteProduct(item._id)}>
                      Xóa
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </SectionCard>
      ) : null}

      {showOperations ? (
        <SectionCard
          title="Đơn hàng / Đấu giá / Ký quỹ / Đánh giá"
          subtitle="Khu vận hành của quản trị viên"
          className="wide"
        >
          <div className="admin-grid">
            <div className="stack gap-sm admin-column-card">
              <h4>Đơn hàng</h4>
              {orders.slice(0, 12).map((order) => (
                <article key={order._id} className="resource-item compact">
                  <div>
                    <strong>{order.orderCode}</strong>
                    <p>{order.product?.title || 'Đơn hàng'}</p>
                  </div>
                  <div className="mini-actions wrap">
                    <AppLink to={`/orders/${order._id}`} className="route-pill">
                      Chi tiết
                    </AppLink>
                    {ORDER_STATUS_OPTIONS.slice(0, 4).map((status) => (
                      <button key={status} type="button" onClick={() => onUpdateOrderStatus(order._id, status)}>
                        {status}
                      </button>
                    ))}
                    <button type="button" onClick={() => onDeleteOrder(order._id)}>
                      Xóa
                    </button>
                  </div>
                </article>
              ))}
            </div>

            <div className="stack gap-sm admin-column-card">
              <h4>Đấu giá</h4>
              {auctions.slice(0, 12).map((auction) => (
                <article key={auction._id} className="resource-item compact">
                  <div>
                    <strong>{auction.product?.title || auction._id}</strong>
                    <p>{auction.status} | {formatPrice(auction.currentBid || auction.startingBid)} VND</p>
                    <small>Bước giá {formatPrice(auction.bidStep || auction.minimumBidStep || 0)} VND</small>
                  </div>
                  <div className="mini-actions wrap">
                    <AppLink to={`/auctions/${auction._id}`} className="route-pill">
                      Chi tiết
                    </AppLink>
                    {auction.status === 'scheduled' ? (
                      <button type="button" onClick={() => onOpenAuction(auction._id)}>
                        Mở
                      </button>
                    ) : null}
                    {auction.status === 'live' ? (
                      <button type="button" onClick={() => onCloseAuction(auction._id)}>
                        Đóng
                      </button>
                    ) : null}
                    <button type="button" onClick={() => onDeleteAuction(auction._id)}>
                      Xóa
                    </button>
                  </div>
                </article>
              ))}
            </div>

            <div className="stack gap-sm admin-column-card">
              <h4>Ký quỹ</h4>
              {escrows.slice(0, 12).map((escrow) => (
                <article key={escrow._id} className="resource-item compact">
                  <div>
                    <strong>{escrow.order?.orderCode || escrow._id}</strong>
                    <p>{escrow.status}</p>
                  </div>
                  <div className="mini-actions wrap">
                    <AppLink to={`/escrows/${escrow._id}`} className="route-pill">
                      Chi tiết
                    </AppLink>
                    {ESCROW_ACTIONS.map((action) => (
                      <button key={action} type="button" onClick={() => onEscrowAction(escrow._id, action)}>
                        {action}
                      </button>
                    ))}
                  </div>
                </article>
              ))}
            </div>

            <div className="stack gap-sm admin-column-card">
              <h4>Đánh giá</h4>
              {reviews.slice(0, 12).map((review) => (
                <article key={review._id} className="resource-item compact">
                  <div>
                    <strong>{review.product?.title || review._id}</strong>
                    <p>{review.score}/5 | {review.isVisible ? 'đang hiển thị' : 'đang ẩn'}</p>
                  </div>
                  <div className="mini-actions">
                    <button type="button" onClick={() => onRespondReview(review._id)}>
                      Phản hồi
                    </button>
                    <button type="button" onClick={() => onToggleReviewVisibility(review)}>
                      {review.isVisible ? 'Ẩn' : 'Hiện'}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </SectionCard>
      ) : null}
    </div>
  );
};

export default AdminView;
