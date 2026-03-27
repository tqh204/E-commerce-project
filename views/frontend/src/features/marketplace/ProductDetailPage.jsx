import CatalogView from '../../views/CatalogView';

const ProductDetailPage = (props) => (
  <>
    <section className="detail-intro section-card wide">
      <div>
        <p className="eyebrow">Product detail</p>
        <h2>Xem ky thong tin listing truoc khi mua ngay hoac mo chat voi nguoi ban.</h2>
      </div>
      <div className="tag-row">
        <span className="route-pill">{props.selectedProduct?.saleType || 'listing'}</span>
        <span className="route-pill">{props.selectedProduct?.status || 'dang tai'}</span>
        <span className="route-pill">{props.selectedProduct?.source || 'manual'}</span>
      </div>
    </section>
    <CatalogView {...props} showFilters={false} showCatalog={false} />
  </>
);

export default ProductDetailPage;
