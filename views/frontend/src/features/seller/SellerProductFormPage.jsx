import SellerView from '../../views/SellerView';

const SellerProductFormPage = (props) => (
  <>
    <section className="workspace-hero section-card wide">
      <div>
        <p className="eyebrow">Seller workspace</p>
        <h2>Tao listing moi voi hinh anh, gia ban, khu vuc va cach giao dich ro rang.</h2>
        <p className="muted">Trang nay danh cho nguoi ban. Sau khi tao listing, ban co the chuyen sang auction hoac cho user chat truc tiep.</p>
      </div>
      <div className="tag-row">
        <span className="route-pill">/sell/products/create</span>
        <span className="route-pill">{props.editingProductId ? 'Edit mode' : 'Create mode'}</span>
      </div>
    </section>
    <SellerView
      {...props}
      showProductForm
      showProductList={false}
      showAuctionForm={false}
      showAuctionList={false}
    />
  </>
);

export default SellerProductFormPage;
