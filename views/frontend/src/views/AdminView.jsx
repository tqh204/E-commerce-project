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
  users,
  onPatchUser,
  onDeleteUser,
  categories,
  categoryForm,
  setCategoryForm,
  categoryEditId,
  categoryCreateMode = false,
  onSaveCategory,
  onEditCategory,
  onResetCategoryForm,
  onDeleteCategory,
  products,
  onModerateProduct,
  onDeleteProduct,
  orders,
  onViewOrder,
  onUpdateOrderStatus,
  onDeleteOrder,
  auctions,
  onViewAuction,
  onOpenAuction,
  onCloseAuction,
  onDeleteAuction,
  escrows,
  onViewEscrow,
  onEscrowAction,
  reviews,
  onToggleReviewVisibility,
  onRespondReview,
  importForm,
  setImportForm,
  onRunImport,
  importBatches,
  selectedBatch,
  onSelectBatch,
  showImport = true,
  showUsers = true,
  showCategories = true,
  showProducts = true,
  showOperations = true,
}) => {
  const [categoryQuery, setCategoryQuery] = useState('');
  const [categoryStatusFilter, setCategoryStatusFilter] = useState('all');
  const [productQuery, setProductQuery] = useState('');
  const [productStatusFilter, setProductStatusFilter] = useState('all');

  const filteredCategories = useMemo(() => {
    const query = categoryQuery.trim().toLowerCase();
    return categories.filter((category) => {
      const matchesStatus =
        categoryStatusFilter === 'all'
          ? true
          : categoryStatusFilter === 'active'
            ? category.isActive !== false
            : category.isActive === false;
      const haystack = [category.name, category.slug, category.description]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      const matchesQuery = !query || haystack.includes(query);
      return matchesStatus && matchesQuery;
    });
  }, [categories, categoryQuery, categoryStatusFilter]);

  const filteredProducts = useMemo(() => {
    const query = productQuery.trim().toLowerCase();
    return products.filter((item) => {
      const matchesStatus =
        productStatusFilter === 'all' ? true : item.status === productStatusFilter;
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
      const matchesQuery = !query || haystack.includes(query);
      return matchesStatus && matchesQuery;
    });
  }, [productQuery, productStatusFilter, products]);

  if (!isAdmin) {
    return (
      <SectionCard title="Quản trị" subtitle="Giới hạn quyền">
        <p className="muted">Khu quản trị chỉ mở cho tài khoản quản trị viên.</p>
      </SectionCard>
    );
  }

  return (
    <div className="view-grid">
      <section className="admin-overview section-card wide">
        <div className="admin-overview__header">
          <div>
            <p className="eyebrow">Khu quản trị</p>
            <h2>Quản trị danh mục, tin đăng và vận hành toàn bộ marketplace.</h2>
          </div>
          <div className="tag-row">
            <span className="route-pill">{users.length} người dùng</span>
            <span className="route-pill">{products.length} sản phẩm</span>
            <span className="route-pill">{categories.length} danh mục</span>
            <span className="route-pill">{orders.length} đơn hàng</span>
          </div>
        </div>
        <div className="admin-overview__stats">
          <div className="admin-stat-card">
            <strong>{products.filter((item) => item.status === 'pending').length}</strong>
            <span>Cho duyet</span>
          </div>
          <div className="admin-stat-card">
            <strong>{products.filter((item) => item.status === 'active').length}</strong>
            <span>Dang hien thi</span>
          </div>
          <div className="admin-stat-card">
            <strong>{categories.filter((item) => item.isActive !== false).length}</strong>
            <span>Danh mục đang bật</span>
          </div>
          <div className="admin-stat-card">
            <strong>{escrows.filter((item) => item.status === 'disputed').length}</strong>
            <span>Ký quỹ tranh chấp</span>
          </div>
        </div>
      </section>

      {showImport ? (
        <SectionCard title="Nhập dữ liệu Chợ Tốt" subtitle="Chạy batch và xem chi tiết" className="wide">
          <form className="stack gap-sm" onSubmit={onRunImport}>
            <div className="form-grid form-grid--three">
              <input
                value={importForm.categoryUrl}
                onChange={(event) =>
                  setImportForm((current) => ({ ...current, categoryUrl: event.target.value }))
                }
                placeholder="categoryUrl"
              />
              <input
                value={importForm.categoryName}
                onChange={(event) =>
                  setImportForm((current) => ({ ...current, categoryName: event.target.value }))
                }
                placeholder="categoryName"
              />
              <input
                type="number"
                value={importForm.maxPages}
                onChange={(event) =>
                  setImportForm((current) => ({ ...current, maxPages: event.target.value }))
                }
                placeholder="maxPages"
              />
              <input
                value={importForm.keyword}
                onChange={(event) =>
                  setImportForm((current) => ({ ...current, keyword: event.target.value }))
                }
                placeholder="keyword"
              />
              <select
                value={importForm.mode}
                onChange={(event) =>
                  setImportForm((current) => ({ ...current, mode: event.target.value }))
                }
              >
                <option value="html">html</option>
                <option value="api">api</option>
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
                      {batch.status} | inserted {batch.totalInserted || 0} | updated{' '}
                      {batch.totalUpdated || 0}
                    </p>
                  </div>
                  <small>{formatDateTime(batch.startedAt)}</small>
                </button>
              ))}
              {!importBatches.length ? (
                <div className="empty-state compact-empty">
                  <strong>Chua co batch import.</strong>
                  <p className="muted">Chay import de tao lich su batch tai day.</p>
                </div>
              ) : null}
            </div>
            <div>
              {selectedBatch ? (
                <pre className="json-box">{toPrettyJson(selectedBatch)}</pre>
              ) : (
                <p className="muted">Chon batch de xem chi tiet.</p>
              )}
            </div>
          </div>
        </SectionCard>
      ) : null}

      {showUsers ? (
        <SectionCard title="Người dùng" subtitle="CRUD người dùng" className="wide">
          <div className="resource-list admin-resource-list">
            {users.map((item) => (
              <article key={item._id} className="resource-item admin-item-card">
                <div>
                  <strong>{item.fullName}</strong>
                  <p>{item.email}</p>
                  <small>
                    {roleNames(item.roles)} | {item.isActive ? 'active' : 'inactive'} |{' '}
                    {item.isVerified ? 'verified' : 'unverified'}
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
                    <button
                      type="button"
                      onClick={() => onPatchUser(item, { isVerified: !item.isVerified })}
                    >
                      {item.isVerified ? 'Bỏ xác minh' : 'Xác minh'}
                    </button>
                    <button type="button" onClick={() => onDeleteUser(item._id)}>
                      Xóa
                    </button>
                  </div>
                </div>
              </article>
            ))}
            {!users.length ? (
              <div className="empty-state compact-empty">
                <strong>Chua co nguoi dung nao.</strong>
                <p className="muted">Danh sach tai khoan se hien tai day khi he thong co du lieu.</p>
              </div>
            ) : null}
          </div>
        </SectionCard>
      ) : null}

      {showCategories ? (
        <SectionCard
          title={categoryEditId ? 'Sua danh muc' : categoryCreateMode ? 'Tao danh muc' : 'Quan ly danh muc'}
          subtitle="Schema: id, name, slug, parent_id, icon, is_active"
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
                  placeholder="Ten danh muc"
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
                  placeholder="Thu tu hien thi"
                />
                <select
                  value={categoryForm.parentCategory || ''}
                  onChange={(event) =>
                    setCategoryForm((current) => ({
                      ...current,
                      parentCategory: event.target.value,
                    }))
                  }
                >
                  <option value="">Khong co danh muc cha</option>
                  {categories
                    .filter((item) => !categoryEditId || item._id !== categoryEditId)
                    .map((category) => (
                      <option key={`parent-${category._id}`} value={category._id}>
                        {category.name}
                      </option>
                    ))}
                </select>
              </div>
              <input
                value={categoryForm.icon || ''}
                onChange={(event) =>
                  setCategoryForm((current) => ({ ...current, icon: event.target.value }))
                }
                placeholder="Icon class / emoji / icon url"
              />
              <textarea
                value={categoryForm.description}
                onChange={(event) =>
                  setCategoryForm((current) => ({ ...current, description: event.target.value }))
                }
                placeholder="Mo ta ngan cho danh muc"
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
                <span>Hien danh muc cho bo loc va cac form listing</span>
              </label>
              <div className="actions-row">
                <button type="submit" className="primary-btn">
                  {categoryEditId ? 'Cap nhat danh muc' : 'Tao danh muc'}
                </button>
                <button type="button" className="ghost-btn" onClick={onResetCategoryForm}>
                  Lam moi form
                </button>
              </div>
            </form>
            <aside className="workspace-form__aside">
              <div className="workspace-note">
                <strong>Xem truoc danh muc</strong>
                <p className="muted">{categoryForm.name || 'Ten danh muc se hien o day.'}</p>
                <div className="tag-row">
                  <small>{categoryForm.slug || 'slug-tu-dong'}</small>
                  <small>sort {categoryForm.sortOrder || 0}</small>
                  <small>{categoryForm.isActive !== false ? 'active' : 'inactive'}</small>
                </div>
                <small>parent_id: {categoryForm.parentCategory || 'null'}</small>
                <small>icon: {categoryForm.icon || 'chua co'}</small>
              </div>
              <div className="workspace-note">
                <strong>Luu y taxonomy</strong>
                <ul className="sidebar-tips">
                  <li>Ten danh muc nen ngan, de hieu va khop voi cach nguoi dung tim.</li>
                  <li>Slug dung cho URL nen viet khong dau, ngan gon va on dinh.</li>
                  <li>Khong nen xoa danh muc dang con san pham gan vao.</li>
                </ul>
              </div>
            </aside>
          </div>

          <div className="form-grid form-grid--three">
            <input
              value={categoryQuery}
              onChange={(event) => setCategoryQuery(event.target.value)}
              placeholder="Tim theo ten, slug, mo ta..."
            />
            <select
              value={categoryStatusFilter}
              onChange={(event) => setCategoryStatusFilter(event.target.value)}
            >
              <option value="all">Tat ca danh muc</option>
              <option value="active">Dang active</option>
              <option value="inactive">Dang an</option>
            </select>
            <div className="workspace-note compact-note">
              <strong>{filteredCategories.length}</strong>
              <span className="muted">danh muc phu hop bo loc</span>
            </div>
          </div>

          <div className="resource-list admin-resource-list">
            {filteredCategories.map((category) => (
              <article key={category._id} className="resource-item admin-item-card">
                <div>
                  <div className="tag-row">
                    <strong>{category.name}</strong>
                    <small>{category.isActive !== false ? 'active' : 'inactive'}</small>
                    <small>{category.productCount || 0} products</small>
                  </div>
                  <p>{category.description || 'Chua co mo ta danh muc.'}</p>
                  <small>
                    /{category.slug} | sort {category.sortOrder || 0}
                  </small>
                  <small>
                    parent: {category.parentCategory?.name || category.parentCategory || 'root'} | icon:{' '}
                    {category.icon || 'n/a'}
                  </small>
                </div>
                <div className="resource-item__meta">
                  <div className="mini-actions wrap">
                    <button type="button" onClick={() => onEditCategory(category)}>
                      Sua
                    </button>
                    <button type="button" onClick={() => onDeleteCategory(category._id)}>
                      Xoa
                    </button>
                  </div>
                </div>
              </article>
            ))}
            {!filteredCategories.length ? (
              <div className="empty-state compact-empty">
                <strong>Chua co danh muc phu hop.</strong>
                <p className="muted">Thu doi bo loc hoac tao danh muc moi de su dung cho listing.</p>
              </div>
            ) : null}
          </div>
        </SectionCard>
      ) : null}

      {showProducts ? (
        <SectionCard
          title="Duyệt và quản lý sản phẩm"
          subtitle="Kiểm tra tin đăng, cập nhật trạng thái và chỉnh sửa nhanh từ khu quản trị"
          className="wide"
        >
          <div className="actions-row wrap admin-toolbar">
            <AppLink to="/admin/products/create" className="route-pill route-pill--highlight">
              Tạo tin đăng mới
            </AppLink>
            <span className="route-pill">Chờ duyệt: {products.filter((item) => item.status === 'pending').length}</span>
            <span className="route-pill">Đang hiển thị: {products.filter((item) => item.status === 'active').length}</span>
            <span className="route-pill">Đã ẩn: {products.filter((item) => item.status === 'hidden').length}</span>
          </div>

          <div className="form-grid form-grid--three">
            <input
              value={productQuery}
              onChange={(event) => setProductQuery(event.target.value)}
              placeholder="Tìm theo tên, người bán, danh mục hoặc từ khóa..."
            />
            <select
              value={productStatusFilter}
              onChange={(event) => setProductStatusFilter(event.target.value)}
            >
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

          <div className="resource-list admin-resource-list">
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
                    <small>Khu vực: {joinLocation(item.city || item.province, item.region)}</small>
                    <small>
                      Giao dịch: {item.isNegotiable ? 'Có thương lượng' : 'Không thương lượng'} ·{' '}
                      {FULFILLMENT_LABELS[item.fulfillmentType] || item.fulfillmentType || 'Cả hai'}
                    </small>
                  </div>

                  {(item.tags || []).length ? (
                    <div className="tag-row listing-card__tags admin-product-card__tags">
                      {(item.tags || []).slice(0, 5).map((tag) => (
                        <small key={`${item._id}-${tag}`}>{tag}</small>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="resource-item__meta admin-product-card__actions">
                  <AppLink to={`/admin/products/${item._id}/edit`} className="route-pill route-pill--button">
                    Sửa
                  </AppLink>
                  <div className="mini-actions wrap admin-status-actions">
                    {['pending', 'active', 'hidden', 'rejected', 'archived'].map((status) => (
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
            {!filteredProducts.length ? (
              <div className="empty-state compact-empty">
                <strong>Chưa có tin đăng phù hợp.</strong>
                <p className="muted">Thử đổi bộ lọc hoặc tạo tin đăng mới từ khu quản trị.</p>
              </div>
            ) : null}
          </div>
        </SectionCard>
      ) : null}

      {showOperations ? (
        <SectionCard
          title="Đơn hàng / Đấu giá / Ký quỹ / Đánh giá"
          subtitle="Khu vận hành của quản trị"
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
                  </div>
                  <div className="mini-actions">
                    <AppLink to={`/auctions/${auction._id}`} className="route-pill">
                      Chi tiết
                    </AppLink>
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
              <h4>Reviews</h4>
              {reviews.slice(0, 12).map((review) => (
                <article key={review._id} className="resource-item compact">
                  <div>
                    <strong>{review.product?.title || review._id}</strong>
                    <p>{review.score}/5 | {review.isVisible ? 'visible' : 'hidden'}</p>
                  </div>
                  <div className="mini-actions">
                    <button type="button" onClick={() => onRespondReview(review._id)}>
                      Respond
                    </button>
                    <button type="button" onClick={() => onToggleReviewVisibility(review)}>
                      {review.isVisible ? 'Hide' : 'Show'}
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
