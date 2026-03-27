import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import LoginPage from './features/auth/LoginPage';
import RegisterPage from './features/auth/RegisterPage';
import HomePage from './features/marketplace/HomePage';
import ProductDetailPage from './features/marketplace/ProductDetailPage';
import SellerStorePage from './features/marketplace/SellerStorePage';
import AuctionDetailPage from './features/marketplace/AuctionDetailPage';
import AccountPage from './features/account/AccountPage';
import OrderDetailPage from './features/account/OrderDetailPage';
import EscrowDetailPage from './features/account/EscrowDetailPage';
import MessagesPage from './features/chat/MessagesPage';
import SellerProductsPage from './features/seller/SellerProductsPage';
import SellerProductFormPage from './features/seller/SellerProductFormPage';
import SellerAuctionsPage from './features/seller/SellerAuctionsPage';
import SellerAuctionFormPage from './features/seller/SellerAuctionFormPage';
import AdminDashboardPage from './features/admin/AdminDashboardPage';
import AdminUsersPage from './features/admin/AdminUsersPage';
import AdminCategoriesPage from './features/admin/AdminCategoriesPage';
import AdminProductsPage from './features/admin/AdminProductsPage';
import AdminOrdersPage from './features/admin/AdminOrdersPage';
import AdminImportsPage from './features/admin/AdminImportsPage';
import AdminProductFormPage from './features/admin/AdminProductFormPage';
import UploadLabPage from './features/upload/UploadLabPage';
import DocsPage from './features/docs/DocsPage';
import SectionCard from './shared/SectionCard';
import AppLink from './shared/AppLink';
import { api } from '@frontend-utils/api';
import { clearStoredToken, getStoredToken, setStoredToken } from '@frontend-utils/auth';
import { normalizeTags, roleNames } from '@frontend-utils/format';
import { matchPath, navigateTo } from '@frontend-utils/router';
import { useRealtimeChat } from '@frontend-utils/useRealtimeChat';

const empty = {
  filters: { q: '', categoryId: '', saleType: '', source: '', minPrice: '', maxPrice: '', sort: '' },
  login: { identifier: 'admin@example.com', password: 'password123' },
  register: { username: '', email: '', fullName: '', phone: '', password: '' },
  product: {
    categoryId: '',
    title: '',
    description: 'San pham moi duoc tao tu frontend React.',
    saleType: 'fixed_price',
    price: '100000',
    condition: 'good',
    status: 'active',
    fulfillmentType: 'both',
    addressText: '',
    province: '',
    district: '',
    ward: '',
    tags: '',
  },
  auction: {
    id: '',
    productId: '',
    startAt: '',
    endAt: '',
    startingBid: '100000',
    currentBid: '',
    reservePrice: '',
    buyNowPrice: '',
    bidStep: '10000',
    status: 'scheduled',
  },
  profile: { fullName: '', phone: '', avatarUrl: '', bio: '' },
  address: {
    label: '',
    fullName: '',
    phone: '',
    province: '',
    district: '',
    ward: '',
    street: '',
    fullAddress: '',
    postalCode: '',
    isDefault: false,
  },
  review: { orderId: '', score: '5', comment: '', isVisible: true },
  upload: { ownerType: 'product', ownerId: '', remoteUrl: '' },
  category: { name: '', slug: '', description: '', sortOrder: '0', isActive: true },
  importForm: {
    categoryUrl: 'https://xe.chotot.com/',
    categoryName: 'Vehicles',
    maxPages: '1',
    keyword: '',
    mode: 'html',
  },
};

const uniq = (items = []) => [
  ...new Map(items.filter((item) => item?._id).map((item) => [String(item._id), item])).values(),
];
const toLocal = (value) =>
  value
    ? new Date(new Date(value).getTime() - new Date(value).getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16)
    : '';
const uploads = (payload) =>
  Array.isArray(payload?.data) ? payload.data : payload?.data ? [payload.data] : [];
const mapProductToForm = (product) => ({
  categoryId: product.category?._id || product.category || '',
  title: product.title || '',
  description: product.description || '',
  saleType: product.saleType || 'fixed_price',
  price: String(product.price || ''),
  condition: product.condition || 'good',
  status: product.status || 'active',
  fulfillmentType: product.fulfillmentType || 'both',
  addressText: product.addressText || '',
  province: product.province || '',
  district: product.district || '',
  ward: product.ward || '',
  tags: (product.tags || []).join(', '),
});
const mapAuctionToForm = (auction) => ({
  id: auction._id,
  productId: auction.product?._id || auction.product || '',
  startAt: toLocal(auction.startAt),
  endAt: toLocal(auction.endAt),
  startingBid: String(auction.startingBid || ''),
  currentBid: String(auction.currentBid || ''),
  reservePrice: String(auction.reservePrice || ''),
  buyNowPrice: String(auction.buyNowPrice || ''),
  bidStep: String(auction.bidStep || '10000'),
  status: auction.status || 'scheduled',
});
const mapProfileToForm = (member) => ({
  fullName: member?.fullName || '',
  phone: member?.phone || '',
  avatarUrl: member?.avatarUrl || '',
  bio: member?.bio || '',
});
const toNumber = (value) => {
  if (value === '' || value === null || value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};
const readAsBase64 = (file) =>
  new Promise((resolve, reject) => {
    if (!file) {
      resolve('');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Khong the doc file base64.'));
    reader.readAsDataURL(file);
  });

const parseCatalogSearch = (search = '') => {
  const params = new URLSearchParams(search);
  return {
    filters: {
      q: params.get('q') || '',
      categoryId: params.get('categoryId') || '',
      saleType: params.get('saleType') || '',
      source: params.get('source') || '',
      minPrice: params.get('minPrice') || '',
      maxPrice: params.get('maxPrice') || '',
      sort: params.get('sort') || '',
    },
    page: Math.max(1, Number(params.get('page') || 1)),
  };
};

const buildCatalogPath = (filters, page) => {
  const params = new URLSearchParams();
  Object.entries({ ...filters, page }).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (typeof value === 'string' && value.trim() === '') return;
    if (String(value) === '1' && key === 'page') return;
    params.set(key, value);
  });
  const query = params.toString();
  return query ? `/?${query}` : '/';
};

const parseSellerStoreSearch = (search = '') => {
  const params = new URLSearchParams(search);
  const tab = params.get('tab');
  return ['active', 'sold', 'auction'].includes(tab) ? tab : 'active';
};

const App = () => {
  const initialCatalogState = parseCatalogSearch(window.location.search);
  const initialSellerStoreTab = parseSellerStoreSearch(window.location.search);
  const [pathname, setPathname] = useState(() => window.location.pathname);
  const [token, setToken] = useState(() => getStoredToken());
  const [user, setUser] = useState(null);
  const [notice, setNotice] = useState(
    'Frontend React dang duoc to chuc theo tung folder chuc nang: auth, marketplace, account, chat, seller, admin, upload, docs.'
  );
  const [filters, setFilters] = useState(initialCatalogState.filters);
  const [catalogPage, setCatalogPage] = useState(initialCatalogState.page);
  const [catalogMeta, setCatalogMeta] = useState(null);
  const [isCatalogLoading, setIsCatalogLoading] = useState(false);
  const [loginForm, setLoginForm] = useState(empty.login);
  const [registerForm, setRegisterForm] = useState(empty.register);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [adminProducts, setAdminProducts] = useState([]);
  const [auctions, setAuctions] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedAuction, setSelectedAuction] = useState(null);
  const [selectedProductReviews, setSelectedProductReviews] = useState([]);
  const [sellerProducts, setSellerProducts] = useState([]);
  const [productForm, setProductForm] = useState(empty.product);
  const [editingProductId, setEditingProductId] = useState('');
  const [productFile, setProductFile] = useState(null);
  const [auctionForm, setAuctionForm] = useState(empty.auction);
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [escrows, setEscrows] = useState([]);
  const [selectedEscrow, setSelectedEscrow] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [profileForm, setProfileForm] = useState(empty.profile);
  const [addresses, setAddresses] = useState([]);
  const [addressForm, setAddressForm] = useState(empty.address);
  const [addressEditId, setAddressEditId] = useState('');
  const [reviewForm, setReviewForm] = useState(empty.review);
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState('');
  const [messages, setMessages] = useState([]);
  const [chatDraft, setChatDraft] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [chatFiles, setChatFiles] = useState([]);
  const [typingNames, setTypingNames] = useState([]);
  const [uploadState, setUploadState] = useState(empty.upload);
  const [mediaLibrary, setMediaLibrary] = useState([]);
  const [users, setUsers] = useState([]);
  const [categoryForm, setCategoryForm] = useState(empty.category);
  const [categoryEditId, setCategoryEditId] = useState('');
  const [importForm, setImportForm] = useState(empty.importForm);
  const [importBatches, setImportBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [sellerProfile, setSellerProfile] = useState(null);
  const [sellerStoreProducts, setSellerStoreProducts] = useState([]);
  const [sellerStoreMeta, setSellerStoreMeta] = useState(null);
  const [sellerStoreTab, setSellerStoreTab] = useState(initialSellerStoreTab);
  const [isSellerStoreLoading, setIsSellerStoreLoading] = useState(false);
  const [selectedAuctionDetail, setSelectedAuctionDetail] = useState(null);
  const typingRef = useRef(null);

  const fail = useCallback((error) => {
    setNotice(error?.message || 'Co loi xay ra trong frontend React.');
  }, []);

  const run = useCallback(
    async (task, message) => {
      try {
        const value = await task();
        if (message) setNotice(message);
        return value;
      } catch (error) {
        fail(error);
        return null;
      }
    },
    [fail]
  );

  const isAdmin = useMemo(
    () => (user?.roles || []).some((role) => ['admin', 'moderator'].includes(role?.name || role)),
    [user]
  );
  const activeConversation = useMemo(
    () => conversations.find((item) => item._id === activeConversationId) || null,
    [conversations, activeConversationId]
  );
  const sellerAuctions = useMemo(
    () => auctions.filter((item) => String(item.seller?._id || item.seller) === String(user?._id)),
    [auctions, user]
  );
  const mergeConversation = useCallback((conversation) => {
    if (!conversation?._id) return;
    setConversations((current) =>
      uniq([
        conversation,
        ...current.map((item) => (item._id === conversation._id ? { ...item, ...conversation } : item)),
      ]).sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0))
    );
  }, []);
  const appendMedia = useCallback(
    (payload) => setMediaLibrary((current) => uniq([...uploads(payload), ...current])),
    []
  );

  const productRoute = matchPath('/products/:productId', pathname);
  const auctionRoute = matchPath('/auctions/:auctionId', pathname);
  const sellerStoreRoute = matchPath('/users/:userId', pathname);
  const orderRoute = matchPath('/orders/:orderId', pathname);
  const escrowRoute = matchPath('/escrows/:escrowId', pathname);
  const messageRoute = matchPath('/messages/:conversationId', pathname);
  const sellerEditRoute = matchPath('/sell/products/:productId/edit', pathname);
  const adminEditRoute =
    matchPath('/admin/products/:productId/edit', pathname) ||
    matchPath('/admin/product/:productId/edit', pathname);
  const editRoute = sellerEditRoute || adminEditRoute;

  const messagesRoute = pathname === '/messages' || !!messageRoute;
  const accountRoute = pathname === '/account';
  const uploadRoute = pathname === '/upload-lab';
  const adminRoute = pathname.startsWith('/admin');
  const docsRoute = pathname === '/docs';
  const homeRoute = pathname === '/' || !!productRoute;
  const sellerRoute = pathname.startsWith('/sell');
  const headerSearchVisible = homeRoute || pathname === '/messages' || pathname === '/account';

  const resetProductForm = useCallback(() => {
    setProductForm(empty.product);
    setEditingProductId('');
    setProductFile(null);
  }, []);

  const resetAuctionForm = useCallback(() => {
    setAuctionForm(empty.auction);
  }, []);

  const resetAddressForm = useCallback(() => {
    setAddressForm(empty.address);
    setAddressEditId('');
  }, []);

  const resetCategoryForm = useCallback(() => {
    setCategoryForm(empty.category);
    setCategoryEditId('');
  }, []);

  const loadPublic = useCallback(async () => {
    setIsCatalogLoading(true);
    try {
      const [categoriesPayload, productsPayload, auctionsPayload] = await Promise.all([
        api.categories({ isActive: true }),
        api.products({ status: 'active', page: catalogPage, ...filters }),
        api.auctions(),
      ]);
      setCategories(categoriesPayload.data || []);
      setProducts(productsPayload.data || []);
      setCatalogMeta(productsPayload.meta || null);
      setAuctions(auctionsPayload.data || []);
    } finally {
      setIsCatalogLoading(false);
    }
  }, [catalogPage, filters]);

  const loadSellerProducts = useCallback(async () => {
    if (!user?._id) {
      setSellerProducts([]);
      return;
    }
    const payload = await api.products({ sellerId: user._id, limit: 50 });
    setSellerProducts(payload.data || []);
  }, [user]);

  const loadPrivate = useCallback(async () => {
    if (!token) {
      setAddresses([]);
      setOrders([]);
      setEscrows([]);
      setReviews([]);
      setConversations([]);
      return;
    }
    const [addressesPayload, ordersPayload, escrowsPayload, reviewsPayload, conversationsPayload] =
      await Promise.all([
        api.addresses(),
        api.orders(),
        api.escrows(),
        api.reviews(),
        api.conversations(),
      ]);
    setAddresses(addressesPayload.data || []);
    setOrders(ordersPayload.data || []);
    setEscrows(escrowsPayload.data || []);
    setReviews(reviewsPayload.data || []);
    setConversations(conversationsPayload.data || []);
  }, [token]);

  const loadAdmin = useCallback(async () => {
    if (!isAdmin) {
      setUsers([]);
      setImportBatches([]);
      setAdminProducts([]);
      return;
    }
    const [usersPayload, importPayload, productsPayload] = await Promise.all([
      api.users(),
      api.importBatches(),
      api.products({ limit: 80 }),
    ]);
    setUsers(usersPayload.data || []);
    setImportBatches(importPayload.data || []);
    setAdminProducts(productsPayload.data || []);
  }, [isAdmin]);

  const refreshAll = useCallback(async () => {
    await loadPublic();
    if (token) {
      await Promise.all([loadSellerProducts(), loadPrivate(), loadAdmin()]);
    }
  }, [loadAdmin, loadPrivate, loadPublic, loadSellerProducts, token]);

  const loadProductDetail = useCallback(async (productId) => {
    const [productPayload, reviewsPayload] = await Promise.all([
      api.product(productId),
      api.reviews({ productId, visible: true }),
    ]);
    setSelectedProduct(productPayload.data || null);
    setSelectedProductReviews(reviewsPayload.data || []);
  }, []);

  const loadSellerStore = useCallback(async (userId) => {
    setIsSellerStoreLoading(true);
    try {
      const productParams =
        sellerStoreTab === 'sold'
          ? { sellerId: userId, limit: 24, status: 'sold' }
          : sellerStoreTab === 'auction'
            ? { sellerId: userId, limit: 24, saleType: 'auction', status: '' }
            : { sellerId: userId, limit: 24, status: 'active' };
      const [userPayload, productsPayload] = await Promise.all([
        api.user(userId),
        api.products(productParams),
      ]);
      setSellerProfile(userPayload.data || null);
      setSellerStoreProducts(productsPayload.data || []);
      setSellerStoreMeta(productsPayload.meta || null);
    } finally {
      setIsSellerStoreLoading(false);
    }
  }, [sellerStoreTab]);

  const loadOrderDetail = useCallback(async (orderId) => {
    const payload = await api.order(orderId);
    setSelectedOrder(payload.data || null);
  }, []);

  const loadEscrowDetail = useCallback(async (escrowId) => {
    const payload = await api.escrow(escrowId);
    setSelectedEscrow(payload.data || null);
  }, []);

  const loadAuctionDetail = useCallback(async (auctionId) => {
    const payload = await api.auction(auctionId);
    setSelectedAuctionDetail(payload.data || null);
  }, []);

  const loadMessages = useCallback(async (conversationId) => {
    const payload = await api.conversationMessages(conversationId);
    setMessages((payload.data || []).slice().reverse());
    await api.markConversationRead(conversationId).catch(() => {});
    setConversations((current) =>
      current.map((item) => (item._id === conversationId ? { ...item, unreadCount: 0 } : item))
    );
  }, []);

  useEffect(() => {
    const onPop = () => {
      const nextPath = window.location.pathname;
      setPathname(nextPath);
      if (nextPath === '/') {
        const parsed = parseCatalogSearch(window.location.search);
        setFilters(parsed.filters);
        setCatalogPage(parsed.page);
      }
      if (nextPath.startsWith('/users/')) {
        setSellerStoreTab(parseSellerStoreSearch(window.location.search));
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    run(() => loadPublic());
  }, [loadPublic, run]);

  useEffect(() => {
    if (!token) {
      setUser(null);
      setProfileForm(empty.profile);
      return;
    }
    run(async () => {
      const payload = await api.me();
      setUser(payload.data || null);
      setProfileForm(mapProfileToForm(payload.data));
    });
  }, [token, run]);

  useEffect(() => {
    if (!user?._id) return;
    run(async () => {
      await Promise.all([loadSellerProducts(), loadPrivate(), loadAdmin()]);
    });
  }, [loadAdmin, loadPrivate, loadSellerProducts, run, user]);

  useEffect(() => {
    if (!productRoute?.productId) {
      if (pathname === '/') {
        setSelectedProduct(null);
        setSelectedProductReviews([]);
      }
      return;
    }
    run(() => loadProductDetail(productRoute.productId));
  }, [loadProductDetail, pathname, productRoute, run]);

  useEffect(() => {
    if (!sellerStoreRoute?.userId) {
      setSellerProfile(null);
      setSellerStoreProducts([]);
      setSellerStoreMeta(null);
      return;
    }
    run(() => loadSellerStore(sellerStoreRoute.userId));
  }, [loadSellerStore, run, sellerStoreRoute, sellerStoreTab]);

  useEffect(() => {
    if (!orderRoute?.orderId) {
      if (pathname !== '/account') setSelectedOrder(null);
      return;
    }
    if (!token) return;
    run(() => loadOrderDetail(orderRoute.orderId));
  }, [loadOrderDetail, orderRoute, pathname, run, token]);

  useEffect(() => {
    if (!escrowRoute?.escrowId) {
      setSelectedEscrow(null);
      return;
    }
    if (!token) return;
    run(() => loadEscrowDetail(escrowRoute.escrowId));
  }, [escrowRoute, loadEscrowDetail, run, token]);

  useEffect(() => {
    if (!auctionRoute?.auctionId) {
      setSelectedAuctionDetail(null);
      return;
    }
    run(() => loadAuctionDetail(auctionRoute.auctionId));
  }, [auctionRoute, loadAuctionDetail, run]);

  useEffect(() => {
    if (!messageRoute?.conversationId) {
      if (pathname === '/messages') {
        setActiveConversationId('');
        setMessages([]);
        setReplyTo(null);
      }
      return;
    }
    if (activeConversationId !== messageRoute.conversationId) {
      setActiveConversationId(messageRoute.conversationId);
    }
  }, [activeConversationId, messageRoute, pathname]);

  useEffect(() => {
    if (!activeConversationId || !token) return;
    run(() => loadMessages(activeConversationId));
  }, [activeConversationId, loadMessages, run, token]);

  useEffect(() => {
    if (!selectedProduct?._id) {
      setSelectedAuction(null);
      return;
    }
    setSelectedAuction(
      auctions.find((item) => String(item.product?._id || item.product) === String(selectedProduct._id)) ||
        null
    );
  }, [auctions, selectedProduct]);

  useEffect(() => {
    if (editRoute?.productId) {
      run(async () => {
        const payload = await api.product(editRoute.productId);
        setEditingProductId(payload.data?._id || '');
        setProductForm(mapProductToForm(payload.data || {}));
      });
      return;
    }
    if (
      pathname === '/sell/products/create' ||
      pathname === '/admin/products/create' ||
      pathname === '/admin/product/create'
    ) {
      resetProductForm();
    }
  }, [editRoute, pathname, resetProductForm, run]);

  useEffect(() => {
    setTypingNames([]);
  }, [activeConversationId]);

  const handleMessageCreated = useCallback(
    ({ conversationId, conversation, message }) => {
      mergeConversation(conversation);
      if (activeConversationId === conversationId) {
        setMessages((current) => uniq([...current, message]));
        api.markConversationRead(conversationId).catch(() => {});
      }
    },
    [activeConversationId, mergeConversation]
  );

  const { socketState, startTyping, stopTyping } = useRealtimeChat({
    token,
    activeConversationId,
    onConversation: mergeConversation,
    onMessage: handleMessageCreated,
    onMessageUpdated: ({ conversation, message }) => {
      mergeConversation(conversation);
      setMessages((current) => current.map((item) => (item._id === message._id ? { ...item, ...message } : item)));
    },
    onMessagesRead: ({ conversationId, readerId, messageIds }) => {
      if (String(readerId) === String(user?._id)) {
        setConversations((current) =>
          current.map((item) => (item._id === conversationId ? { ...item, unreadCount: 0 } : item))
        );
      }
      setMessages((current) =>
        current.map((item) => (messageIds.includes(item._id) ? { ...item, status: 'read' } : item))
      );
    },
    onTyping: ({ conversationId, fullName, username, isTyping, userId }) => {
      if (conversationId !== activeConversationId || String(userId) === String(user?._id)) return;
      const label = fullName || username || 'Nguoi dung';
      setTypingNames((current) => {
        const next = new Set(current);
        if (isTyping) next.add(label);
        else next.delete(label);
        return [...next];
      });
    },
  });

  const onTypingChange = useCallback(() => {
    if (!activeConversationId) return;
    startTyping(activeConversationId);
    if (typingRef.current) clearTimeout(typingRef.current);
    typingRef.current = setTimeout(() => {
      stopTyping(activeConversationId);
    }, 1200);
  }, [activeConversationId, startTyping, stopTyping]);

  useEffect(
    () => () => {
      if (typingRef.current) clearTimeout(typingRef.current);
    },
    []
  );

  const selectProduct = useCallback((productId) => navigateTo(`/products/${productId}`), []);
  const selectAuctionRoute = useCallback((auctionId) => navigateTo(`/auctions/${auctionId}`), []);
  const selectOrderRoute = useCallback((orderId) => navigateTo(`/orders/${orderId}`), []);
  const selectEscrowRoute = useCallback((escrowId) => navigateTo(`/escrows/${escrowId}`), []);
  const selectConversation = useCallback((conversationId) => navigateTo(`/messages/${conversationId}`), []);

  const handleApplyFilters = useCallback(
    (nextFilters = filters) => {
      setFilters(nextFilters);
      setCatalogPage(1);
      navigateTo(buildCatalogPath(nextFilters, 1));
      setNotice('Da cap nhat danh sach san pham.');
    },
    [filters]
  );

  const handleCatalogPageChange = useCallback(
    (page, nextFilters = filters) => {
      setFilters(nextFilters);
      setCatalogPage(page);
      navigateTo(buildCatalogPath(nextFilters, page));
    },
    [filters]
  );

  const handleSellerStoreTabChange = useCallback(
    (tab) => {
      setSellerStoreTab(tab);
      if (sellerStoreRoute?.userId) {
        const query = tab === 'active' ? '' : `?tab=${tab}`;
        navigateTo(`/users/${sellerStoreRoute.userId}${query}`);
      }
    },
    [sellerStoreRoute]
  );

  const handleHeaderSearch = useCallback(
    (event) => {
      event.preventDefault();
      setCatalogPage(1);
      navigateTo(buildCatalogPath(filters, 1));
      setNotice('Da tim kiem tu thanh header.');
    },
    [filters]
  );

  const handleLogin = useCallback(
    async (event) => {
      event.preventDefault();
      const payload = await api.login(loginForm);
      setStoredToken(payload.data.accessToken);
      setToken(payload.data.accessToken);
      setUser(payload.data.user);
      setProfileForm(mapProfileToForm(payload.data.user));
      navigateTo('/');
      setNotice(`Da dang nhap voi ${payload.data.user.fullName || payload.data.user.username}.`);
    },
    [loginForm]
  );

  const handleRegister = useCallback(
    async (event) => {
      event.preventDefault();
      const payload = await api.register(registerForm);
      setStoredToken(payload.data.accessToken);
      setToken(payload.data.accessToken);
      setUser(payload.data.user);
      setProfileForm(mapProfileToForm(payload.data.user));
      navigateTo('/');
      setNotice(`Da tao tai khoan ${payload.data.user.fullName || payload.data.user.username}.`);
    },
    [registerForm]
  );

  const handleLogout = useCallback(async () => {
    await api.logout().catch(() => {});
    clearStoredToken();
    setToken('');
    setUser(null);
    setSelectedOrder(null);
    setSelectedBatch(null);
    setReplyTo(null);
    setMessages([]);
    navigateTo('/');
    setNotice('Da dang xuat.');
  }, []);

  const handleSaveProfile = useCallback(
    async (event) => {
      event.preventDefault();
      if (!user?._id) return;
      const payload = await api.updateUser(user._id, profileForm);
      setUser(payload.data);
      setProfileForm(mapProfileToForm(payload.data));
      setNotice('Da cap nhat profile.');
    },
    [profileForm, user]
  );

  const handleSaveAddress = useCallback(
    async (event) => {
      event.preventDefault();
      if (!user?._id) return;
      if (addressEditId) {
        await api.updateAddress(addressEditId, addressForm);
        setNotice('Da cap nhat dia chi.');
      } else {
        await api.createAddress(addressForm);
        setNotice('Da tao dia chi moi.');
      }
      resetAddressForm();
      await loadPrivate();
    },
    [addressEditId, addressForm, loadPrivate, resetAddressForm, user]
  );

  const handleEditAddress = useCallback((address) => {
    setAddressEditId(address._id);
    setAddressForm({
      label: address.label || '',
      fullName: address.fullName || '',
      phone: address.phone || '',
      province: address.province || '',
      district: address.district || '',
      ward: address.ward || '',
      street: address.street || '',
      fullAddress: address.fullAddress || '',
      postalCode: address.postalCode || '',
      isDefault: Boolean(address.isDefault),
    });
    navigateTo('/account');
  }, []);

  const handleDeleteAddress = useCallback(
    async (addressId) => {
      await api.deleteAddress(addressId);
      if (addressEditId === addressId) resetAddressForm();
      await loadPrivate();
      setNotice('Da xoa dia chi.');
    },
    [addressEditId, loadPrivate, resetAddressForm]
  );

  const handleSelectOrder = useCallback(async (orderId) => {
    await loadOrderDetail(orderId);
  }, [loadOrderDetail]);

  const handleUpdateOrderStatus = useCallback(
    async (orderId, status) => {
      await api.updateOrderStatus(orderId, { status });
      await loadPrivate();
      if (selectedOrder?.order?._id === orderId) {
        await loadOrderDetail(orderId);
      }
      setNotice(`Da cap nhat order sang ${status}.`);
    },
    [loadOrderDetail, loadPrivate, selectedOrder]
  );

  const handleDeleteOrder = useCallback(
    async (orderId) => {
      await api.deleteOrder(orderId);
      if (selectedOrder?.order?._id === orderId) {
        setSelectedOrder(null);
        if (orderRoute?.orderId === orderId) {
          navigateTo('/account');
        }
      }
      await loadPrivate();
      setNotice('Da xoa order.');
    },
    [loadPrivate, orderRoute, selectedOrder]
  );

  const handleEscrowAction = useCallback(
    async (escrowId, action) => {
      const reason = window.prompt(`Nhap ghi chu cho ${action}`, `${action} tu frontend React`) || '';
      await api.updateEscrow(escrowId, action, { reason, notes: reason });
      await loadPrivate();
      if (isAdmin) await loadAdmin();
      if (selectedEscrow?._id === escrowId) {
        await loadEscrowDetail(escrowId);
      }
      setNotice(`Da cap nhat escrow: ${action}.`);
    },
    [isAdmin, loadAdmin, loadEscrowDetail, loadPrivate, selectedEscrow]
  );

  const handleCreateReview = useCallback(
    async (event) => {
      event.preventDefault();
      await api.createReview({
        ...reviewForm,
        score: Number(reviewForm.score),
      });
      setReviewForm(empty.review);
      await loadPrivate();
      setNotice('Da tao review.');
    },
    [loadPrivate, reviewForm]
  );

  const handleRespondReview = useCallback(
    async (reviewId) => {
      const content = window.prompt('Noi dung phan hoi review', 'Cam on ban da danh gia.');
      if (content === null) return;
      await api.respondReview(reviewId, { content });
      await loadPrivate();
      if (isAdmin) await loadAdmin();
      setNotice('Da phan hoi review.');
    },
    [isAdmin, loadAdmin, loadPrivate]
  );

  const handleToggleReviewVisibility = useCallback(
    async (review) => {
      await api.updateReviewVisibility(review._id, { isVisible: !review.isVisible });
      await loadPrivate();
      if (productRoute?.productId) await loadProductDetail(productRoute.productId);
      setNotice('Da cap nhat hien thi review.');
    },
    [loadPrivate, loadProductDetail, productRoute]
  );

  const handleSaveProduct = useCallback(
    async (event) => {
      event.preventDefault();
      const payload = {
        ...productForm,
        price: toNumber(productForm.price) || 0,
        categoryId: productForm.categoryId,
        tags: normalizeTags(productForm.tags),
      };

      const response = editingProductId
        ? await api.updateProduct(editingProductId, payload)
        : await api.createProduct(payload);

      const productId = response.data?._id || editingProductId;
      if (productFile && productId) {
        const formData = new FormData();
        formData.append('ownerType', 'product');
        formData.append('ownerId', productId);
        formData.append('isPrimary', 'true');
        formData.append('file', productFile);
        appendMedia(await api.uploadSingle(formData));
      }

      await refreshAll();
      resetProductForm();
      const target = adminRoute ? '/admin/products' : '/sell/products';
      navigateTo(target);
      setNotice(editingProductId ? 'Da cap nhat listing.' : 'Da tao listing moi.');
    },
    [adminRoute, appendMedia, editingProductId, productFile, productForm, refreshAll, resetProductForm]
  );

  const handleDeleteProduct = useCallback(
    async (productId) => {
      await api.deleteProduct(productId);
      if (selectedProduct?._id === productId) {
        setSelectedProduct(null);
        navigateTo('/');
      }
      await refreshAll();
      setNotice('Da xoa listing.');
    },
    [refreshAll, selectedProduct]
  );

  const handleEditProductSeller = useCallback((product) => {
    navigateTo(`/sell/products/${product._id}/edit`);
  }, []);

  const handleEditProductAdmin = useCallback((product) => {
    navigateTo(`/admin/products/${product._id}/edit`);
  }, []);

  const handleSaveAuction = useCallback(
    async (event) => {
      event.preventDefault();
      const payload = {
        productId: auctionForm.productId,
        startAt: auctionForm.startAt ? new Date(auctionForm.startAt).toISOString() : undefined,
        endAt: auctionForm.endAt ? new Date(auctionForm.endAt).toISOString() : undefined,
        startingBid: toNumber(auctionForm.startingBid) || 0,
        currentBid: toNumber(auctionForm.currentBid),
        reservePrice: toNumber(auctionForm.reservePrice),
        buyNowPrice: toNumber(auctionForm.buyNowPrice),
        bidStep: toNumber(auctionForm.bidStep) || 10000,
        status: auctionForm.status,
      };
      if (auctionForm.id) {
        await api.updateAuction(auctionForm.id, payload);
        setNotice('Da cap nhat auction.');
      } else {
        await api.createAuction(payload);
        setNotice('Da tao auction moi.');
      }
      resetAuctionForm();
      await refreshAll();
      navigateTo('/sell/auctions');
    },
    [auctionForm, refreshAll, resetAuctionForm]
  );

  const handleEditAuction = useCallback((auction) => {
    setAuctionForm(mapAuctionToForm(auction));
    navigateTo('/sell/auctions/create');
  }, []);

  const handleCloseAuction = useCallback(
    async (auctionId) => {
      await api.closeAuction(auctionId, { force: true });
      await refreshAll();
      if (selectedAuctionDetail?.auction?._id === auctionId) {
        await loadAuctionDetail(auctionId);
      }
      setNotice('Da dong auction.');
    },
    [loadAuctionDetail, refreshAll, selectedAuctionDetail]
  );

  const handleDeleteAuction = useCallback(
    async (auctionId) => {
      await api.deleteAuction(auctionId);
      if (auctionRoute?.auctionId === auctionId) {
        setSelectedAuctionDetail(null);
        navigateTo('/sell/auctions');
      }
      await refreshAll();
      setNotice('Da xoa auction.');
    },
    [auctionRoute, refreshAll]
  );

  const handleCreateOrder = useCallback(async () => {
    if (!selectedProduct?._id || !user?._id) return;
    const address = addresses.find((item) => item.isDefault) || addresses[0];
    await api.createOrder({
      productId: selectedProduct._id,
      quantity: 1,
      paymentType: 'escrow',
      shippingMethod: 'delivery',
      shippingFee: 30000,
      platformFee: 20000,
      shippingAddressId: address?._id,
      shippingAddress: address
        ? {
            fullName: address.fullName,
            phone: address.phone,
            province: address.province,
            district: address.district,
            ward: address.ward,
            street: address.street,
            fullAddress: address.fullAddress,
          }
        : {
            fullName: user.fullName,
            phone: user.phone || '',
            province: selectedProduct.province || '',
            district: selectedProduct.district || '',
            ward: selectedProduct.ward || '',
            fullAddress: selectedProduct.addressText || '',
          },
    });
    await loadPrivate();
    navigateTo('/account');
    setNotice('Da tao order tu chi tiet san pham.');
  }, [addresses, loadPrivate, selectedProduct, user]);

  const handlePlaceBid = useCallback(async () => {
    if (!selectedAuction?._id) return;
    const amount = Number(
      window.prompt(
        'Nhap gia bid',
        String((selectedAuction.currentBid || selectedAuction.startingBid || 0) + (selectedAuction.bidStep || 10000))
      )
    );
    if (!amount) return;
    await api.placeBid(selectedAuction._id, amount);
    await refreshAll();
    setNotice('Da dat gia thanh cong.');
  }, [refreshAll, selectedAuction]);

  const handlePlaceBidForAuction = useCallback(
    async (auctionId) => {
      const targetAuction = selectedAuctionDetail?.auction?._id === auctionId
        ? selectedAuctionDetail.auction
        : auctions.find((item) => String(item._id) === String(auctionId));
      if (!targetAuction?._id) return;
      const amount = Number(
        window.prompt(
          'Nhap gia bid',
          String((targetAuction.currentBid || targetAuction.startingBid || 0) + (targetAuction.bidStep || 10000))
        )
      );
      if (!amount) return;
      await api.placeBid(targetAuction._id, amount);
      await refreshAll();
      if (String(pathname).startsWith('/auctions/')) {
        await loadAuctionDetail(targetAuction._id);
      }
      setNotice('Da dat gia trong trang auction.');
    },
    [auctions, loadAuctionDetail, pathname, refreshAll, selectedAuctionDetail]
  );

  const handleStartConversation = useCallback(async () => {
    if (!selectedProduct?._id || !user?._id) return;
    const sellerId = selectedProduct.seller?._id || selectedProduct.seller;
    if (String(sellerId) === String(user._id)) {
      setNotice('Ban dang xem listing cua chinh minh.');
      return;
    }
    const payload = await api.createConversation({
      productId: selectedProduct._id,
      otherUserId: sellerId,
      subject: `Hoi ve ${selectedProduct.title}`,
      initialMessage: 'Xin chao, san pham nay con khong?',
    });
    mergeConversation(payload.data);
    navigateTo(`/messages/${payload.data._id}`);
    setNotice('Da mo conversation voi nguoi ban.');
  }, [mergeConversation, selectedProduct, user]);

  const sendChat = useCallback(
    async (event) => {
      event.preventDefault();
      if (!activeConversationId || (!chatDraft.trim() && !chatFiles.length)) return;

      const messagePayload = await api.sendMessage(activeConversationId, {
        content: chatDraft.trim() || (chatFiles.length ? '[image]' : ''),
        messageType: chatFiles.length ? 'image' : 'text',
        replyTo: replyTo?._id || null,
      });

      if (chatFiles.length) {
        const formData = new FormData();
        formData.append('ownerType', 'message');
        formData.append('ownerId', messagePayload.data._id);
        if (chatFiles.length === 1) {
          formData.append('file', chatFiles[0]);
          appendMedia(await api.uploadSingle(formData));
        } else {
          chatFiles.forEach((file) => formData.append('files', file));
          appendMedia(await api.uploadMany(formData));
        }
      }

      setChatDraft('');
      setReplyTo(null);
      setChatFiles([]);
      stopTyping(activeConversationId);
      if (typingRef.current) clearTimeout(typingRef.current);
    },
    [activeConversationId, appendMedia, chatDraft, chatFiles, replyTo, stopTyping]
  );

  const handleEditMessage = useCallback(
    async (message) => {
      const content = window.prompt('Sua noi dung tin nhan', message.content || '');
      if (content === null) return;
      await api.updateMessage(activeConversationId, message._id, { content });
      setNotice('Da sua message.');
    },
    [activeConversationId]
  );

  const handleDeleteMessage = useCallback(
    async (message) => {
      await api.deleteMessage(activeConversationId, message._id);
      setNotice('Da thu hoi message.');
    },
    [activeConversationId]
  );

  const handleDeleteAttachment = useCallback(
    async (message, mediaId) => {
      await api.deleteMessageAttachment(activeConversationId, message._id, mediaId);
      setNotice('Da xoa attachment khoi message.');
    },
    [activeConversationId]
  );

  const handleSaveCategory = useCallback(
    async (event) => {
      event.preventDefault();
      const payload = {
        ...categoryForm,
        sortOrder: toNumber(categoryForm.sortOrder) || 0,
      };
      if (categoryEditId) {
        await api.updateCategory(categoryEditId, payload);
        setNotice('Da cap nhat category.');
      } else {
        await api.createCategory(payload);
        setNotice('Da tao category.');
      }
      resetCategoryForm();
      await refreshAll();
    },
    [categoryEditId, categoryForm, refreshAll, resetCategoryForm]
  );

  const handleEditCategory = useCallback((category) => {
    setCategoryEditId(category._id);
    setCategoryForm({
      name: category.name || '',
      slug: category.slug || '',
      description: category.description || '',
      sortOrder: String(category.sortOrder || 0),
      isActive: category.isActive !== false,
    });
    navigateTo('/admin/categories');
  }, []);

  const handleDeleteCategory = useCallback(
    async (categoryId) => {
      await api.deleteCategory(categoryId);
      if (categoryEditId === categoryId) resetCategoryForm();
      await refreshAll();
      setNotice('Da xoa category.');
    },
    [categoryEditId, refreshAll, resetCategoryForm]
  );

  const handlePatchUser = useCallback(
    async (member, patch) => {
      await api.updateUser(member._id, patch);
      await loadAdmin();
      setNotice('Da cap nhat user.');
    },
    [loadAdmin]
  );

  const handleDeleteUser = useCallback(
    async (userId) => {
      await api.deleteUser(userId);
      await loadAdmin();
      setNotice('Da xoa user.');
    },
    [loadAdmin]
  );

  const handleModerateProduct = useCallback(
    async (productId, status) => {
      await api.updateProduct(productId, { status });
      await refreshAll();
      setNotice(`Da chuyen trang thai san pham sang ${status}.`);
    },
    [refreshAll]
  );

  const handleRunImport = useCallback(
    async (event) => {
      event.preventDefault();
      await api.imports({
        ...importForm,
        maxPages: Number(importForm.maxPages || 1),
      });
      await refreshAll();
      setNotice('Da chay import Chotot.');
    },
    [importForm, refreshAll]
  );

  const handleSelectBatch = useCallback(async (batchId) => {
    const payload = await api.importBatch(batchId);
    setSelectedBatch(payload.data || null);
  }, []);

  const handleUploadBase64 = useCallback(
    async (file) => {
      if (!file) return;
      const base64 = await readAsBase64(file);
      appendMedia(
        await api.uploadBase64({
          ownerType: uploadState.ownerType,
          ownerId: uploadState.ownerId,
          base64,
          fileName: file.name,
          mimeType: file.type,
        })
      );
      setNotice('Da upload base64.');
    },
    [appendMedia, uploadState]
  );

  const handleUploadSingle = useCallback(
    async (file) => {
      if (!file) return;
      const formData = new FormData();
      formData.append('ownerType', uploadState.ownerType);
      formData.append('ownerId', uploadState.ownerId);
      formData.append('file', file);
      appendMedia(await api.uploadSingle(formData));
      setNotice('Da upload multipart.');
    },
    [appendMedia, uploadState]
  );

  const handleUploadMany = useCallback(
    async (files) => {
      if (!files?.length) return;
      const formData = new FormData();
      formData.append('ownerType', uploadState.ownerType);
      formData.append('ownerId', uploadState.ownerId);
      files.forEach((file) => formData.append('files', file));
      appendMedia(await api.uploadMany(formData));
      setNotice('Da upload multipart nhieu anh.');
    },
    [appendMedia, uploadState]
  );

  const handleUploadRemote = useCallback(async () => {
    appendMedia(
      await api.uploadRemote({
        ownerType: uploadState.ownerType,
        ownerId: uploadState.ownerId,
        url: uploadState.remoteUrl,
      })
    );
    setNotice('Da dang ky remote media.');
  }, [appendMedia, uploadState]);

  const handleDeleteMedia = useCallback(async (mediaId) => {
    await api.deleteMedia(mediaId);
    setMediaLibrary((current) => current.filter((item) => item._id !== mediaId));
    setNotice('Da xoa media.');
  }, []);

  const commonCatalogProps = {
    user,
    categories,
    products,
    filters,
    setFilters,
    onApplyFilters: handleApplyFilters,
    onViewSellerStore: (userId) => navigateTo(`/users/${userId}`),
    selectedProduct,
    selectedAuction,
    selectedProductReviews,
    onSelectProduct: selectProduct,
    onViewAuctionDetail: selectAuctionRoute,
    onCreateOrder: () => run(handleCreateOrder),
    onPlaceBid: () => run(handlePlaceBid),
    onStartConversation: () => run(handleStartConversation),
    catalogMeta,
    catalogPage,
    onCatalogPageChange: handleCatalogPageChange,
    isCatalogLoading,
  };

  const commonSellerProps = {
    categories,
    productForm,
    setProductForm,
    setProductFile,
    editingProductId,
    onSaveProduct: (event) => run(() => handleSaveProduct(event)),
    onResetProductForm: () => {
      resetProductForm();
      navigateTo(adminRoute ? '/admin/products/create' : '/sell/products/create', true);
    },
    sellerProducts,
    onEditProduct: adminRoute ? handleEditProductAdmin : handleEditProductSeller,
    onDeleteProduct: (productId) => run(() => handleDeleteProduct(productId)),
    auctionForm,
    setAuctionForm,
    onSaveAuction: (event) => run(() => handleSaveAuction(event)),
    onResetAuctionForm: () => {
      resetAuctionForm();
      navigateTo('/sell/auctions/create', true);
    },
    sellerAuctions,
    onEditAuction: handleEditAuction,
    onViewAuction: selectAuctionRoute,
    onCloseAuction: (auctionId) => run(() => handleCloseAuction(auctionId)),
    onDeleteAuction: (auctionId) => run(() => handleDeleteAuction(auctionId)),
  };

  const commonAccountProps = {
    user,
    profileForm,
    setProfileForm,
    onSaveProfile: (event) => run(() => handleSaveProfile(event)),
    addresses,
    addressForm,
    setAddressForm,
    addressEditId,
    onSaveAddress: (event) => run(() => handleSaveAddress(event)),
    onEditAddress: handleEditAddress,
    onResetAddressForm: resetAddressForm,
    onDeleteAddress: (addressId) => run(() => handleDeleteAddress(addressId)),
    orders,
    selectedOrder,
    onSelectOrder: selectOrderRoute,
    onUpdateOrderStatus: (orderId, status) => run(() => handleUpdateOrderStatus(orderId, status)),
    onDeleteOrder: (orderId) => run(() => handleDeleteOrder(orderId)),
    escrows,
    selectedEscrow,
    onViewEscrow: selectEscrowRoute,
    onEscrowAction: (escrowId, action) => run(() => handleEscrowAction(escrowId, action)),
    reviews,
    reviewForm,
    setReviewForm,
    onCreateReview: (event) => run(() => handleCreateReview(event)),
    onRespondReview: (reviewId) => run(() => handleRespondReview(reviewId)),
  };

  const commonChatProps = {
    socketState,
    conversations,
    activeConversationId,
    onSelectConversation: selectConversation,
    activeConversation,
    messages,
    chatDraft,
    setChatDraft,
    replyTo,
    setReplyTo,
    chatFiles,
    setChatFiles,
    sendChat: (event) => run(() => sendChat(event)),
    typingNames,
    onTypingChange,
    onEditMessage: (message) => run(() => handleEditMessage(message)),
    onDeleteMessage: (message) => run(() => handleDeleteMessage(message)),
    onDeleteAttachment: (message, mediaId) => run(() => handleDeleteAttachment(message, mediaId)),
    user,
  };

  const commonUploadProps = {
    uploadState,
    setUploadState,
    mediaLibrary,
    onUploadBase64: (file) => run(() => handleUploadBase64(file)),
    onUploadSingle: (file) => run(() => handleUploadSingle(file)),
    onUploadMany: (files) => run(() => handleUploadMany(files)),
    onUploadRemote: () => run(handleUploadRemote),
    onDeleteMedia: (mediaId) => run(() => handleDeleteMedia(mediaId)),
  };

  const commonAdminProps = {
    isAdmin,
    users,
    onPatchUser: (member, patch) => run(() => handlePatchUser(member, patch)),
    onDeleteUser: (userId) => run(() => handleDeleteUser(userId)),
    categories,
    categoryForm,
    setCategoryForm,
    categoryEditId,
    onSaveCategory: (event) => run(() => handleSaveCategory(event)),
    onEditCategory: handleEditCategory,
    onResetCategoryForm: resetCategoryForm,
    onDeleteCategory: (categoryId) => run(() => handleDeleteCategory(categoryId)),
    products: adminProducts,
    onModerateProduct: (productId, status) => run(() => handleModerateProduct(productId, status)),
    onDeleteProduct: (productId) => run(() => handleDeleteProduct(productId)),
    orders,
    onViewOrder: selectOrderRoute,
    onUpdateOrderStatus: (orderId, status) => run(() => handleUpdateOrderStatus(orderId, status)),
    onDeleteOrder: (orderId) => run(() => handleDeleteOrder(orderId)),
    auctions,
    onViewAuction: selectAuctionRoute,
    onCloseAuction: (auctionId) => run(() => handleCloseAuction(auctionId)),
    onDeleteAuction: (auctionId) => run(() => handleDeleteAuction(auctionId)),
    escrows,
    onViewEscrow: selectEscrowRoute,
    onEscrowAction: (escrowId, action) => run(() => handleEscrowAction(escrowId, action)),
    reviews,
    onToggleReviewVisibility: (review) => run(() => handleToggleReviewVisibility(review)),
    onRespondReview: (reviewId) => run(() => handleRespondReview(reviewId)),
    importForm,
    setImportForm,
    onRunImport: (event) => run(() => handleRunImport(event)),
    importBatches,
    selectedBatch,
    onSelectBatch: (batchId) => run(() => handleSelectBatch(batchId)),
  };

  const mainNav = [
    { label: 'Trang chu', to: '/' },
    { label: 'Tai khoan', to: '/account', requiresAuth: true },
    { label: 'Tin nhan', to: '/messages', requiresAuth: true },
    { label: 'Dang ban', to: '/sell/products', requiresAuth: true },
    { label: 'Upload', to: '/upload-lab', requiresAuth: true },
    { label: 'Docs', to: '/docs' },
    { label: 'Admin', to: '/admin', requiresAdmin: true },
  ];

  const currentPageLabel = useMemo(() => {
    if (pathname === '/') return 'Trang chu';
    if (productRoute) return 'Chi tiet san pham';
    if (auctionRoute) return 'Chi tiet auction';
    if (sellerStoreRoute) return 'Gian hang nguoi ban';
    if (orderRoute) return 'Chi tiet order';
    if (escrowRoute) return 'Chi tiet escrow';
    if (pathname === '/login') return 'Dang nhap';
    if (pathname === '/register') return 'Dang ky';
    if (pathname === '/account') return 'Tai khoan';
    if (pathname.startsWith('/messages')) return 'Tin nhan';
    if (pathname.startsWith('/sell/products/create')) return 'Tao san pham';
    if (pathname.startsWith('/sell/products')) return 'Quan ly san pham';
    if (pathname.startsWith('/sell/auctions/create')) return 'Tao auction';
    if (pathname.startsWith('/sell/auctions')) return 'Quan ly auction';
    if (pathname.startsWith('/admin/products/create')) return 'Admin tao san pham';
    if (pathname.startsWith('/admin/products')) return 'Admin san pham';
    if (pathname.startsWith('/admin/categories')) return 'Admin danh muc';
    if (pathname.startsWith('/admin/users')) return 'Admin nguoi dung';
    if (pathname.startsWith('/admin/orders')) return 'Admin van hanh';
    if (pathname.startsWith('/admin/imports')) return 'Admin import';
    if (pathname.startsWith('/admin')) return 'Admin dashboard';
    if (pathname === '/upload-lab') return 'Upload lab';
    if (pathname === '/docs') return 'API docs';
    return 'Marketplace';
  }, [auctionRoute, escrowRoute, orderRoute, pathname, productRoute, sellerStoreRoute]);

  const renderAuthRequired = (content, title = 'Can dang nhap') => {
    if (user) return content;
    return (
      <SectionCard title={title} subtitle="Auth required" className="wide">
        <p className="muted">Hay dang nhap hoac dang ky de truy cap chuc nang nay.</p>
        <div className="actions-row">
          <AppLink to="/login" className="route-pill">
            Dang nhap
          </AppLink>
          <AppLink to="/register" className="route-pill">
            Dang ky
          </AppLink>
        </div>
      </SectionCard>
    );
  };

  const renderRoute = () => {
    if (pathname === '/login') {
      return (
        <LoginPage loginForm={loginForm} setLoginForm={setLoginForm} onSubmit={(event) => run(() => handleLogin(event))} />
      );
    }
    if (pathname === '/register') {
      return (
        <RegisterPage
          registerForm={registerForm}
          setRegisterForm={setRegisterForm}
          onSubmit={(event) => run(() => handleRegister(event))}
        />
      );
    }
    if (pathname === '/') {
      return <HomePage {...commonCatalogProps} />;
    }
    if (productRoute) {
      return <ProductDetailPage {...commonCatalogProps} />;
    }
    if (auctionRoute) {
      return (
        <AuctionDetailPage
          selectedAuctionDetail={selectedAuctionDetail}
          user={user}
          isAdmin={isAdmin}
          onPlaceBidForAuction={(auctionId) => run(() => handlePlaceBidForAuction(auctionId))}
          onCloseAuction={(auctionId) => run(() => handleCloseAuction(auctionId))}
          onEditAuction={handleEditAuction}
        />
      );
    }
    if (sellerStoreRoute) {
      return (
        <SellerStorePage
          sellerProfile={sellerProfile}
          sellerProducts={sellerStoreProducts}
          sellerStoreMeta={sellerStoreMeta}
          onSelectProduct={selectProduct}
          sellerStoreTab={sellerStoreTab}
          onSellerStoreTabChange={handleSellerStoreTabChange}
          isSellerStoreLoading={isSellerStoreLoading}
        />
      );
    }
    if (orderRoute) {
      return renderAuthRequired(
        <OrderDetailPage
          selectedOrder={selectedOrder}
          onUpdateOrderStatus={(orderId, status) => run(() => handleUpdateOrderStatus(orderId, status))}
          onDeleteOrder={(orderId) => run(() => handleDeleteOrder(orderId))}
        />,
        'Chi tiet order'
      );
    }
    if (escrowRoute) {
      return renderAuthRequired(
        <EscrowDetailPage
          selectedEscrow={selectedEscrow}
          onEscrowAction={(escrowId, action) => run(() => handleEscrowAction(escrowId, action))}
        />,
        'Chi tiet escrow'
      );
    }
    if (pathname === '/account') {
      return renderAuthRequired(<AccountPage {...commonAccountProps} />, 'Tai khoan');
    }
    if (pathname === '/messages' || messageRoute) {
      return renderAuthRequired(<MessagesPage {...commonChatProps} />, 'Tin nhan');
    }
    if (pathname === '/sell/products') {
      return renderAuthRequired(<SellerProductsPage {...commonSellerProps} />, 'Quan ly listing');
    }
    if (pathname === '/sell/products/create' || sellerEditRoute) {
      return renderAuthRequired(<SellerProductFormPage {...commonSellerProps} />, 'Tao hoac sua listing');
    }
    if (pathname === '/sell/auctions') {
      return renderAuthRequired(<SellerAuctionsPage {...commonSellerProps} />, 'Quan ly auction');
    }
    if (pathname === '/sell/auctions/create') {
      return renderAuthRequired(<SellerAuctionFormPage {...commonSellerProps} />, 'Tao hoac sua auction');
    }
    if (pathname === '/upload-lab') {
      return renderAuthRequired(<UploadLabPage {...commonUploadProps} />, 'Upload lab');
    }
    if (pathname === '/admin') {
      return <AdminDashboardPage {...commonAdminProps} />;
    }
    if (pathname === '/admin/users') {
      return <AdminUsersPage {...commonAdminProps} />;
    }
    if (pathname === '/admin/categories') {
      return <AdminCategoriesPage {...commonAdminProps} />;
    }
    if (pathname === '/admin/products') {
      return <AdminProductsPage {...commonAdminProps} />;
    }
    if (
      pathname === '/admin/products/create' ||
      pathname === '/admin/product/create' ||
      adminEditRoute
    ) {
      return <AdminProductFormPage {...commonSellerProps} />;
    }
    if (pathname === '/admin/orders') {
      return <AdminOrdersPage {...commonAdminProps} />;
    }
    if (pathname === '/admin/imports') {
      return <AdminImportsPage {...commonAdminProps} />;
    }
    if (pathname === '/docs') {
      return <DocsPage />;
    }
    return (
      <SectionCard title="Khong tim thay trang" subtitle="404" className="wide">
        <p className="muted">Route nay chua duoc map. Hay quay ve trang chu hoac khu quan tri.</p>
        <div className="actions-row">
          <AppLink to="/" className="route-pill">
            Ve trang chu
          </AppLink>
          <AppLink to="/admin" className="route-pill">
            Ve admin
          </AppLink>
        </div>
      </SectionCard>
    );
  };

  return (
    <div className="site-shell">
      <header className="site-header">
        <div className="site-header__inner">
          <div className="site-header__brand">
            <AppLink to="/" className="brand-link">
              ChoMarket
            </AppLink>
            <span className="muted">Mua ban do cu, chat truc tiep, auction va escrow</span>
          </div>
          {headerSearchVisible ? (
            <form className="site-search" onSubmit={handleHeaderSearch}>
              <input
                value={filters.q}
                onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))}
                placeholder="Tim dien thoai, xe, do gia dung..."
              />
              <button type="submit" className="primary-btn">Tim</button>
            </form>
          ) : null}
          <div className="site-header__right">
            <nav className="site-nav">
              {mainNav
                .filter((item) => !item.requiresAuth || user)
                .filter((item) => !item.requiresAdmin || isAdmin)
                .map((item) => {
                  const isActive = item.to === '/'
                    ? homeRoute
                    : item.to === '/messages'
                      ? messagesRoute
                      : item.to === '/account'
                        ? accountRoute
                        : item.to === '/upload-lab'
                          ? uploadRoute
                          : item.to === '/docs'
                            ? docsRoute
                            : item.to === '/admin'
                              ? adminRoute
                              : item.to === '/sell/products'
                                ? sellerRoute
                                : pathname.startsWith(item.to);
                  return (
                    <AppLink
                      key={item.to}
                      to={item.to}
                      className={`site-nav__link${isActive ? ' active' : ''}`}
                    >
                      {item.label}
                    </AppLink>
                  );
                })}
              {!user ? (
                <>
                  <AppLink
                    to="/login"
                    className={`site-nav__link${pathname === '/login' ? ' active' : ''}`}
                  >
                    Dang nhap
                  </AppLink>
                  <AppLink
                    to="/register"
                    className={`site-nav__link${pathname === '/register' ? ' active' : ''}`}
                  >
                    Dang ky
                  </AppLink>
                </>
              ) : (
                <button type="button" onClick={() => run(handleLogout)}>
                  Dang xuat
                </button>
              )}
            </nav>
          </div>
        </div>
      </header>

      <main className="site-main">
        <SectionCard
          title={currentPageLabel}
          subtitle="Route-based React frontend"
          className="wide"
          actions={
            <div className="actions-row wrap">
              {user ? <span className="route-pill">{user.fullName || user.username}</span> : null}
              <span className="route-pill">Roles: {roleNames(user?.roles || [])}</span>
              <span className="route-pill">Socket: {socketState}</span>
              <span className="route-pill">{pathname}</span>
            </div>
          }
        >
          <p className="muted">{notice}</p>
        </SectionCard>

        {sellerRoute ? (
          <SectionCard title="Seller routes" subtitle="Tung chuc nang nam o page rieng" className="wide">
            <div className="actions-row wrap">
              <AppLink to="/sell/products" className="route-pill">
                /sell/products
              </AppLink>
              <AppLink to="/sell/products/create" className="route-pill">
                /sell/products/create
              </AppLink>
              <AppLink to="/sell/auctions" className="route-pill">
                /sell/auctions
              </AppLink>
              <AppLink to="/sell/auctions/create" className="route-pill">
                /sell/auctions/create
              </AppLink>
            </div>
          </SectionCard>
        ) : null}

        {adminRoute ? (
          <SectionCard title="Admin routes" subtitle="CRUD rieng cho admin" className="wide">
            <div className="actions-row wrap">
              <AppLink to="/admin" className="route-pill">
                /admin
              </AppLink>
              <AppLink to="/admin/users" className="route-pill">
                /admin/users
              </AppLink>
              <AppLink to="/admin/categories" className="route-pill">
                /admin/categories
              </AppLink>
              <AppLink to="/admin/products" className="route-pill">
                /admin/products
              </AppLink>
              <AppLink to="/admin/products/create" className="route-pill">
                /admin/products/create
              </AppLink>
              <AppLink to="/admin/orders" className="route-pill">
                /admin/orders
              </AppLink>
              <AppLink to="/admin/imports" className="route-pill">
                /admin/imports
              </AppLink>
            </div>
          </SectionCard>
        ) : null}

        {renderRoute()}
      </main>

      <footer className="site-footer">
        <div className="site-footer__inner">
          <span>Marketplace demo theo flow Chotot/Mercari: xem san pham, chat nguoi ban, tao order, auction, escrow, admin CRUD.</span>
          <div className="actions-row wrap">
            <a href="/docs.html" target="_blank" rel="noreferrer">
              Docs cu
            </a>
            <a href="/legacy-marketplace" target="_blank" rel="noreferrer">
              HTML cu
            </a>
            <a href="/admin.html" target="_blank" rel="noreferrer">
              Admin HTML cu
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
