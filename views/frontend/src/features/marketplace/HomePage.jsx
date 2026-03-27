import CatalogView from '../../views/CatalogView';

const HomePage = (props) => (
  <>
    <section className="landing-strip section-card wide">
      <div className="landing-strip__copy">
        <p className="eyebrow">Marketplace home</p>
        <h2>Tim listing gan ban, deal nhanh, va theo doi auction dang hot.</h2>
        <p className="muted">
          Trang chu duoc to chuc theo luong mua ban thong thuong: xem tin moi, loc theo nhu cau, vao chi tiet va chat nguoi ban de chot giao dich.
        </p>
      </div>
      <div className="landing-strip__actions">
        <div className="landing-badge">
          <strong>{props.products?.length || 0}</strong>
          <span>Listing dang hoat dong</span>
        </div>
        <div className="landing-badge">
          <strong>{props.products?.filter((item) => item.saleType === 'auction').length || 0}</strong>
          <span>Auction dang mo</span>
        </div>
      </div>
    </section>
    <section className="category-spotlight section-card wide">
      <div className="category-spotlight__head">
        <div>
          <p className="eyebrow">Danh muc noi bat</p>
          <h3>Bat dau tu nhung nhom duoc xem nhieu nhat.</h3>
        </div>
      </div>
      <div className="category-spotlight__grid">
        {(props.categories || []).slice(0, 6).map((category) => (
          <button
            key={category._id}
            type="button"
            className="category-spotlight__card"
            onClick={() => props.onApplyFilters({ ...props.filters, categoryId: category._id })}
          >
            <strong>{category.name}</strong>
            <span className="muted">{category.slug}</span>
          </button>
        ))}
      </div>
    </section>
    <CatalogView {...props} showFilters showCatalog />
  </>
);

export default HomePage;
