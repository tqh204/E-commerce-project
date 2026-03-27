import SectionCard from '../components/SectionCard';
import AppLink from '../components/AppLink';
import { ESCROW_ACTIONS, ORDER_STATUS_OPTIONS, PRODUCT_STATUS_OPTIONS, ROLE_OPTIONS } from '@frontend-utils/constants';
import { compactText, formatDateTime, formatPrice, roleNames, toPrettyJson } from '@frontend-utils/format';

const AdminView = ({
  isAdmin,
  users,
  onPatchUser,
  onDeleteUser,
  categories,
  categoryForm,
  setCategoryForm,
  categoryEditId,
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
  if (!isAdmin) {
    return (
      <SectionCard title="Admin" subtitle="Restricted">
        <p className="muted">Phan frontend admin da co day du, nhung hien chi mo cho role admin hoac moderator.</p>
      </SectionCard>
    );
  }

  return (
    <div className="view-grid">
      <section className="admin-overview section-card wide">
        <div className="admin-overview__header">
          <div>
            <p className="eyebrow">Admin workspace</p>
            <h2>Quan tri listing, user va van hanh marketplace.</h2>
          </div>
          <div className="tag-row">
            <span className="route-pill">{users.length} users</span>
            <span className="route-pill">{products.length} products</span>
            <span className="route-pill">{orders.length} orders</span>
            <span className="route-pill">{auctions.length} auctions</span>
          </div>
        </div>
        <div className="admin-overview__stats">
          <div className="admin-stat-card">
            <strong>{products.filter((item) => item.status === 'pending').length}</strong>
            <span>Cho duyet</span>
          </div>
          <div className="admin-stat-card">
            <strong>{escrows.filter((item) => item.status === 'disputed').length}</strong>
            <span>Escrow tranh chap</span>
          </div>
          <div className="admin-stat-card">
            <strong>{reviews.filter((item) => !item.isVisible).length}</strong>
            <span>Review dang an</span>
          </div>
          <div className="admin-stat-card">
            <strong>{importBatches.length}</strong>
            <span>Batch import</span>
          </div>
        </div>
      </section>

      {showImport ? (
      <SectionCard title="Import Chotot" subtitle="Run batch + inspect detail" className="wide">
        <form className="stack gap-sm" onSubmit={onRunImport}>
          <div className="form-grid form-grid--three">
            <input value={importForm.categoryUrl} onChange={(event) => setImportForm((current) => ({ ...current, categoryUrl: event.target.value }))} placeholder="categoryUrl" />
            <input value={importForm.categoryName} onChange={(event) => setImportForm((current) => ({ ...current, categoryName: event.target.value }))} placeholder="categoryName" />
            <input type="number" value={importForm.maxPages} onChange={(event) => setImportForm((current) => ({ ...current, maxPages: event.target.value }))} placeholder="maxPages" />
            <input value={importForm.keyword} onChange={(event) => setImportForm((current) => ({ ...current, keyword: event.target.value }))} placeholder="keyword" />
            <select value={importForm.mode} onChange={(event) => setImportForm((current) => ({ ...current, mode: event.target.value }))}>
              <option value="html">html</option>
              <option value="api">api</option>
            </select>
            <button type="submit">Run import</button>
          </div>
        </form>
        <div className="two-col">
          <div className="resource-list">
            {importBatches.map((batch) => (
              <button key={batch._id} className={selectedBatch?._id === batch._id ? 'resource-item active' : 'resource-item'} onClick={() => onSelectBatch(batch._id)}>
                <div>
                  <strong>{batch.source}</strong>
                  <p>{batch.status} | inserted {batch.totalInserted || 0} | updated {batch.totalUpdated || 0}</p>
                </div>
                <small>{formatDateTime(batch.startedAt)}</small>
              </button>
            ))}
            {!importBatches.length ? <div className="empty-state compact-empty"><strong>Chua co batch import.</strong><p className="muted">Chay import Chotot de tao lich su batch tai day.</p></div> : null}
          </div>
          <div>{selectedBatch ? <pre className="json-box">{toPrettyJson(selectedBatch)}</pre> : <p className="muted">Chon batch de goi GET /api/imports/batches/:id.</p>}</div>
        </div>
      </SectionCard>
      ) : null}

      {showUsers ? (
      <SectionCard title="Users" subtitle="User CRUD" className="wide">
        <div className="resource-list admin-resource-list">
          {users.map((item) => (
            <article key={item._id} className="resource-item admin-item-card">
              <div>
                <strong>{item.fullName}</strong>
                <p>{item.email}</p>
                <small>{roleNames(item.roles)} | {item.isActive ? 'active' : 'inactive'} | {item.isVerified ? 'verified' : 'unverified'}</small>
              </div>
              <div className="resource-item__meta">
                <div className="mini-actions wrap">
                  {ROLE_OPTIONS.map((role) => <button key={role} type="button" onClick={() => onPatchUser(item, { roles: [role] })}>{role}</button>)}
                  <button type="button" onClick={() => onPatchUser(item, { isActive: !item.isActive })}>{item.isActive ? 'Suspend' : 'Activate'}</button>
                  <button type="button" onClick={() => onPatchUser(item, { isVerified: !item.isVerified })}>{item.isVerified ? 'Unverify' : 'Verify'}</button>
                  <button type="button" onClick={() => onDeleteUser(item._id)}>Delete</button>
                </div>
              </div>
            </article>
          ))}
          {!users.length ? <div className="empty-state compact-empty"><strong>Chua co user nao.</strong><p className="muted">Danh sach user se hien tai day khi he thong co tai khoan.</p></div> : null}
        </div>
      </SectionCard>
      ) : null}

      {showCategories ? (
      <SectionCard title={categoryEditId ? 'Sua category' : 'Category CRUD'} subtitle="Create / update / delete" className="wide">
        <div className="workspace-form">
          <form className="stack gap-sm" onSubmit={onSaveCategory}>
            <div className="form-grid form-grid--three">
              <input value={categoryForm.name} onChange={(event) => setCategoryForm((current) => ({ ...current, name: event.target.value }))} placeholder="Name" required />
              <input value={categoryForm.slug} onChange={(event) => setCategoryForm((current) => ({ ...current, slug: event.target.value }))} placeholder="Slug" required />
              <input type="number" value={categoryForm.sortOrder} onChange={(event) => setCategoryForm((current) => ({ ...current, sortOrder: event.target.value }))} placeholder="Sort order" />
            </div>
            <textarea value={categoryForm.description} onChange={(event) => setCategoryForm((current) => ({ ...current, description: event.target.value }))} placeholder="Description" rows={2} />
            <div className="actions-row">
              <button type="submit" className="primary-btn">{categoryEditId ? 'Cap nhat category' : 'Tao category'}</button>
              <button type="button" className="ghost-btn" onClick={onResetCategoryForm}>Reset</button>
            </div>
          </form>
          <aside className="workspace-form__aside">
            <div className="workspace-note">
              <strong>Preview category</strong>
              <p className="muted">{categoryForm.name || 'Ten danh muc se hien o day.'}</p>
              <div className="tag-row">
                <small>{categoryForm.slug || 'slug'}</small>
                <small>sort {categoryForm.sortOrder || 0}</small>
              </div>
            </div>
            <div className="workspace-note">
              <strong>Luu y taxonomy</strong>
              <ul className="sidebar-tips">
                <li>Slug nen ngan, de doc, phu hop URL.</li>
                <li>Sort order giup category hien dung thu tu o trang chu.</li>
                <li>Ten category nen khop voi flow import va bo loc user.</li>
              </ul>
            </div>
          </aside>
        </div>
        <div className="resource-list admin-resource-list">
          {categories.map((category) => (
            <article key={category._id} className="resource-item admin-item-card">
              <div>
                <strong>{category.name}</strong>
                <p>{category.slug}</p>
              </div>
              <div className="resource-item__meta">
                <div className="mini-actions">
                  <button type="button" onClick={() => onEditCategory(category)}>Sua</button>
                  <button type="button" onClick={() => onDeleteCategory(category._id)}>Xoa</button>
                </div>
              </div>
            </article>
          ))}
          {!categories.length ? <div className="empty-state compact-empty"><strong>Chua co category.</strong><p className="muted">Tao category dau tien de dung cho bo loc va import mapping.</p></div> : null}
        </div>
      </SectionCard>
      ) : null}

      {showProducts ? (
      <SectionCard title="Product moderation" subtitle="Product update + delete" className="wide">
        <div className="resource-list admin-resource-list">
          {products.map((item) => (
            <article key={item._id} className="resource-item admin-item-card">
              <div>
                <strong>{item.title}</strong>
                <p>{compactText(item.description, 90)}</p>
                <small>{item.source} | {item.saleType} | {item.status}</small>
              </div>
              <div className="resource-item__meta">
                <div className="mini-actions wrap">
                  {PRODUCT_STATUS_OPTIONS.map((status) => <button key={status} type="button" onClick={() => onModerateProduct(item._id, status)}>{status}</button>)}
                  <button type="button" onClick={() => onDeleteProduct(item._id)}>Delete</button>
                </div>
              </div>
            </article>
          ))}
          {!products.length ? <div className="empty-state compact-empty"><strong>Chua co product.</strong><p className="muted">Product da import hoac tao moi se hien trong khu moderation nay.</p></div> : null}
        </div>
      </SectionCard>
      ) : null}

      {showOperations ? (
      <SectionCard title="Orders / Auctions / Escrows / Reviews" subtitle="Admin operational controls" className="wide">
        <div className="admin-grid">
          <div className="stack gap-sm admin-column-card">
            <h4>Orders</h4>
            {orders.slice(0, 12).map((order) => (
              <article key={order._id} className="resource-item compact">
                <div>
                  <strong>{order.orderCode}</strong>
                  <p>{order.product?.title || 'Order'}</p>
                </div>
                <div className="mini-actions wrap">
                  <AppLink to={`/orders/${order._id}`} className="route-pill">
                    Detail
                  </AppLink>
                  {ORDER_STATUS_OPTIONS.slice(0, 4).map((status) => <button key={status} type="button" onClick={() => onUpdateOrderStatus(order._id, status)}>{status}</button>)}
                  <button type="button" onClick={() => onDeleteOrder(order._id)}>Delete</button>
                </div>
              </article>
            ))}
          </div>
          <div className="stack gap-sm admin-column-card">
            <h4>Auctions</h4>
            {auctions.slice(0, 12).map((auction) => (
              <article key={auction._id} className="resource-item compact">
                <div>
                  <strong>{auction.product?.title || auction._id}</strong>
                  <p>{auction.status} | {formatPrice(auction.currentBid || auction.startingBid)} VND</p>
                </div>
                <div className="mini-actions">
                  <AppLink to={`/auctions/${auction._id}`} className="route-pill">
                    Detail
                  </AppLink>
                  <button type="button" onClick={() => onCloseAuction(auction._id)}>Close</button>
                  <button type="button" onClick={() => onDeleteAuction(auction._id)}>Delete</button>
                </div>
              </article>
            ))}
          </div>
          <div className="stack gap-sm admin-column-card">
            <h4>Escrows</h4>
            {escrows.slice(0, 12).map((escrow) => (
              <article key={escrow._id} className="resource-item compact">
                <div>
                  <strong>{escrow.order?.orderCode || escrow._id}</strong>
                  <p>{escrow.status}</p>
                </div>
                <div className="mini-actions wrap">
                  <AppLink to={`/escrows/${escrow._id}`} className="route-pill">
                    Detail
                  </AppLink>
                  {ESCROW_ACTIONS.map((action) => <button key={action} type="button" onClick={() => onEscrowAction(escrow._id, action)}>{action}</button>)}
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
                  <button type="button" onClick={() => onRespondReview(review._id)}>Respond</button>
                  <button type="button" onClick={() => onToggleReviewVisibility(review)}>{review.isVisible ? 'Hide' : 'Show'}</button>
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
