import { useEffect } from 'react';
import AdminView from '../../views/AdminView';

const AdminCategoriesPage = (props) => {
  useEffect(() => {
    if (props.createMode && props.categoryEditId) {
      props.onResetCategoryForm?.();
    }
  }, [props.categoryEditId, props.createMode, props.onResetCategoryForm]);

  return (
    <>
      <section className="workspace-hero workspace-hero--admin section-card wide">
        <div>
          <p className="eyebrow">Admin category CRUD</p>
          <h2>
            {props.createMode
              ? 'Tao category trong form rieng biet.'
              : 'Tao va quan ly category rieng biet voi form schema day du.'}
          </h2>
          <p className="muted">
            Category gom name, slug, parent_id, icon va is_active. Day la khu rieng cho
            taxonomy, tach khoi form tao listing.
          </p>
        </div>
        <div className="tag-row">
          <span className="route-pill">/admin/categories</span>
          <span className="route-pill">/admin/categories/create</span>
          <span className="route-pill">{props.categories?.length || 0} categories</span>
        </div>
      </section>
      <AdminView
        {...props}
        categoryCreateMode={props.createMode}
        showImport={false}
        showUsers={false}
        showCategories
        showProducts={false}
        showOperations={false}
      />
    </>
  );
};

export default AdminCategoriesPage;
