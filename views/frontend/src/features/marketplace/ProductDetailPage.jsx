import CatalogView from '../../views/CatalogView';

const SALE_TYPE_LABELS = {
  fixed_price: 'Mua ngay',
  auction: 'Đấu giá',
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

const ProductDetailPage = (props) => (
  <>
    <section className="detail-intro section-card wide">
      <div>
        <p className="eyebrow">Chi tiết sản phẩm</p>
        <h2>Xem nhanh thông tin, mua ngay, đặt giá hoặc nhắn tin với người bán.</h2>
      </div>
      <div className="tag-row">
        <span className="route-pill">
          {SALE_TYPE_LABELS[props.selectedProduct?.saleType] || 'Tin đăng'}
        </span>
        <span className="route-pill">
          {STATUS_LABELS[props.selectedProduct?.status] || 'Đang tải'}
        </span>
      </div>
    </section>
    <CatalogView {...props} showFilters={false} showCatalog={false} />
  </>
);

export default ProductDetailPage;
