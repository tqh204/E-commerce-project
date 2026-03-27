import AdminView from '../../views/AdminView';

const AdminUsersPage = (props) => (
  <AdminView
    {...props}
    showImport={false}
    showUsers
    showCategories={false}
    showProducts={false}
    showOperations={false}
  />
);

export default AdminUsersPage;
