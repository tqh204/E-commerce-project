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
          <p className="eyebrow">Quản trị danh mục</p>
          <h2>
            {props.createMode
              ? 'Tạo danh mục trong form riêng biệt.'
              : 'Tạo và quản lý danh mục riêng biệt với form schema đầy đủ.'}
          </h2>
          <p className="muted">
            Danh mục gồm name, slug, parent_id, icon và is_active. Đây là khu riêng cho
            taxonomy, tách khỏi form tạo listing.
          </p>
        </div>
        <div className="tag-row">
          <span className="route-pill">/admin/categories</span>
          <span className="route-pill">/admin/categories/create</span>
          <span className="route-pill">{props.categories?.length || 0} danh mục</span>
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
