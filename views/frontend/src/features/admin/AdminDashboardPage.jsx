import SectionCard from '../../shared/SectionCard';
import AppLink from '../../shared/AppLink';

const AdminDashboardPage = ({
  isAdmin,
  users = [],
  categories = [],
  products = [],
  auctions = [],
  orders = [],
  escrows = [],
  importBatches = [],
}) => {
  if (!isAdmin) {
    return (
      <SectionCard title="Khu quản trị" subtitle="Giới hạn quyền truy cập">
        <p className="muted">Chỉ tài khoản quản trị viên mới có thể truy cập khu vực này.</p>
      </SectionCard>
    );
  }

  const activeProducts = products.filter((item) => item.status === 'active').length;
  const liveAuctions = auctions.filter((item) => item.status === 'live').length;
  const disputedEscrows = escrows.filter((item) => item.status === 'disputed').length;

  return (
    <div className="view-grid">
      <section className="admin-overview section-card wide">
        <div className="admin-overview__header">
          <div>
            <p className="eyebrow">Bảng điều khiển quản trị</p>
            <h2>Quản lý người dùng, danh mục, sản phẩm, đơn hàng, đấu giá, ví tiền và dữ liệu nhập.</h2>
            <p className="muted">
              Chọn đúng khu vực cần làm việc để theo dõi và thao tác dễ hơn, thay vì dồn tất cả vào một màn hình.
            </p>
          </div>
          <div className="tag-row">
            <span className="route-pill">{users.length} người dùng</span>
            <span className="route-pill">{products.length} sản phẩm</span>
            <span className="route-pill">{orders.length} đơn hàng</span>
            <span className="route-pill">{auctions.length} phiên đấu giá</span>
          </div>
        </div>

        <div className="admin-overview__stats">
          <div className="admin-stat-card">
            <strong>{activeProducts}</strong>
            <span>Sản phẩm đang hiển thị</span>
          </div>
          <div className="admin-stat-card">
            <strong>{liveAuctions}</strong>
            <span>Đấu giá đang diễn ra</span>
          </div>
          <div className="admin-stat-card">
            <strong>{disputedEscrows}</strong>
            <span>Ký quỹ tranh chấp</span>
          </div>
          <div className="admin-stat-card">
            <strong>{importBatches.length}</strong>
            <span>Batch import</span>
          </div>
        </div>
      </section>

      <SectionCard title="Lối tắt quản trị" subtitle="Đi thẳng vào đúng mục cần xử lý" className="wide">
        <div className="resource-list admin-resource-list">
          <article className="resource-item admin-item-card">
            <div>
              <strong>Người dùng</strong>
              <p>Quản lý vai trò, khóa tài khoản, xác minh và thông tin thành viên.</p>
            </div>
            <div className="resource-item__meta">
              <AppLink to="/admin/users" className="route-pill route-pill--button">
                Mở quản lý người dùng
              </AppLink>
            </div>
          </article>

          <article className="resource-item admin-item-card">
            <div>
              <strong>Danh mục</strong>
              <p>Tạo danh mục mới, chỉnh sửa taxonomy và sắp xếp nhóm sản phẩm.</p>
            </div>
            <div className="resource-item__meta mini-actions wrap">
              <AppLink to="/admin/categories" className="route-pill route-pill--button">
                Xem danh mục
              </AppLink>
            </div>
          </article>

          <article className="resource-item admin-item-card">
            <div>
              <strong>Sản phẩm</strong>
              <p>Quản lý tin đăng, cập nhật trạng thái hiển thị và chỉnh sửa nội dung sản phẩm.</p>
            </div>
            <div className="resource-item__meta mini-actions wrap">
              <AppLink to="/admin/products" className="route-pill route-pill--button">
                Quản lý sản phẩm
              </AppLink>
              <AppLink to="/admin/products/create" className="route-pill">
                Tạo sản phẩm
              </AppLink>
            </div>
          </article>

          <article className="resource-item admin-item-card">
            <div>
              <strong>Đơn hàng và vận hành</strong>
              <p>Theo dõi đơn hàng, ký quỹ, đánh giá và các phiên đấu giá đang hoạt động.</p>
            </div>
            <div className="resource-item__meta">
              <AppLink to="/admin/orders" className="route-pill route-pill--button">
                Mở trang vận hành
              </AppLink>
            </div>
          </article>

          <article className="resource-item admin-item-card">
            <div>
              <strong>Ví tiền</strong>
              <p>Theo dõi số dư người dùng, lịch sử nạp tiền và các giao dịch khóa hoặc giải ngân.</p>
            </div>
            <div className="resource-item__meta">
              <AppLink to="/admin/wallets" className="route-pill route-pill--button">
                Mở khu ví tiền
              </AppLink>
            </div>
          </article>

          <article className="resource-item admin-item-card">
            <div>
              <strong>Import dữ liệu</strong>
              <p>Chạy import Chợ Tốt, xem lịch sử batch và rà kết quả nhập dữ liệu.</p>
            </div>
            <div className="resource-item__meta">
              <AppLink to="/admin/imports" className="route-pill route-pill--button">
                Mở khu import
              </AppLink>
            </div>
          </article>
        </div>
      </SectionCard>
    </div>
  );
};

export default AdminDashboardPage;
