const SellerStudio = ({ categories, listingForm, setListingForm, setListingFile, onSubmit }) => (
  <section className="panel stack gap-md">
    <div className="section-head">
      <h3>🛒 Khu Người Bán</h3>
      <span className="muted tiny">Quản lý sản phẩm và đấu giá của bạn</span>
    </div>

    {/* Điều hướng nhanh */}
    <div className="seller-studio-nav">
      <div className="studio-nav-card">
        <span className="studio-nav-icon">📦</span>
        <span className="studio-nav-label">Sản phẩm của tôi</span>
        <span className="studio-nav-desc">Xem và quản lý sản phẩm đang bán</span>
        <span className="muted tiny">/sell/products</span>
      </div>
      <div className="studio-nav-card">
        <span className="studio-nav-icon">➕</span>
        <span className="studio-nav-label">Đăng sản phẩm</span>
        <span className="studio-nav-desc">Tạo tin đăng mới</span>
        <span className="muted tiny">/sell/products/create</span>
      </div>
      <div className="studio-nav-card">
        <span className="studio-nav-icon">🔨</span>
        <span className="studio-nav-label">Phiên đấu giá</span>
        <span className="studio-nav-desc">Xem các phiên đấu giá của bạn</span>
        <span className="muted tiny">/sell/auctions</span>
      </div>
      <div className="studio-nav-card">
        <span className="studio-nav-icon">🏷️</span>
        <span className="studio-nav-label">Tạo đấu giá</span>
        <span className="studio-nav-desc">Tạo phiên đấu giá mới</span>
        <span className="muted tiny">/sell/auctions/create</span>
      </div>
    </div>

    <div className="divider" />

    {/* Form tạo listing */}
    <div>
      <h4 style={{ marginBottom: 14, fontWeight: 700 }}>📝 Tạo tin đăng mới</h4>
      <form className="seller-grid" onSubmit={onSubmit}>
        <select
          id="listing-category"
          value={listingForm.categoryId}
          onChange={(e) => setListingForm(f => ({ ...f, categoryId: e.target.value }))}
        >
          <option value="">— Chọn danh mục —</option>
          {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>

        <input
          id="listing-title"
          value={listingForm.title}
          onChange={(e) => setListingForm(f => ({ ...f, title: e.target.value }))}
          placeholder="Tiêu đề sản phẩm"
        />

        <textarea
          id="listing-description"
          value={listingForm.description}
          onChange={(e) => setListingForm(f => ({ ...f, description: e.target.value }))}
          placeholder="Mô tả chi tiết..."
        />

        <div className="filter-grid">
          <input
            id="listing-price"
            type="number"
            value={listingForm.price}
            onChange={(e) => setListingForm(f => ({ ...f, price: e.target.value }))}
            placeholder="Giá (₫)"
            min="0"
          />

          <select
            id="listing-saletype"
            value={listingForm.saleType}
            onChange={(e) => setListingForm(f => ({ ...f, saleType: e.target.value }))}
          >
            <option value="fixed_price">🏷️ Mua ngay</option>
            <option value="auction">🔨 Đấu giá</option>
          </select>
        </div>

        <select
          id="listing-condition"
          value={listingForm.condition}
          onChange={(e) => setListingForm(f => ({ ...f, condition: e.target.value }))}
        >
          <option value="">— Tình trạng —</option>
          <option value="new">✨ Mới</option>
          <option value="like_new">🌟 Như mới</option>
          <option value="good">👍 Tốt</option>
          <option value="fair">👌 Khá</option>
          <option value="poor">🔧 Cũ</option>
        </select>

        <input
          id="listing-tags"
          value={listingForm.tags}
          onChange={(e) => setListingForm(f => ({ ...f, tags: e.target.value }))}
          placeholder="Thẻ (phân cách bằng dấu phẩy)"
        />

        <textarea
          id="listing-address"
          value={listingForm.addressText}
          onChange={(e) => setListingForm(f => ({ ...f, addressText: e.target.value }))}
          placeholder="Địa chỉ đầy đủ"
          style={{ minHeight: 60 }}
        />

        <div className="tri-grid">
          <input
            id="listing-province"
            value={listingForm.province}
            onChange={(e) => setListingForm(f => ({ ...f, province: e.target.value }))}
            placeholder="Tỉnh / Thành phố"
          />
          <input
            id="listing-district"
            value={listingForm.district}
            onChange={(e) => setListingForm(f => ({ ...f, district: e.target.value }))}
            placeholder="Quận / Huyện"
          />
          <input
            id="listing-ward"
            value={listingForm.ward}
            onChange={(e) => setListingForm(f => ({ ...f, ward: e.target.value }))}
            placeholder="Phường / Xã"
          />
        </div>

        <div>
          <label style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>📷 Ảnh sản phẩm</label>
          <input
            id="listing-file"
            type="file"
            onChange={(e) => setListingFile(e.target.files?.[0] || null)}
            accept="image/*"
          />
        </div>

        {listingForm.saleType === 'auction' && (
          <div className="seller-grid accent-box">
            <p style={{ fontWeight: 700, marginBottom: 4 }}>🔨 Cài đặt đấu giá</p>
            <div className="filter-grid">
              <div>
                <label className="muted tiny" style={{ display: 'block', marginBottom: 4 }}>Thời gian bắt đầu</label>
                <input
                  id="listing-auction-start"
                  type="datetime-local"
                  value={listingForm.auctionStart}
                  onChange={(e) => setListingForm(f => ({ ...f, auctionStart: e.target.value }))}
                />
              </div>
              <div>
                <label className="muted tiny" style={{ display: 'block', marginBottom: 4 }}>Thời gian kết thúc</label>
                <input
                  id="listing-auction-end"
                  type="datetime-local"
                  value={listingForm.auctionEnd}
                  onChange={(e) => setListingForm(f => ({ ...f, auctionEnd: e.target.value }))}
                />
              </div>
              <div>
                <label className="muted tiny" style={{ display: 'block', marginBottom: 4 }}>Giá khởi điểm (₫)</label>
                <input
                  id="listing-starting-bid"
                  type="number"
                  value={listingForm.startingBid}
                  onChange={(e) => setListingForm(f => ({ ...f, startingBid: e.target.value }))}
                  placeholder="0"
                  min="0"
                />
              </div>
              <div>
                <label className="muted tiny" style={{ display: 'block', marginBottom: 4 }}>Bước giá (₫)</label>
                <input
                  id="listing-bid-step"
                  type="number"
                  value={listingForm.bidStep}
                  onChange={(e) => setListingForm(f => ({ ...f, bidStep: e.target.value }))}
                  placeholder="500,000"
                  min="0"
                />
              </div>
            </div>
          </div>
        )}

        <button id="listing-submit-btn" type="submit" className="btn-lg">
          🚀 Đăng tin ngay
        </button>
      </form>
    </div>
  </section>
);

export default SellerStudio;
