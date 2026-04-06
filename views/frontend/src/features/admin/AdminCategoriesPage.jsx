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
              ? 'Tạo danh mục trong form riêng gọn gàng hơn.'
              : 'Tạo và quản lý danh mục với form gọn, rõ và có ảnh hiển thị trực tiếp.'}
          </h2>
          <p className="muted">
            Danh mục gồm tên, slug, mô tả, thứ tự hiển thị và ảnh tải từ máy. Ảnh danh mục sau khi lưu
            sẽ được cập nhật luôn ở phần danh mục ngoài trang chủ.
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
