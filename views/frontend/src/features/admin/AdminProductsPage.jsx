import AdminView from '../../views/AdminView';

const AdminProductsPage = (props) => (
  <AdminView
    {...props}
    showImport={false}
    showUsers={false}
    showCategories={false}
    showProducts
    showOperations={false}
  />
);

export default AdminProductsPage;
