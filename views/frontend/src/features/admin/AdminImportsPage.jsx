import AdminView from '../../views/AdminView';

const AdminImportsPage = (props) => (
  <AdminView
    {...props}
    showImport
    showUsers={false}
    showCategories={false}
    showProducts={false}
    showOperations={false}
  />
);

export default AdminImportsPage;
