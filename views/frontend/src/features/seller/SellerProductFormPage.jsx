import SellerView from '../../views/SellerView';

const SellerProductFormPage = (props) => (
  <SellerView
    {...props}
    showProductForm
    showProductList={false}
    showAuctionForm={false}
    showAuctionList={false}
  />
);

export default SellerProductFormPage;
