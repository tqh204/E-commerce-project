const SellerStudio = ({ categories, listingForm, setListingForm, setListingFile, onSubmit }) => (
  <section className="panel stack gap-md">
    <div className="section-head"><h3>Seller Studio</h3><span>Tao listing va auction tu React</span></div>
    <form className="seller-grid" onSubmit={onSubmit}>
      <select value={listingForm.categoryId} onChange={(event) => setListingForm((current) => ({ ...current, categoryId: event.target.value }))}>
        <option value="">Chon category</option>
        {categories.map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}
      </select>
      <input value={listingForm.title} onChange={(event) => setListingForm((current) => ({ ...current, title: event.target.value }))} placeholder="Tieu de" />
      <textarea value={listingForm.description} onChange={(event) => setListingForm((current) => ({ ...current, description: event.target.value }))} placeholder="Mo ta" />
      <input type="number" value={listingForm.price} onChange={(event) => setListingForm((current) => ({ ...current, price: event.target.value }))} placeholder="Gia" />
      <select value={listingForm.saleType} onChange={(event) => setListingForm((current) => ({ ...current, saleType: event.target.value }))}>
        <option value="fixed_price">fixed_price</option>
        <option value="auction">auction</option>
      </select>
      <input value={listingForm.tags} onChange={(event) => setListingForm((current) => ({ ...current, tags: event.target.value }))} placeholder="Tags, comma separated" />
      <textarea value={listingForm.addressText} onChange={(event) => setListingForm((current) => ({ ...current, addressText: event.target.value }))} placeholder="Dia chi" />
      <div className="tri-grid">
        <input value={listingForm.province} onChange={(event) => setListingForm((current) => ({ ...current, province: event.target.value }))} placeholder="Province" />
        <input value={listingForm.district} onChange={(event) => setListingForm((current) => ({ ...current, district: event.target.value }))} placeholder="District" />
        <input value={listingForm.ward} onChange={(event) => setListingForm((current) => ({ ...current, ward: event.target.value }))} placeholder="Ward" />
      </div>
      <input type="file" onChange={(event) => setListingFile(event.target.files?.[0] || null)} />
      {listingForm.saleType === 'auction' ? (
        <div className="seller-grid accent-box">
          <input type="datetime-local" value={listingForm.auctionStart} onChange={(event) => setListingForm((current) => ({ ...current, auctionStart: event.target.value }))} />
          <input type="datetime-local" value={listingForm.auctionEnd} onChange={(event) => setListingForm((current) => ({ ...current, auctionEnd: event.target.value }))} />
          <input type="number" value={listingForm.startingBid} onChange={(event) => setListingForm((current) => ({ ...current, startingBid: event.target.value }))} placeholder="Starting bid" />
          <input type="number" value={listingForm.bidStep} onChange={(event) => setListingForm((current) => ({ ...current, bidStep: event.target.value }))} placeholder="Bid step" />
        </div>
      ) : null}
      <button type="submit">Tao listing</button>
    </form>
  </section>
);

export default SellerStudio;
