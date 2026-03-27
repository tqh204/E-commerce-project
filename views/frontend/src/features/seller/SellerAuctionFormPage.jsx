import SellerView from '../../views/SellerView';

const SellerAuctionFormPage = (props) => (
  <SellerView
    {...props}
    showProductForm={false}
    showProductList={false}
    showAuctionForm
    showAuctionList={false}
  />
);

export default SellerAuctionFormPage;
