import { useCallback, useEffect, useMemo, useState } from 'react';
import AuthPanel from './components/AuthPanel';
import CatalogView from './components/CatalogView';
import SellerStudio from './components/SellerStudio';
import DashboardView from './components/DashboardView';
import AdminView from './components/AdminView';
import { api } from './utils/api';
import { clearStoredToken, getStoredToken, setStoredToken } from './utils/auth';
import { APP_NAV } from './utils/constants';
import { useRealtimeChat } from './hooks/useRealtimeChat';

const initialListing = {
  categoryId: '', title: '', description: '', price: 0, saleType: 'fixed_price', condition: 'good', addressText: '', province: '', district: '', ward: '', tags: '', auctionStart: '', auctionEnd: '', startingBid: 0, bidStep: 500000, buyNowPrice: 0,
};

const App = () => {
  const [nav, setNav] = useState('catalog');
  const [token, setToken] = useState(() => getStoredToken());
  const [user, setUser] = useState(null);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedAuction, setSelectedAuction] = useState(null);
  const [orders, setOrders] = useState([]);
  const [auctions, setAuctions] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState('');
  const [messages, setMessages] = useState([]);
  const [escrows, setEscrows] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [users, setUsers] = useState([]);
  const [batches, setBatches] = useState([]);
  const [notice, setNotice] = useState('React frontend dang dung chung backend Express hien tai.');
  const [filters, setFilters] = useState({ q: '', saleType: '', source: '', categoryId: '' });
  const [loginForm, setLoginForm] = useState({ identifier: 'admin@example.com', password: 'password123' });
  const [registerForm, setRegisterForm] = useState({ username: '', email: '', fullName: '', phone: '', password: '' });
  const [listingForm, setListingForm] = useState(initialListing);
  const [listingFile, setListingFile] = useState(null);
  const [chatDraft, setChatDraft] = useState('');
  const [typingNames, setTypingNames] = useState([]);
  const [adminImport, setAdminImport] = useState({ categoryUrl: 'https://xe.chotot.com/', categoryName: 'Vehicles', maxPages: 1, mode: 'html', keyword: '' });

  const isAdmin = useMemo(() => (user?.roles || []).some((role) => role.name === 'admin'), [user]);
  const activeConversation = useMemo(() => conversations.find((item) => item._id === activeConversationId) || null, [conversations, activeConversationId]);

  const mergeConversation = useCallback((conversation) => {
    if (!conversation?._id) return;
    setConversations((current) => {
      const index = current.findIndex((item) => item._id === conversation._id);
      const next = [...current];
      if (index >= 0) next[index] = { ...next[index], ...conversation };
      else next.unshift({ unreadCount: 0, ...conversation });
      next.sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0));
      return next;
    });
  }, []);

  const loadPublic = useCallback(async () => {
    const [categoriesPayload, productsPayload, auctionsPayload] = await Promise.all([
      api.categories(),
      api.products({ status: 'active', ...filters }),
      api.auctions(),
    ]);
    setCategories(categoriesPayload.data || []);
    setProducts(productsPayload.data || []);
    setAuctions(auctionsPayload.data || []);
  }, [filters]);

  const loadPrivate = useCallback(async () => {
    const [ordersPayload, conversationsPayload, escrowsPayload, reviewsPayload, batchesPayload] = await Promise.all([
      api.orders(),
      api.conversations(),
      api.escrows(),
      api.reviews(),
      api.importBatches(),
    ]);
    setOrders(ordersPayload.data || []);
    setConversations(conversationsPayload.data || []);
    setEscrows(escrowsPayload.data || []);
    setReviews(reviewsPayload.data || []);
    setBatches(batchesPayload.data || []);
    if (isAdmin) {
      const usersPayload = await api.users();
      setUsers(usersPayload.data || []);
    }
  }, [isAdmin]);

  const restoreSession = useCallback(async () => {
    await loadPublic();
    if (!token) {
      setUser(null);
      return;
    }
    try {
      const mePayload = await api.me();
      setUser(mePayload.data);
    } catch (error) {
      clearStoredToken();
      setToken('');
      setUser(null);
      setNotice(error.message);
    }
  }, [loadPublic, token]);

  useEffect(() => {
    restoreSession().catch((error) => setNotice(error.message));
  }, [restoreSession]);

  useEffect(() => {
    if (!user) return;
    loadPrivate().catch((error) => setNotice(error.message));
  }, [user, loadPrivate]);

  useEffect(() => {
    if (!selectedProduct?._id) {
      setSelectedAuction(null);
      return;
    }
    setSelectedAuction(auctions.find((item) => String(item.product?._id || item.product) === String(selectedProduct._id)) || null);
  }, [auctions, selectedProduct]);

  const loadMessages = useCallback(async (conversationId) => {
    const payload = await api.conversationMessages(conversationId);
    setMessages((payload.data || []).slice().reverse());
    await api.markConversationRead(conversationId).catch(() => {});
    setConversations((current) => current.map((item) => item._id === conversationId ? { ...item, unreadCount: 0 } : item));
  }, []);

  const handleMessageCreated = useCallback(({ conversationId, conversation, message }) => {
    mergeConversation(conversation);
    if (activeConversationId === conversationId) {
      setMessages((current) => [...current, message]);
      api.markConversationRead(conversationId).catch(() => {});
    }
  }, [activeConversationId, mergeConversation]);

  useRealtimeChat({
    token,
    activeConversationId,
    onConversation: mergeConversation,
    onMessage: handleMessageCreated,
    onMessageUpdated: ({ conversation, message }) => {
      mergeConversation(conversation);
      setMessages((current) => current.map((item) => item._id === message._id ? { ...item, ...message } : item));
    },
    onMessagesRead: ({ conversationId, readerId, messageIds }) => {
      if (String(readerId) === String(user?._id)) {
        setConversations((current) => current.map((item) => item._id === conversationId ? { ...item, unreadCount: 0 } : item));
      }
      setMessages((current) => current.map((item) => messageIds.includes(item._id) ? { ...item, status: 'read' } : item));
    },
    onTyping: ({ conversationId, fullName, username, isTyping }) => {
      if (conversationId !== activeConversationId) return;
      const label = fullName || username || 'Nguoi dung';
      setTypingNames((current) => {
        const set = new Set(current);
        if (isTyping) set.add(label); else set.delete(label);
        return [...set];
      });
    },
  });

  const updateForm = (setter) => (key, value) => setter((current) => ({ ...current, [key]: value }));

  const handleLogin = async (event) => {
    event.preventDefault();
    const payload = await api.login(loginForm);
    setStoredToken(payload.data.accessToken);
    setToken(payload.data.accessToken);
    setUser(payload.data.user);
    setNotice(`Da dang nhap voi ${payload.data.user.fullName}`);
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    const payload = await api.register(registerForm);
    setStoredToken(payload.data.accessToken);
    setToken(payload.data.accessToken);
    setUser(payload.data.user);
    setNotice(`Da tao tai khoan ${payload.data.user.fullName}`);
  };

  const handleLogout = async () => {
    await api.logout().catch(() => {});
    clearStoredToken();
    setToken('');
    setUser(null);
    setOrders([]); setConversations([]); setEscrows([]); setReviews([]); setUsers([]); setMessages([]);
    setNotice('Da dang xuat.');
  };

  const loadProductDetail = async (productId) => {
    const payload = await api.product(productId);
    setSelectedProduct(payload.data);
  };

  const handleCreateListing = async (event) => {
    event.preventDefault();
    const payload = await api.createProduct({
      ...listingForm,
      tags: String(listingForm.tags || '').split(',').map((item) => item.trim()).filter(Boolean),
      price: Number(listingForm.price || 0),
      startingBid: Number(listingForm.startingBid || 0),
      bidStep: Number(listingForm.bidStep || 500000),
      status: 'active',
      fulfillmentType: 'both',
    });
    if (listingFile) {
      const formData = new FormData();
      formData.append('ownerType', 'product');
      formData.append('ownerId', payload.data._id);
      formData.append('isPrimary', 'true');
      formData.append('file', listingFile);
      await api.uploadSingle(formData);
    }
    if (listingForm.saleType === 'auction' && listingForm.auctionStart && listingForm.auctionEnd) {
      await api.createAuction({
        productId: payload.data._id,
        startAt: new Date(listingForm.auctionStart).toISOString(),
        endAt: new Date(listingForm.auctionEnd).toISOString(),
        startingBid: Number(listingForm.startingBid || 0),
        currentBid: Number(listingForm.startingBid || 0),
        bidStep: Number(listingForm.bidStep || 500000),
        status: 'live',
      });
    }
    setListingForm(initialListing);
    setListingFile(null);
    setNotice('Da tao listing React.');
    await loadPublic();
    await loadPrivate();
  };

  const handleCreateOrder = async () => {
    if (!selectedProduct || !user) return;
    await api.createOrder({ productId: selectedProduct._id, quantity: 1, paymentType: 'escrow', shippingMethod: 'delivery', shippingFee: 30000, platformFee: 20000, shippingAddress: { fullName: user.fullName, phone: user.phone || '', province: selectedProduct.province || '', district: selectedProduct.district || '', ward: selectedProduct.ward || '', address: selectedProduct.addressText || '' } });
    await loadPrivate();
    setNotice('Da tao order tu React.');
  };

  const handlePlaceBid = async () => {
    if (!selectedAuction) return;
    const amount = Number(window.prompt('Nhap gia bid', selectedAuction.currentBid || selectedAuction.startingBid || 0));
    if (!amount) return;
    await api.placeBid(selectedAuction._id, amount);
    await loadPublic();
    await loadPrivate();
    setNotice('Da dat bid.');
  };

  const handleStartConversation = async () => {
    if (!selectedProduct || !user) return;
    const payload = await api.createConversation({ productId: selectedProduct._id, otherUserId: selectedProduct.seller?._id || selectedProduct.seller, subject: `Hoi ve ${selectedProduct.title}`, initialMessage: 'Xin chao, san pham nay con khong?' });
    mergeConversation(payload.data);
    setActiveConversationId(payload.data._id);
    await loadMessages(payload.data._id);
    setNav('dashboard');
  };

  const sendChat = async (event) => {
    event.preventDefault();
    if (!chatDraft.trim() || !activeConversationId) return;
    await api.sendMessage(activeConversationId, { content: chatDraft, messageType: 'text' });
    setChatDraft('');
  };

  const handleEditMessage = async (message) => {
    const content = window.prompt('Sua message', message.content || '');
    if (content === null) return;
    await api.editMessage(activeConversationId, message._id, { content });
  };

  const handleEscrowAction = async (escrowId, action) => {
    const reason = window.prompt(`Nhap ly do cho ${action}`, `${action} from React app`) || '';
    await api.updateEscrow(escrowId, action, { reason, notes: 'Updated from React frontend' });
    await loadPrivate();
  };

  const handleAdminImport = async (event) => {
    event.preventDefault();
    await api.imports({ ...adminImport, maxPages: Number(adminImport.maxPages || 1) });
    await loadPublic();
    await loadPrivate();
  };

  const handleCreateCategory = async () => {
    const name = window.prompt('Ten category');
    if (!name) return;
    const slug = window.prompt('Slug', name.toLowerCase().replace(/\s+/g, '-'));
    if (!slug) return;
    await api.categoriesCreate({ name, slug, isActive: true, source: 'manual' });
    await loadPublic();
  };

  const handleModerateProduct = async (productId, status) => {
    await api.updateProduct(productId, { status });
    await loadPublic();
  };

  return (
    <div className="react-shell">
      <aside className="react-sidebar">
        <p className="eyebrow">ChoTot x eBay x Mercari</p>
        <h1>Marketplace React</h1>
        <p className="muted">`views` dung de chua man hinh. `utils` dung de chua API client, auth helper, constants, formatter va mapper.</p>
        <nav className="nav-list">{APP_NAV.map((item) => <button key={item.id} className={nav === item.id ? 'nav-btn active' : 'nav-btn'} onClick={() => setNav(item.id)}>{item.label}</button>)}</nav>
        <div className="notice">{notice}</div>
      </aside>
      <main className="react-main">
        <section className="hero-panel"><div><p className="eyebrow">Frontend strategy</p><h2>React la lua chon hop ly nhat cho repo nay.</h2><p className="muted">Backend Express da on dinh, vi vay React la cach nhanh nhat de nang cap giao dien cho tung nhom chuc nang ma khong dap lai API.</p></div><div className="hero-actions"><a href="/">Marketplace cu</a><a href="/admin.html">Admin cu</a><a href="/docs.html">Docs Explorer</a></div></section>
        <section className="grid-two"><AuthPanel user={user} loginForm={loginForm} registerForm={registerForm} onLoginChange={updateForm(setLoginForm)} onRegisterChange={updateForm(setRegisterForm)} onLogin={handleLogin} onRegister={handleRegister} onLogout={handleLogout} /></section>
        {nav === 'catalog' && <CatalogView products={products} categories={categories} filters={filters} setFilters={setFilters} loadProducts={() => loadPublic().catch((error) => setNotice(error.message))} selectedProduct={selectedProduct} selectedAuction={selectedAuction} onSelectProduct={(id) => loadProductDetail(id).catch((error) => setNotice(error.message))} onCreateOrder={() => handleCreateOrder().catch((error) => setNotice(error.message))} onPlaceBid={() => handlePlaceBid().catch((error) => setNotice(error.message))} onStartConversation={() => handleStartConversation().catch((error) => setNotice(error.message))} user={user} />}
        {nav === 'seller' && <SellerStudio categories={categories} listingForm={listingForm} setListingForm={setListingForm} setListingFile={setListingFile} onSubmit={(event) => handleCreateListing(event).catch((error) => setNotice(error.message))} />}
        {nav === 'dashboard' && <DashboardView orders={orders} auctions={auctions} escrows={escrows} reviews={reviews} conversations={conversations} activeConversationId={activeConversationId} setActiveConversationId={setActiveConversationId} loadMessages={(id) => loadMessages(id).catch((error) => setNotice(error.message))} activeConversation={activeConversation} messages={messages} user={user} chatDraft={chatDraft} setChatDraft={setChatDraft} sendChat={(event) => sendChat(event).catch((error) => setNotice(error.message))} typingNames={typingNames} onEscrowAction={(id, action) => handleEscrowAction(id, action).catch((error) => setNotice(error.message))} onEditMessage={(message) => handleEditMessage(message).catch((error) => setNotice(error.message))} />}
        {nav === 'admin' && <AdminView isAdmin={isAdmin} adminImport={adminImport} setAdminImport={setAdminImport} onImport={(event) => handleAdminImport(event).catch((error) => setNotice(error.message))} onCreateCategory={() => handleCreateCategory().catch((error) => setNotice(error.message))} users={users} products={products} batches={batches} onModerateProduct={(id, status) => handleModerateProduct(id, status).catch((error) => setNotice(error.message))} />}
        {nav === 'docs' && <section className="panel docs-panel"><h3>Docs</h3><p className="muted">App React nay song song voi cac man hinh HTML cu. Ban co the xem docs API va import Postman tu day.</p><div className="hero-actions"><a href="/docs.html">Docs Explorer</a><a href="/api-docs/openapi.json">OpenAPI JSON</a><a href="/api-docs/postman_collection.json">Postman Collection</a></div></section>}
      </main>
    </div>
  );
};

export default App;
