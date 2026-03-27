import AdminView from '../../views/AdminView';

const AdminCategoriesPage = (props) => (
  <>
    <section className="workspace-hero workspace-hero--admin section-card wide">
      <div>
        <p className="eyebrow">Admin category CRUD</p>
        <h2>Quan ly taxonomy cho toan bo marketplace.</h2>
        <p className="muted">Danh muc tot giup trang chu, bo loc va import Chotot khop voi nhau hon. Day la page rieng cho category CRUD.</p>
      </div>
      <div className="tag-row">
        <span className="route-pill">/admin/categories</span>
        <span className="route-pill">{props.categories?.length || 0} categories</span>
      </div>
    </section>
    <AdminView
      {...props}
      showImport={false}
      showUsers={false}
      showCategories
      showProducts={false}
      showOperations={false}
    />
  </>
);

export default AdminCategoriesPage;
