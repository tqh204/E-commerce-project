import SellerView from '../../views/SellerView';

const SellerProductsPage = (props) => (
  <SellerView
    {...props}
    showProductForm={false}
    showProductList
    showAuctionForm={false}
    showAuctionList={false}
  />
);

export default SellerProductsPage;
