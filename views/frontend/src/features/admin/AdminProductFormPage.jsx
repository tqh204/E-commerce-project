import SellerProductFormPage from '../seller/SellerProductFormPage';

const AdminProductFormPage = (props) => (
  <>
    <section className="workspace-hero workspace-hero--admin section-card wide">
      <div>
        <p className="eyebrow">Admin product CRUD</p>
        <h2>Tao hoac chinh sua listing duoi vai tro quan tri.</h2>
        <p className="muted">Admin co the tao listing moi, cap nhat metadata va chuan hoa noi dung truoc khi cho hien tren marketplace.</p>
      </div>
      <div className="tag-row">
        <span className="route-pill">/admin/products/create</span>
        <span className="route-pill">{props.editingProductId ? 'Dang sua san pham' : 'Dang tao san pham'}</span>
      </div>
    </section>
    <SellerProductFormPage {...props} />
  </>
);

export default AdminProductFormPage;
