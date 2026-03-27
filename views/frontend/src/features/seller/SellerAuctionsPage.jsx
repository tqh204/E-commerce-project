import SellerView from '../../views/SellerView';

const SellerAuctionsPage = (props) => (
  <SellerView
    {...props}
    showProductForm={false}
    showProductList={false}
    showAuctionForm={false}
    showAuctionList
  />
);

export default SellerAuctionsPage;
