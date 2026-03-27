import AdminView from '../../views/AdminView';

const AdminOrdersPage = (props) => (
  <AdminView
    {...props}
    showImport={false}
    showUsers={false}
    showCategories={false}
    showProducts={false}
    showOperations
  />
);

export default AdminOrdersPage;
