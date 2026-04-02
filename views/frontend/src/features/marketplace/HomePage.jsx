import CatalogView from '../../views/CatalogView';
import { formatPrice, joinLocation } from '@frontend-utils/format';

const CATEGORY_GRADIENTS = [
  'linear-gradient(135deg, rgba(15,118,110,0.18), rgba(255,247,237,0.92))',
  'linear-gradient(135deg, rgba(249,115,22,0.16), rgba(239,246,255,0.92))',
  'linear-gradient(135deg, rgba(250,204,21,0.18), rgba(240,253,250,0.92))',
  'linear-gradient(135deg, rgba(59,130,246,0.16), rgba(255,247,237,0.92))',
  'linear-gradient(135deg, rgba(236,72,153,0.14), rgba(240,253,250,0.92))',
  'linear-gradient(135deg, rgba(34,197,94,0.16), rgba(255,248,229,0.92))',
];

const categoryArtwork = (category, index) => ({
  background: category?.image
    ? `linear-gradient(rgba(18,32,34,0.16), rgba(18,32,34,0.1)), url(${category.image}) center/cover`
    : CATEGORY_GRADIENTS[index % CATEGORY_GRADIENTS.length],
});

const HomeListingSection = ({ title, subtitle, products = [], onSelectProduct }) => (
  <section className="home-strip section-card wide">
    <div className="home-strip__head">
      <div>
        <p className="eyebrow">{subtitle}</p>
        <h3>{title}</h3>
      </div>
    </div>
    <div className="resource-list cards-list">
      {products.slice(0, 4).map((product) => (
        <button
          key={`${title}-${product._id}`}
          type="button"
          className="resource-card listing-card listing-card--compact"
          onClick={() => onSelectProduct(product._id)}
        >
          <div className="resource-card__image listing-card__image">
            {product.thumbnailImage ? <img src={product.thumbnailImage} alt={product.title} /> : <span>No image</span>}
          </div>
          <div className="listing-card__body">
            <strong className="listing-card__title">{product.title}</strong>
            <span className="price">
              {formatPrice(
                product.saleType === 'auction'
                  ? (product.currentBid || product.startingBid || product.price || 0)
                  : (product.price || 0)
              )} VND
            </span>
            <span className="muted">{joinLocation(product.ward, product.district, product.province)}</span>
          </div>
        </button>
      ))}
    </div>
  </section>
);

const HomePage = (props) => {
  const products = props.products || [];
  const newestProducts = [...products].slice(0, 4);
  const nearbyProducts = products.filter((item) => item.province || item.district).slice(0, 4);
  const featuredAuctions = products.filter((item) => item.saleType === 'auction').slice(0, 4);
  const suggestedProducts = (() => {
    const preferredCategoryId =
      props.filters?.categoryId ||
      (products.find((item) => item.category?._id || item.category)?.category?._id ||
        products.find((item) => item.category?._id || item.category)?.category ||
        '') ||
      '';

    const matchingCategoryProducts = preferredCategoryId
      ? products.filter(
          (item) =>
            String(item.category?._id || item.category || '') === String(preferredCategoryId)
        )
      : products;

    return matchingCategoryProducts.slice(0, 4);
  })();

  return (
    <>
      <section className="category-spotlight section-card wide">
        <div className="category-spotlight__head">
          <div>
            <p className="eyebrow">Danh mục</p>
            <h3>Chọn nhóm sản phẩm để tìm nhanh hơn.</h3>
          </div>
        </div>
        <div className="category-spotlight__grid">
          {(props.categories || []).slice(0, 6).map((category, index) => (
            <button
              key={category._id}
              type="button"
              className="category-spotlight__card"
              onClick={() => props.onApplyFilters({ ...props.filters, categoryId: category._id })}
            >
              <span
                className="category-spotlight__visual"
                style={categoryArtwork(category, index)}
                aria-hidden="true"
              >
                <span className="category-spotlight__badge">
                  {(category.name || '?').slice(0, 1).toUpperCase()}
                </span>
              </span>
              <strong>{category.name}</strong>
              <span className="muted">{category.slug}</span>
            </button>
          ))}
        </div>
      </section>

      <HomeListingSection
        title="Tin mới"
        subtitle="Mới đăng"
        products={newestProducts}
        onSelectProduct={props.onSelectProduct}
      />

      <HomeListingSection
        title="Gần bạn"
        subtitle="Khu vực"
        products={nearbyProducts.length ? nearbyProducts : newestProducts}
        onSelectProduct={props.onSelectProduct}
      />

      <HomeListingSection
        title="Đấu giá nổi bật"
        subtitle="Auction"
        products={featuredAuctions.length ? featuredAuctions : newestProducts}
        onSelectProduct={props.onSelectProduct}
      />

      <HomeListingSection
        title="Gợi ý cho bạn"
        subtitle="Đề xuất"
        products={suggestedProducts.length ? suggestedProducts : newestProducts}
        onSelectProduct={props.onSelectProduct}
      />

      <CatalogView {...props} showFilters showCatalog showHero={false} showShowcase={false} />
    </>
  );
};

export default HomePage;
