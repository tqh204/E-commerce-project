import { PRODUCT_STATUS_OPTIONS } from '../utils/constants';
import { formatDateTime } from '../utils/format';

const AdminView = ({ isAdmin, adminImport, setAdminImport, onImport, onCreateCategory, users, products, batches, onModerateProduct }) => (
  <section className="dashboard-grid">
    <article className="panel">
      <div className="section-head"><h3>Import Chotot</h3><button onClick={onCreateCategory}>Tao category</button></div>
      <form className="stack gap-sm" onSubmit={onImport}>
        <input value={adminImport.categoryUrl} onChange={(event) => setAdminImport((current) => ({ ...current, categoryUrl: event.target.value }))} placeholder="Category URL" />
        <input value={adminImport.categoryName} onChange={(event) => setAdminImport((current) => ({ ...current, categoryName: event.target.value }))} placeholder="Category Name" />
        <input type="number" value={adminImport.maxPages} onChange={(event) => setAdminImport((current) => ({ ...current, maxPages: event.target.value }))} placeholder="Max pages" />
        <button type="submit" disabled={!isAdmin}>Run import</button>
      </form>
    </article>
    <article className="panel"><div className="section-head"><h3>Users</h3><span>{users.length}</span></div>{users.map((item) => <div key={item._id} className="list-item"><strong>{item.fullName}</strong><span>{item.email}</span><span>{(item.roles || []).map((role) => role.name).join(', ')}</span></div>)}</article>
    <article className="panel wide"><div className="section-head"><h3>Product Moderation</h3><span>{products.length}</span></div>{products.slice(0, 12).map((item) => <div key={item._id} className="list-item"><strong>{item.title}</strong><span>{item.status}</span><div className="mini-actions">{PRODUCT_STATUS_OPTIONS.map((status) => <button key={status} onClick={() => onModerateProduct(item._id, status)}>{status}</button>)}</div></div>)}</article>
    <article className="panel wide"><div className="section-head"><h3>Import Batches</h3><span>{batches.length}</span></div>{batches.map((item) => <div key={item._id} className="list-item"><strong>{item.source}</strong><span>{item.status}</span><span>{formatDateTime(item.startedAt)}</span></div>)}</article>
  </section>
);

export default AdminView;
