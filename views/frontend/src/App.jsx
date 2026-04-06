import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import LoginPage from './features/auth/LoginPage';
import RegisterPage from './features/auth/RegisterPage';
import HomePage from './features/marketplace/HomePage';
import ProductDetailPage from './features/marketplace/ProductDetailPage';
import SellerStorePage from './features/marketplace/SellerStorePage';
import AuctionDetailPage from './features/marketplace/AuctionDetailPage';
import AccountPage from './features/account/AccountPage';
import NotificationsPage from './features/notifications/NotificationsPage';
import OrdersPage from './features/account/OrdersPage';
import OrderDetailPage from './features/account/OrderDetailPage';
import EscrowDetailPage from './features/account/EscrowDetailPage';
import WalletPage from './features/account/WalletPage';
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
import AdminWalletsPage from './features/admin/AdminWalletsPage';
import AdminImportsPage from './features/admin/AdminImportsPage';
import AdminProductFormPage from './features/admin/AdminProductFormPage';
import DocsPage from './features/docs/DocsPage';
import SectionCard from './shared/SectionCard';
import AppLink from './shared/AppLink';
import { api } from '@frontend-utils/api';
import {
  clearRememberedIdentifier,
  clearStoredToken,
  getRememberedIdentifier,
  getStoredToken,
  setRememberedIdentifier,
  setStoredToken,
} from '@frontend-utils/auth';
import { compactText, formatDateTime, normalizeTags, roleNames } from '@frontend-utils/format';
import { matchPath, navigateTo } from '@frontend-utils/router';
import { useRealtimeChat } from '@frontend-utils/useRealtimeChat';

const PASSWORD_RULE_TEXT =
  'Mat khau phai co it nhat 8 ky tu, gom chu hoa, chu thuong, so va ky tu dac biet.';
const isStrongPassword = (value = '') =>
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(value);
const USERNAME_RULE = /^[a-z0-9_-]{3,30}$/i;
const PHONE_RULE = /^(\+84|0)\d{8,10}$/;
const toSlug = (value = '') =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
const createLoginForm = (identifier = getRememberedIdentifier()) => ({
  identifier,
  password: '',
});
const createRegisterForm = () => ({
  username: '',
  email: '',
  fullName: '',
  phone: '',
  password: '',
  confirmPassword: '',
  roles: ['user'],
});
const createAddressForm = (user = null) => ({
  label: 'home',
  fullName: user?.fullName || '',
  phone: user?.phone || '',
  province: '',
  district: '',
  ward: '',
  street: '',
  fullAddress: '',
  postalCode: '',
  isDefault: false,
});
const mapAddressToOrderShipping = (address) => ({
  fullName: address?.fullName || '',
  phone: address?.phone || '',
  province: address?.province || '',
  district: address?.district || '',
  ward: address?.ward || '',
  address: address?.fullAddress || address?.address || address?.street || '',
  city: address?.city || address?.province || '',
  zipCode: address?.postalCode || address?.zipCode || '',
});

const empty = {
  filters: { q: '', categoryId: '', saleType: '', minPrice: '', maxPrice: '', sort: '' },
  product: {
    categoryId: '',
    title: '',
    description: 'Sản phẩm mới được tạo từ frontend React.',
    saleType: 'fixed_price',
    price: '100000',
    inventory: '1',
    condition: 'good',
    status: 'active',
    isNegotiable: false,
    fulfillmentType: 'both',
    addressText: '',
    region: '',
    city: '',
    province: '',
    district: '',
    ward: '',
    tags: '',
    images: [],
    thumbnailImage: '',
  },
  auction: {
    id: '',
    productId: '',
    startAt: '',
    endAt: '',
    startingBid: '100000',
    currentBid: '',
    bidStep: '10000',
    status: 'scheduled',
  },
  profile: { fullName: '', phone: '', avatarUrl: '', bio: '', roles: ['user'] },
  address: createAddressForm(),
  review: { orderId: '', score: '5', comment: '', isVisible: true },
  upload: { ownerType: 'product', ownerId: '', remoteUrl: '' },
  category: {
    name: '',
    slug: '',
    description: '',
    icon: '',
    parentCategory: '',
    sortOrder: '0',
    isActive: true,
    source: 'manual',
  },
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
const hasAnyUserRole = (member, allowedRoles = []) => {
  const roleSet = new Set((member?.roles || []).map((role) => role?.name || role));
  return allowedRoles.some((role) => roleSet.has(role));
};
const mapProductToForm = (product) => ({
  categoryId: product.category?._id || product.category || '',
  title: product.title || '',
  description: product.description || '',
  saleType: product.saleType || 'fixed_price',
  price: String(product.price || ''),
  inventory: String(product.inventory ?? 1),
  condition: product.condition || 'good',
  status: product.status || 'active',
  isNegotiable: Boolean(product.isNegotiable ?? product.negotiable),
  fulfillmentType: product.fulfillmentType || 'both',
  addressText: product.addressText || '',
  region: product.region || product.province || '',
  city: product.city || product.province || '',
  province: product.province || product.city || '',
  district: product.district || '',
  ward: product.ward || '',
  tags: (product.tags || []).join(', '),
  images: product.images || [],
  thumbnailImage: product.thumbnailImage || '',
});
const mapAuctionToForm = (auction) => ({
  id: auction._id,
  productId: auction.product?._id || auction.product || '',
  startAt: toLocal(auction.startAt),
  endAt: toLocal(auction.endAt),
  startingBid: String(auction.startingBid || ''),
  currentBid: String(auction.currentBid || ''),
  bidStep: String(auction.bidStep || '10000'),
  status: auction.status || 'scheduled',
});
const mapProfileToForm = (member) => ({
  fullName: member?.fullName || '',
  phone: member?.phone || '',
  avatarUrl: member?.avatarUrl || '',
  bio: member?.bio || '',
  roles: (member?.roles || []).map((role) => role?.name || role).filter((role) => ['user', 'admin'].includes(role)),
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
    reader.onerror = () => reject(new Error('Không thể đọc file base64.'));
    reader.readAsDataURL(file);
  });

const parseCatalogSearch = (search = '') => {
  const params = new URLSearchParams(search);
  return {
    filters: {
      q: params.get('q') || '',
      categoryId: params.get('categoryId') || '',
      saleType: params.get('saleType') || '',
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
    'Sẵn sàng đăng nhập, tìm kiếm sản phẩm, trò chuyện và giao dịch.'
  );
  const [filters, setFilters] = useState(initialCatalogState.filters);
  const [catalogPage, setCatalogPage] = useState(initialCatalogState.page);
  const [catalogMeta, setCatalogMeta] = useState(null);
  const [isCatalogLoading, setIsCatalogLoading] = useState(false);
  const [loginForm, setLoginForm] = useState(() => createLoginForm());
  const [registerForm, setRegisterForm] = useState(() => createRegisterForm());
  const [rememberAccount, setRememberAccount] = useState(() => Boolean(getRememberedIdentifier()));
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showRegisterConfirmPassword, setShowRegisterConfirmPassword] = useState(false);
  const [categories, setCategories] = useState([]);
  const [adminCategories, setAdminCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [adminProducts, setAdminProducts] = useState([]);
  const [auctions, setAuctions] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedAuction, setSelectedAuction] = useState(null);
  const [selectedProductReviews, setSelectedProductReviews] = useState([]);
  const [sellerProducts, setSellerProducts] = useState([]);
  const [productForm, setProductForm] = useState(empty.product);
  const [editingProductId, setEditingProductId] = useState('');
  const [productFiles, setProductFiles] = useState([]);
  const [auctionForm, setAuctionForm] = useState(empty.auction);
  const [orders, setOrders] = useState([]);
  const [adminOrders, setAdminOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [escrows, setEscrows] = useState([]);
  const [selectedEscrow, setSelectedEscrow] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [profileForm, setProfileForm] = useState(empty.profile);
  const [addresses, setAddresses] = useState([]);
  const [addressForm, setAddressForm] = useState(empty.address);
  const [addressEditId, setAddressEditId] = useState('');
  const [walletTopUpForm, setWalletTopUpForm] = useState({ amount: '500000' });
  const [walletTransactions, setWalletTransactions] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [adminWalletUsers, setAdminWalletUsers] = useState([]);
  const [adminWalletTransactions, setAdminWalletTransactions] = useState([]);
  const [walletAdminForm, setWalletAdminForm] = useState({
    userId: '',
    amount: '500000',
    description: 'Nạp ví từ admin',
  });
  const [adminWalletUserId, setAdminWalletUserId] = useState('');
  const [pendingCheckoutProductId, setPendingCheckoutProductId] = useState('');
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
  const [bidDialog, setBidDialog] = useState({
    open: false,
    auctionId: '',
    title: '',
    currentBid: 0,
    bidStep: 10000,
    amount: '',
  });
  const typingRef = useRef(null);

  const fail = useCallback((error) => {
    const message = error?.message || 'Co loi xay ra trong frontend React.';
    if (/session expired|authentication required|token expired|invalid token/i.test(message)) {
      clearStoredToken();
      setToken('');
      setUser(null);
    }
    setNotice(message);
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

  useEffect(() => {
    setNotificationOpen(false);
  }, [pathname]);

  const isAdmin = useMemo(() => hasAnyUserRole(user, ['admin']), [user]);
  const canSell = useMemo(() => Boolean(user), [user]);
  const activeConversation = useMemo(
    () => conversations.find((item) => item._id === activeConversationId) || null,
    [conversations, activeConversationId]
  );
  const unreadNotificationCount = useMemo(
    () => notifications.filter((item) => !item.isRead).length,
    [notifications]
  );
  const recentNotifications = useMemo(() => notifications.slice(0, 6), [notifications]);
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

  const handleNotificationCreated = useCallback((payload) => {
    if (!payload?._id) return;
    setNotifications((current) => {
      const next = [payload, ...current.filter((item) => String(item._id) !== String(payload._id))];
      return next.slice(0, 100);
    });
    const title = payload.title || 'Thông báo';
    const message = payload.message || '';
    setNotice(message ? `${title}: ${message}` : title);
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
  const routeProductId = productRoute?.productId || '';
  const routeAuctionId = auctionRoute?.auctionId || '';
  const routeSellerUserId = sellerStoreRoute?.userId || '';
  const routeOrderId = orderRoute?.orderId || '';
  const routeEscrowId = escrowRoute?.escrowId || '';
  const routeConversationId = messageRoute?.conversationId || '';
  const routeEditProductId = editRoute?.productId || '';

  const messagesRoute = pathname === '/messages' || Boolean(routeConversationId);
  const accountRoute = pathname === '/account';
  const walletRoute = pathname === '/wallet';
  const notificationsRoute = pathname === '/notifications';
  const ordersRoute = pathname === '/orders' || Boolean(routeOrderId);
  const adminRoute = pathname.startsWith('/admin');
  const docsRoute = pathname === '/docs';
  const homeRoute = pathname === '/' || Boolean(routeProductId);
  const sellerRoute = pathname.startsWith('/sell');
  const headerSearchVisible =
    homeRoute || pathname === '/messages' || pathname === '/account' || pathname === '/orders' || pathname === '/wallet';

  const resetProductForm = useCallback(() => {
    setProductForm(empty.product);
    setEditingProductId('');
    setProductFiles([]);
  }, []);

  const resetAuctionForm = useCallback(() => {
    setAuctionForm(empty.auction);
  }, []);

  const resetAddressForm = useCallback(() => {
    setAddressForm(createAddressForm(user));
    setAddressEditId('');
  }, [user]);

  const focusAddressSection = useCallback(() => {
    window.setTimeout(() => {
      document.getElementById('dia-chi-giao-hang')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 80);
  }, []);

  const resetCategoryForm = useCallback(() => {
    setCategoryForm(empty.category);
    setCategoryEditId('');
  }, []);

  const closeBidDialog = useCallback(() => {
    setBidDialog({
      open: false,
      auctionId: '',
      title: '',
      currentBid: 0,
      bidStep: 10000,
      amount: '',
    });
  }, []);

  const openBidDialog = useCallback((auction, title = '') => {
    if (!auction?._id) return;
    const currentBid = Number(auction.currentBid || auction.startingBid || 0);
    const bidStep = Number(auction.bidStep || 10000);
    setBidDialog({
      open: true,
      auctionId: auction._id,
      title: title || auction.product?.title || 'Phiên đấu giá',
      currentBid,
      bidStep,
      amount: String(currentBid + bidStep),
    });
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
      setAdminOrders([]);
      setEscrows([]);
      setReviews([]);
      setConversations([]);
      setWalletTransactions([]);
      setNotifications([]);
      return;
    }

    const [
      addressesPayload,
      ordersPayload,
      reviewsPayload,
      conversationsPayload,
      walletTransactionsPayload,
      notificationsPayload,
    ] =
      await Promise.allSettled([
        api.addresses(),
        api.orders({ scope: 'mine' }),
        api.reviews(),
        api.conversations(),
        api.walletTransactions(),
        api.notifications(),
      ]);

    if (addressesPayload.status === 'fulfilled') {
      setAddresses(addressesPayload.value.data || []);
    }
    if (ordersPayload.status === 'fulfilled') {
      setOrders(ordersPayload.value.data || []);
    }
    if (reviewsPayload.status === 'fulfilled') {
      setReviews(reviewsPayload.value.data || []);
    }
    if (conversationsPayload.status === 'fulfilled') {
      setConversations(conversationsPayload.value.data || []);
    }
    if (walletTransactionsPayload.status === 'fulfilled') {
      setWalletTransactions(walletTransactionsPayload.value.data || []);
    }
    if (notificationsPayload.status === 'fulfilled') {
      setNotifications(notificationsPayload.value.data || []);
    }
  }, [token]);

  const loadAdmin = useCallback(async () => {
    if (!isAdmin) {
      setUsers([]);
      setImportBatches([]);
      setAdminProducts([]);
      setAdminCategories([]);
      setAdminOrders([]);
      setAdminWalletUsers([]);
      setAdminWalletTransactions([]);
      return;
    }

    const [
      importPayload,
      productsPayload,
      usersPayload,
      categoriesPayload,
      ordersPayload,
      walletUsersPayload,
      walletTransactionsPayload,
    ] = await Promise.all([
      api.importBatches(),
      api.products({ limit: 80 }),
      api.users(),
      api.categories({}),
      api.orders({ scope: 'all' }),
      api.adminWalletUsers(),
      api.adminWalletTransactions(adminWalletUserId ? { userId: adminWalletUserId } : {}),
    ]);

    setUsers(usersPayload.data || []);
    setImportBatches(importPayload.data || []);
    setAdminProducts(productsPayload.data || []);
    setAdminCategories(categoriesPayload.data || []);
    setAdminOrders(ordersPayload.data || []);
    setAdminWalletUsers(walletUsersPayload.data || []);
    setAdminWalletTransactions(walletTransactionsPayload.data || []);
  }, [adminWalletUserId, isAdmin]);

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
    if (!rememberAccount) {
      clearRememberedIdentifier();
    }
  }, [rememberAccount]);

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
    if (!user || addressEditId) return;
    setAddressForm((current) => ({
      ...current,
      fullName: user.fullName || '',
      phone: user.phone || '',
    }));
  }, [addressEditId, user]);

  useEffect(() => {
    if (!routeProductId) {
      if (pathname === '/') {
        setSelectedProduct(null);
        setSelectedProductReviews([]);
      }
      return;
    }
    run(() => loadProductDetail(routeProductId));
  }, [loadProductDetail, pathname, routeProductId, run]);

  useEffect(() => {
    if (!routeSellerUserId) {
      setSellerProfile(null);
      setSellerStoreProducts([]);
      setSellerStoreMeta(null);
      return;
    }
    run(() => loadSellerStore(routeSellerUserId));
  }, [loadSellerStore, routeSellerUserId, run, sellerStoreTab]);

  useEffect(() => {
    if (!routeOrderId) {
      if (pathname !== '/account' && pathname !== '/orders') setSelectedOrder(null);
      return;
    }
    if (!token) return;
    run(() => loadOrderDetail(routeOrderId));
  }, [loadOrderDetail, pathname, routeOrderId, run, token]);

  useEffect(() => {
    if (!routeEscrowId) {
      setSelectedEscrow(null);
      return;
    }
    if (!token) return;
    run(() => loadEscrowDetail(routeEscrowId));
  }, [loadEscrowDetail, routeEscrowId, run, token]);

  useEffect(() => {
    if (!routeAuctionId) {
      setSelectedAuctionDetail(null);
      return;
    }
    run(() => loadAuctionDetail(routeAuctionId));
  }, [loadAuctionDetail, routeAuctionId, run]);

  useEffect(() => {
    if (!routeConversationId) {
      if (pathname === '/messages') {
        setActiveConversationId('');
        setMessages([]);
        setReplyTo(null);
      }
      return;
    }
    if (activeConversationId !== routeConversationId) {
      setActiveConversationId(routeConversationId);
    }
  }, [activeConversationId, pathname, routeConversationId]);

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
    if (routeEditProductId) {
      run(async () => {
        const payload = await api.product(routeEditProductId);
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
  }, [pathname, resetProductForm, routeEditProductId, run]);

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
      const label = fullName || username || 'Người dùng';
      setTypingNames((current) => {
        const next = new Set(current);
        if (isTyping) next.add(label);
        else next.delete(label);
        return [...next];
      });
    },
    onNotification: handleNotificationCreated,
  });
  const [notificationOpen, setNotificationOpen] = useState(false);

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
      if (routeSellerUserId) {
        const query = tab === 'active' ? '' : `?tab=${tab}`;
        navigateTo(`/users/${routeSellerUserId}${query}`);
      }
    },
    [routeSellerUserId]
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
      const identifier = `${loginForm.identifier || ''}`.trim();
      if (!identifier || !loginForm.password) {
        setNotice('Vui long nhap tai khoan va mat khau.');
        return;
      }
      const payload = await api.login({ identifier, password: loginForm.password });
      if (rememberAccount) {
        setRememberedIdentifier(identifier);
      } else {
        clearRememberedIdentifier();
      }
      setStoredToken(payload.data.accessToken);
      setToken(payload.data.accessToken);
      setUser(payload.data.user);
      setProfileForm(mapProfileToForm(payload.data.user));
      setLoginForm(createLoginForm(identifier));
      setShowLoginPassword(false);
      navigateTo('/');
      setNotice(`Da tao tai khoan ${payload.data.user.fullName || payload.data.user.username}.`);
    },
    [loginForm, rememberAccount]
  );

  const handleRegister = useCallback(
    async (event) => {
      event.preventDefault();
      const username = `${registerForm.username || ''}`.trim();
      const email = `${registerForm.email || ''}`.trim();
      const fullName = `${registerForm.fullName || ''}`.trim();
      const phone = `${registerForm.phone || ''}`.trim();
      const password = `${registerForm.password || ''}`;
      const confirmPassword = `${registerForm.confirmPassword || ''}`;
      if (!username || !email || !fullName || !password || !confirmPassword) {
        setNotice('Vui long nhap du username, email, ho ten va hai muc mat khau.');
        return;
      }
      if (!USERNAME_RULE.test(username)) {
        setNotice('Username chi nen gom chu, so, gach duoi hoac gach ngang.');
        return;
      }
      if (phone && !PHONE_RULE.test(phone)) {
        setNotice('So dien thoai chua dung dinh dang.');
        return;
      }
      if (password !== confirmPassword) {
        setNotice('Mat khau nhap lai chua khop.');
        return;
      }
      if (!isStrongPassword(password)) {
        setNotice(PASSWORD_RULE_TEXT);
        return;
      }
      const payload = await api.register({
        username,
        email,
        fullName,
        phone,
        password,
      });
      setStoredToken(payload.data.accessToken);
      setToken(payload.data.accessToken);
      setUser(payload.data.user);
      setProfileForm(mapProfileToForm(payload.data.user));
      setRegisterForm(createRegisterForm());
      setShowRegisterPassword(false);
      setShowRegisterConfirmPassword(false);
      setLoginForm(createLoginForm(email || username));
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
    setLoginForm(createLoginForm());
    setRememberAccount(Boolean(getRememberedIdentifier()));
    setShowLoginPassword(false);
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
      const payload = await api.updateMyProfile(profileForm);
      setUser(payload.data);
      setProfileForm(mapProfileToForm(payload.data));
      setNotice('Da cap nhat ho so.');
    },
    [profileForm]
  );

  const handleTopUpWallet = useCallback(
    async (event) => {
      event.preventDefault();
      const amount = Number(walletTopUpForm.amount || 0);
      if (amount < 10000) {
        setNotice('Vui lòng nhập số tiền nạp từ 10.000 VND trở lên.');
        return;
      }
      const momoPayload = await api.momoTopUpWallet({ amount });
      const payUrl = momoPayload?.data?.payUrl;
      if (!payUrl) {
        setNotice('Không lấy được liên kết thanh toán MoMo. Vui lòng thử lại.');
        return;
      }
      setWalletTopUpForm({ amount: '500000' });
      window.location.href = payUrl;
    },
    [walletTopUpForm]
  );

  const handleAdminTopUpWallet = useCallback(
    async (event) => {
      event.preventDefault();
      if (!walletAdminForm.userId) {
        setNotice('Vui lòng chọn người dùng cần nạp ví.');
        return;
      }
      await api.adminTopUpWallet({
        userId: walletAdminForm.userId,
        amount: Number(walletAdminForm.amount || 0),
        description: walletAdminForm.description || 'Nạp ví từ admin',
      });
      await loadAdmin();
      setWalletAdminForm((current) => ({ ...current, amount: '500000' }));
      setNotice('Đã nạp ví cho người dùng.');
    },
    [loadAdmin, walletAdminForm]
  );

  const handleSaveAddress = useCallback(
    async (event) => {
      event.preventDefault();
      if (!user?._id) return;
      const fullName = `${addressForm.fullName || ''}`.trim();
      const phone = `${addressForm.phone || ''}`.trim();
      const province = `${addressForm.province || ''}`.trim();
      const district = `${addressForm.district || ''}`.trim();
      const ward = `${addressForm.ward || ''}`.trim();
      const street = `${addressForm.street || ''}`.trim();
      const fullAddress = [street, ward, district, province].filter(Boolean).join(', ');
      if (!fullName || !phone || !province || !district || !street) {
        setNotice('Vui long nhap nguoi nhan, so dien thoai, tinh/thanh, quan/huyen va dia chi chi tiet.');
        return;
      }
      if (!PHONE_RULE.test(phone)) {
        setNotice('So dien thoai chua dung dinh dang.');
        return;
      }
      const payload = {
        ...addressForm,
        label: addressForm.label || 'home',
        fullName,
        phone,
        province,
        district,
        ward,
        street,
        fullAddress,
        postalCode: '',
      };
      let savedAddress = null;
      if (addressEditId) {
        const response = await api.updateAddress(addressEditId, payload);
        savedAddress = response.data || { _id: addressEditId, ...payload };
        setNotice('Da cap nhat dia chi.');
      } else {
        const response = await api.createAddress(payload);
        savedAddress = response.data || payload;
        setNotice('Da tao dia chi moi.');
      }
      resetAddressForm();
      await loadPrivate();
      if (pendingCheckoutProductId && savedAddress) {
        const orderResponse = await api.createOrder({
          productId: pendingCheckoutProductId,
          quantity: 1,
          paymentType: 'wallet',
          shippingMethod: 'delivery',
          shippingFee: 30000,
          platformFee: 20000,
          shippingAddressId: savedAddress._id,
          shippingAddress: mapAddressToOrderShipping(savedAddress),
          status: 'negotiating',
        });
        const createdOrder = orderResponse?.data?.order || null;
        const createdOrderItem = orderResponse?.data?.orderItem || null;
        const orderId = orderResponse?.data?.order?._id;
        setPendingCheckoutProductId('');
        if (createdOrder) {
          setOrders((current) => uniq([createdOrder, ...current]));
          setSelectedOrder({ order: createdOrder, items: createdOrderItem ? [createdOrderItem] : [] });
        }
        await loadPrivate();
        if (orderId) {
          await loadOrderDetail(orderId);
          navigateTo('/orders');
          setNotice('Da luu dia chi va tao don hang cho xac nhan.');
        }
      }
    },
    [
      addressEditId,
      addressForm,
      loadOrderDetail,
      loadPrivate,
      pendingCheckoutProductId,
      resetAddressForm,
      user,
    ]
  );

  const handleEditAddress = useCallback((address) => {
    setAddressEditId(address._id);
    setAddressForm({
      label: address.label || 'home',
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
      const profilePayload = await api.me().catch(() => null);
      if (profilePayload?.data) {
        setUser(profilePayload.data);
      }
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
        if (routeOrderId === orderId) {
          navigateTo('/orders');
        }
      }
      await loadPrivate();
      setNotice('Da xoa don hang.');
    },
    [loadPrivate, routeOrderId, selectedOrder]
  );

  const handleAttachShippingAddress = useCallback(
    async (orderId, addressId) => {
      const address = addresses.find((item) => String(item._id) === String(addressId));
      if (!address) return;
      await api.updateOrderStatus(orderId, {
        shippingAddressId: address._id,
        shippingAddress: mapAddressToOrderShipping(address),
        shippingMethod: 'delivery',
      });
      await loadPrivate();
      if (selectedOrder?.order?._id === orderId) {
        await loadOrderDetail(orderId);
      }
      setNotice('Da gan dia chi giao hang cho don.');
    },
    [addresses, loadOrderDetail, loadPrivate, selectedOrder]
  );

  const handleEscrowAction = useCallback(
    async (escrowId, action) => {
      const reason = window.prompt(`Nhap ghi chu cho ${action}`, `${action} tu frontend React`) || '';
      await api.updateEscrow(escrowId, action, { reason, notes: reason });
      await loadPrivate();
      const profilePayload = await api.me().catch(() => null);
      if (profilePayload?.data) {
        setUser(profilePayload.data);
      }
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
      if (routeProductId) await loadProductDetail(routeProductId);
      setNotice('Da cap nhat hien thi review.');
    },
    [loadPrivate, loadProductDetail, routeProductId]
  );

  const handleSaveProduct = useCallback(
    async (event) => {
      event.preventDefault();
      const failProduct = (message) => {
        setNotice(message);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      };
      const title = `${productForm.title || ''}`.trim();
      const description = `${productForm.description || ''}`.trim();
      const region = `${productForm.region || ''}`.trim();
      const city = `${productForm.city || productForm.province || ''}`.trim();
      const price = toNumber(productForm.price);
      const inventory = toNumber(productForm.inventory);
      const hasExistingImages =
        Array.isArray(productForm.images) && productForm.images.filter(Boolean).length > 0;
      if (!productForm.categoryId) {
        failProduct('Vui long chon danh muc cho listing.');
        return;
      }
      if (!title || title.length < 5) {
        failProduct('Tieu de listing can it nhat 5 ky tu.');
        return;
      }
      if (!description || description.length < 10) {
        failProduct('Mô tả sản phẩm cần rõ hơn, tối thiểu 10 ký tự.');
        return;
      }
      if (price === undefined || price < 0) {
        failProduct('Giá sản phẩm không hợp lệ.');
        return;
      }
      if (inventory === undefined || inventory < 0) {
        failProduct('Số lượng tồn kho không hợp lệ.');
        return;
      }
      if (!productForm.condition) {
        failProduct('Vui long chon tinh trang san pham.');
        return;
      }
      if (!region || !city) {
        failProduct('Vui long nhap day du khu vuc va tinh/thanh pho.');
        return;
      }
      if (!editingProductId && !productFiles.length) {
        failProduct('Listing moi can it nhat 1 anh.');
        return;
      }
      if (editingProductId && !productFiles.length && !hasExistingImages) {
        failProduct('Listing can co it nhat 1 anh.');
        return;
      }
      const payload = {
        ...productForm,
        title,
        description,
        saleType: 'fixed_price',
        price,
        inventory,
        region,
        city,
        province: city,
        status: productForm.status || 'active',
        categoryId: productForm.categoryId,
        tags: normalizeTags(productForm.tags),
      };

      const response = editingProductId
        ? await api.updateProduct(editingProductId, payload)
        : await api.createProduct(payload);

      const productId = response.data?._id || editingProductId;
      if (productFiles.length && productId) {
        const formData = new FormData();
        formData.append('ownerType', 'product');
        formData.append('ownerId', productId);
        productFiles.forEach((file) => formData.append('files', file));
        appendMedia(await api.uploadMany(formData));
      }

      await refreshAll();
      resetProductForm();
      const target = adminRoute ? '/admin/products' : '/sell/products';
      navigateTo(target);
      setNotice(editingProductId ? 'Da cap nhat listing.' : 'Da tao listing moi.');
    },
    [adminRoute, appendMedia, editingProductId, productFiles, productForm, refreshAll, resetProductForm]
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

  const handleMarkNotificationRead = useCallback(
    async (notificationId) => {
      if (!notificationId) return;
      await api.markNotificationRead(notificationId);
      setNotifications((current) =>
        current.map((item) =>
          String(item._id) === String(notificationId) ? { ...item, isRead: true } : item
        )
      );
    },
    []
  );

  const handleMarkAllNotificationsRead = useCallback(async () => {
    await api.markAllNotificationsRead();
    setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
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

  const handleOpenAuction = useCallback(
    async (auctionId) => {
      await api.openAuction(auctionId, {});
      await refreshAll();
      if (selectedAuctionDetail?.auction?._id === auctionId) {
        await loadAuctionDetail(auctionId);
      }
      setNotice('Da mo dau gia sang trang thai live.');
    },
    [loadAuctionDetail, refreshAll, selectedAuctionDetail]
  );

  const handleDeleteAuction = useCallback(
    async (auctionId) => {
      await api.deleteAuction(auctionId);
      if (routeAuctionId === auctionId) {
        setSelectedAuctionDetail(null);
        navigateTo('/sell/auctions');
      }
      await refreshAll();
      setNotice('Da xoa auction.');
    },
    [refreshAll, routeAuctionId]
  );

  const handleCreateOrder = useCallback(async () => {
    if (!selectedProduct?._id || !user?._id) return;
    if (selectedProduct.status !== 'active') {
      setNotice('Sản phẩm này hiện chưa sẵn sàng để mua ngay.');
      return;
    }
    const buyNowPrice = Number(selectedProduct.buyNowPrice || selectedProduct.price || 0);
    if (buyNowPrice <= 0) {
      if (selectedAuction?._id) {
        navigateTo(`/auctions/${selectedAuction._id}`);
      }
      setNotice('Sản phẩm này hiện không có giá mua ngay. Hãy dùng chức năng Đặt giá.');
      return;
    }
    const sellerId = selectedProduct.seller?._id || selectedProduct.seller;
    if (String(sellerId) === String(user._id)) {
      setNotice('Bạn không thể mua sản phẩm do chính mình đang bán.');
      return;
    }
    const address = addresses.find((item) => item.isDefault) || addresses[0];
    if (!address) {
      setPendingCheckoutProductId(selectedProduct._id);
      resetAddressForm();
      navigateTo('/account');
      focusAddressSection();
      setNotice('Ban chua co dia chi giao hang. Hay luu dia chi, he thong se tao don ngay sau do.');
      return;
    }

    const response = await api.createOrder({
      productId: selectedProduct._id,
      quantity: 1,
      paymentType: 'wallet',
      shippingMethod: 'delivery',
      shippingFee: 30000,
      platformFee: 20000,
      shippingAddressId: address._id,
      shippingAddress: mapAddressToOrderShipping(address),
      status: 'negotiating',
    });

    const createdOrder = response?.data?.order || null;
    const createdOrderItem = response?.data?.orderItem || null;
    const orderId = response?.data?.order?._id;
    if (createdOrder) {
      setOrders((current) => uniq([createdOrder, ...current]));
      setSelectedOrder({ order: createdOrder, items: createdOrderItem ? [createdOrderItem] : [] });
    }
    await loadPrivate();
    if (orderId) {
      await loadOrderDetail(orderId);
      navigateTo('/orders');
    } else {
      navigateTo('/orders');
    }
    setNotice('Đã tạo đơn hàng và chuyển sang trang Đơn hàng.');
  }, [addresses, focusAddressSection, loadOrderDetail, loadPrivate, resetAddressForm, selectedAuction, selectedProduct, user]);

  const handlePlaceBid = useCallback(async () => {
    if (!selectedAuction?._id) return;
    openBidDialog(selectedAuction, selectedProduct?.title);
  }, [openBidDialog, selectedAuction, selectedProduct]);

  const handlePlaceBidForAuction = useCallback(
    async (auctionId) => {
      const targetAuction = selectedAuctionDetail?.auction?._id === auctionId
        ? selectedAuctionDetail.auction
        : auctions.find((item) => String(item._id) === String(auctionId));
      if (!targetAuction?._id) return;
      openBidDialog(targetAuction, targetAuction.product?.title);
    },
    [auctions, openBidDialog, selectedAuctionDetail]
  );

  const handleBuyNowAuction = useCallback(
    async (auctionId) => {
      const response = await api.buyNowAuction(auctionId);
      await refreshAll();
      const profilePayload = await api.me().catch(() => null);
      if (profilePayload?.data) {
        setUser(profilePayload.data);
      }
      if (String(pathname).startsWith('/auctions/')) {
        await loadAuctionDetail(auctionId);
      }
      const orderId = response?.data?.order?._id;
      if (orderId) {
        navigateTo(`/orders/${orderId}`);
      }
      setNotice('Da mua dut phien dau gia bang vi.');
    },
    [loadAuctionDetail, pathname, refreshAll]
  );

  const handleSubmitBidDialog = useCallback(
    async (event) => {
      event.preventDefault();
      if (!bidDialog.auctionId) return;

      const amount = Number(bidDialog.amount);
      const minimumBid = Number(bidDialog.currentBid || 0) + Number(bidDialog.bidStep || 10000);

      if (!amount || Number.isNaN(amount)) {
        throw new Error('Vui long nhap gia dat hop le.');
      }
      if (amount < minimumBid) {
        throw new Error(`Gia dat phai tu ${minimumBid.toLocaleString('vi-VN')} VND tro len.`);
      }

      await api.placeBid(bidDialog.auctionId, amount);
      closeBidDialog();
      await refreshAll();
      if (String(pathname).startsWith('/auctions/')) {
        await loadAuctionDetail(bidDialog.auctionId);
      }
      setNotice('Da gui luot dat gia thanh cong.');
    },
    [bidDialog, closeBidDialog, loadAuctionDetail, pathname, refreshAll]
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
      const content = window.prompt('Sửa nội dung tin nhắn', message.content || '');
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
      const name = `${categoryForm.name || ''}`.trim();
      const slug = toSlug(categoryForm.slug || categoryForm.name);
      if (!name) {
        setNotice('Vui long nhap ten danh muc.');
        return;
      }
      if (!slug) {
        setNotice('Slug danh mục không hợp lệ.');
        return;
      }
      const payload = {
        ...categoryForm,
        name,
        slug,
        icon: `${categoryForm.icon || ''}`.trim(),
        parentCategory: categoryForm.parentCategory || '',
        sortOrder: toNumber(categoryForm.sortOrder) || 0,
        isActive: categoryForm.isActive !== false,
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
      icon: category.icon || '',
      parentCategory: category.parentCategory?._id || category.parentCategory || '',
      sortOrder: String(category.sortOrder || 0),
      isActive: category.isActive !== false,
      source: category.source || 'manual',
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
      setNotice('Da tai anh bang base64.');
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
      setNotice('Da tai 1 anh bang multipart/form-data.');
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
      setNotice('Da tai nhieu anh cung luc.');
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
    setNotice('Da dang ky anh tu remote URL.');
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
    setProductFiles,
    canManageCategories: isAdmin,
    categoryCreatePath: '/admin/categories/create',
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
    onOpenAuction: (auctionId) => run(() => handleOpenAuction(auctionId)),
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
    onAttachShippingAddress: (orderId, addressId) =>
      run(() => handleAttachShippingAddress(orderId, addressId)),
    escrows,
    selectedEscrow,
    onViewEscrow: selectEscrowRoute,
    onEscrowAction: (escrowId, action) => run(() => handleEscrowAction(escrowId, action)),
    reviews,
    reviewForm,
    setReviewForm,
    onCreateReview: (event) => run(() => handleCreateReview(event)),
    onRespondReview: (reviewId) => run(() => handleRespondReview(reviewId)),
    walletTopUpForm,
    setWalletTopUpForm,
    onTopUpWallet: (event) => run(() => handleTopUpWallet(event)),
    walletTransactions,
    notifications,
    onMarkNotificationRead: (id) => run(() => handleMarkNotificationRead(id)),
    onMarkAllNotificationsRead: () => run(() => handleMarkAllNotificationsRead()),
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
    canManageUsers: isAdmin,
    canDeleteProducts: isAdmin,
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
    onOpenAuction: (auctionId) => run(() => handleOpenAuction(auctionId)),
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
    walletUsers: adminWalletUsers,
    walletTransactions: adminWalletTransactions,
    walletAdminForm,
    setWalletAdminForm,
    onAdminTopUpWallet: (event) => run(() => handleAdminTopUpWallet(event)),
    onSelectWalletUser: (userId) => setAdminWalletUserId(userId),
  };

  const mainNav = [
    { id: 'home', label: 'Trang chủ', to: '/' },
    { id: 'account', label: 'Tài khoản', to: '/account', requiresAuth: true },
    { id: 'wallet', label: 'Ví tiền', to: '/wallet', requiresAuth: true },
    { id: 'orders', label: 'Đơn hàng', to: '/orders', requiresAuth: true },
    { id: 'messages', label: 'Tin nhắn', to: '/messages', requiresAuth: true },
    { id: 'sell', label: 'Đăng bán', to: '/sell/products/create', requiresAuth: true, requiresSeller: true },
    { id: 'admin', label: 'Quản trị', to: '/admin', requiresAdmin: true },
  ];

  const NAV_ICONS = {
    home: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    ),
    account: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M4 20a8 8 0 0 1 16 0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
    wallet: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="6" width="18" height="12" rx="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M17 12h3v3h-3z" fill="none" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    ),
    orders: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 4h10l2 4v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V8z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M7 4v4h10V4" fill="none" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    ),
    messages: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-4 4v-4H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    ),
    sell: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 7h16v10H4z" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M8 7V5h8v2" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M12 10v4M10 12h4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
    admin: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3 4 6v6c0 5 3.5 7.5 8 9 4.5-1.5 8-4 8-9V6z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M12 8v4l2 2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
    logout: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M10 4h-5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M14 7l5 5-5 5M19 12H9" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    notifications: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 17h12l-1.5-2.5V11a4.5 4.5 0 0 0-9 0v3.5z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M10 19a2 2 0 0 0 4 0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  };

  const currentPageLabel = useMemo(() => {
    if (pathname === '/') return 'Trang chủ';
    if (productRoute) return 'Chi tiết sản phẩm';
    if (auctionRoute) return 'Chi tiết đấu giá';
    if (sellerStoreRoute) return 'Gian hàng';
    if (pathname === '/orders') return 'Đơn hàng';
    if (orderRoute) return 'Chi tiết đơn hàng';
    if (escrowRoute) return 'Chi tiết ký quỹ';
    if (pathname === '/login') return 'Đăng nhập';
    if (pathname === '/register') return 'Đăng ký';
    if (pathname === '/account') return 'Tài khoản';
    if (pathname === '/wallet') return 'Ví tiền';
    if (pathname === '/notifications') return 'Thông báo';
    if (pathname.startsWith('/messages')) return 'Tin nhắn';
    if (pathname.startsWith('/sell/products/create')) return 'Tạo sản phẩm';
    if (pathname.startsWith('/sell/products')) return 'Quản lý sản phẩm';
    if (pathname.startsWith('/sell/auctions/create')) return 'Tạo đấu giá';
    if (pathname.startsWith('/sell/auctions')) return 'Quản lý đấu giá';
    if (pathname.startsWith('/admin/products/create')) return 'Quản trị tạo sản phẩm';
    if (pathname.startsWith('/admin/products')) return 'Quản trị sản phẩm';
    if (pathname.startsWith('/admin/categories/create')) return 'Quản trị tạo danh mục';
    if (pathname.startsWith('/admin/categories')) return 'Quản trị danh mục';
    if (pathname.startsWith('/admin/users')) return 'Quản trị người dùng';
    if (pathname.startsWith('/admin/orders')) return 'Quản trị vận hành';
    if (pathname.startsWith('/admin/wallets')) return 'Quản trị ví tiền';
    if (pathname.startsWith('/admin/imports')) return 'Quản trị import';
    if (pathname.startsWith('/admin')) return 'Bảng điều khiển quản trị';
    if (pathname === '/docs') return 'Tài liệu API';
    return 'Marketplace';
  }, [auctionRoute, escrowRoute, orderRoute, pathname, productRoute, sellerStoreRoute]);

  const renderAuthRequired = (content, title = 'Cần đăng nhập') => {
    if (user) return content;
    return (
      <SectionCard title={title} subtitle="Yêu cầu đăng nhập" className="wide">
        <p className="muted">Hãy đăng nhập hoặc đăng ký để truy cập chức năng này.</p>
        <div className="actions-row">
          <AppLink to="/login" className="route-pill">
            Đăng nhập
          </AppLink>
          <AppLink to="/register" className="route-pill">
            Đăng ký
          </AppLink>
        </div>
      </SectionCard>
    );
  };

  const renderRoleRequired = (content, options = {}) => {
    const {
      title = 'Cần đăng nhập',
      isAllowed = true,
      requiredRoles = [],
      forbiddenMessage = 'Bạn không có quyền truy cập chức năng này.',
    } = options;
    if (!user) {
      return renderAuthRequired(content, title);
    }
    if (isAllowed) {
      return content;
    }

    return (
      <SectionCard title={title} subtitle="Yêu cầu phân quyền" className="wide">
        <p className="muted">
          {forbiddenMessage}
          {requiredRoles.length ? ` Vai trò cần có: ${requiredRoles.join(', ')}.` : ''}
        </p>
      </SectionCard>
    );
  };

  const renderRoute = () => {
    if (pathname === '/login') {
      return (
        <LoginPage
          loginForm={loginForm}
          rememberAccount={rememberAccount}
          setLoginForm={setLoginForm}
          setRememberAccount={setRememberAccount}
          showPassword={showLoginPassword}
          setShowPassword={setShowLoginPassword}
          onSubmit={(event) => run(() => handleLogin(event))}
        />
      );
    }
    if (pathname === '/register') {
      return (
        <RegisterPage
          registerForm={registerForm}
          setRegisterForm={setRegisterForm}
          showConfirmPassword={showRegisterConfirmPassword}
          showPassword={showRegisterPassword}
          setShowConfirmPassword={setShowRegisterConfirmPassword}
          setShowPassword={setShowRegisterPassword}
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
          onBuyNowAuction={(auctionId) => run(() => handleBuyNowAuction(auctionId))}
          onOpenAuction={(auctionId) => run(() => handleOpenAuction(auctionId))}
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
          user={user}
          addresses={addresses}
          selectedOrder={selectedOrder}
          onUpdateOrderStatus={(orderId, status) => run(() => handleUpdateOrderStatus(orderId, status))}
          onDeleteOrder={(orderId) => run(() => handleDeleteOrder(orderId))}
          onAttachShippingAddress={(orderId, addressId) =>
            run(() => handleAttachShippingAddress(orderId, addressId))
          }
        />,
        'Chi tiết đơn hàng'
      );
    }
    if (escrowRoute) {
      return renderAuthRequired(
        <EscrowDetailPage
          selectedEscrow={selectedEscrow}
          onEscrowAction={(escrowId, action) => run(() => handleEscrowAction(escrowId, action))}
        />,
        'Chi tiết ký quỹ'
      );
    }
    if (pathname === '/account') {
      return renderAuthRequired(<AccountPage {...commonAccountProps} />, 'Tài khoản');
    }
    if (pathname === '/wallet') {
      return renderAuthRequired(<WalletPage {...commonAccountProps} />, 'Ví tiền');
    }
    if (pathname === '/notifications') {
      return renderAuthRequired(
        <NotificationsPage
          notifications={notifications}
          onMarkNotificationRead={(id) => run(() => handleMarkNotificationRead(id))}
          onMarkAllNotificationsRead={() => run(() => handleMarkAllNotificationsRead())}
        />,
        'Thông báo'
      );
    }
    if (pathname === '/orders') {
      return renderAuthRequired(<OrdersPage {...commonAccountProps} />, 'Đơn hàng');
    }
    if (pathname === '/messages' || messageRoute) {
      return renderAuthRequired(<MessagesPage {...commonChatProps} />, 'Tin nhắn');
    }
    if (pathname === '/sell/products') {
      return renderRoleRequired(<SellerProductsPage {...commonSellerProps} />, {
        title: 'Quản lý tin đăng',
        isAllowed: canSell,
        requiredRoles: ['user', 'admin'],
        forbiddenMessage: 'Tài khoản hiện tại chưa được phép đăng bán hoặc tạo đấu giá.',
      });
    }
    if (pathname === '/sell/products/create' || sellerEditRoute) {
      return renderRoleRequired(<SellerProductFormPage {...commonSellerProps} />, {
        title: 'Tạo hoặc sửa tin đăng',
        isAllowed: canSell,
        requiredRoles: ['user', 'admin'],
        forbiddenMessage: 'Tài khoản hiện tại chưa được phép đăng bán hoặc tạo đấu giá.',
      });
    }
    if (pathname === '/sell/auctions') {
      return renderRoleRequired(<SellerAuctionsPage {...commonSellerProps} />, {
        title: 'Quản lý đấu giá',
        isAllowed: canSell,
        requiredRoles: ['user', 'admin'],
        forbiddenMessage: 'Tài khoản hiện tại chưa được phép đăng bán hoặc tạo đấu giá.',
      });
    }
    if (pathname === '/sell/auctions/create') {
      return renderRoleRequired(<SellerAuctionFormPage {...commonSellerProps} />, {
        title: 'Tạo hoặc sửa đấu giá',
        isAllowed: canSell,
        requiredRoles: ['user', 'admin'],
        forbiddenMessage: 'Tài khoản hiện tại chưa được phép đăng bán hoặc tạo đấu giá.',
      });
    }
    if (pathname === '/admin') {
      return renderRoleRequired(<AdminDashboardPage {...commonAdminProps} />, {
        title: 'Bảng điều khiển quản trị',
        isAllowed: isAdmin,
        requiredRoles: ['admin'],
      });
    }
    if (pathname === '/admin/users') {
      return renderRoleRequired(<AdminUsersPage {...commonAdminProps} />, {
        title: 'Quản trị người dùng',
        isAllowed: isAdmin,
        requiredRoles: ['admin'],
        forbiddenMessage: 'Chỉ admin mới được quản lý tài khoản và gán role.',
      });
    }
    if (pathname === '/admin/categories' || pathname === '/admin/categories/create') {
      return renderRoleRequired(
        <AdminCategoriesPage
          {...commonAdminProps}
          createMode={pathname === '/admin/categories/create'}
        />,
        {
          title: 'Quản trị danh mục',
          isAllowed: isAdmin,
          requiredRoles: ['admin'],
        }
      );
    }
    if (pathname === '/admin/products') {
      return renderRoleRequired(<AdminProductsPage {...commonAdminProps} />, {
        title: 'Quản trị sản phẩm',
        isAllowed: isAdmin,
        requiredRoles: ['admin'],
      });
    }
    if (
      pathname === '/admin/products/create' ||
      pathname === '/admin/product/create' ||
      adminEditRoute
    ) {
      return renderRoleRequired(<AdminProductFormPage {...commonSellerProps} />, {
        title: 'Quản trị tạo sản phẩm',
        isAllowed: isAdmin,
        requiredRoles: ['admin'],
        forbiddenMessage: 'Chỉ admin mới được tạo hoặc sửa listing từ workspace admin.',
      });
    }
    if (pathname === '/admin/orders') {
      return renderRoleRequired(<AdminOrdersPage {...commonAdminProps} />, {
        title: 'Quản trị vận hành',
        isAllowed: isAdmin,
        requiredRoles: ['admin'],
        forbiddenMessage: 'Chỉ admin mới được truy cập vận hành order và escrow.',
      });
    }
    if (pathname === '/admin/wallets') {
      return renderRoleRequired(<AdminWalletsPage {...commonAdminProps} />, {
        title: 'Quản trị ví tiền',
        isAllowed: isAdmin,
        requiredRoles: ['admin'],
        forbiddenMessage: 'Chỉ admin mới được theo dõi ví và nạp ví cho người dùng.',
      });
    }
    if (pathname === '/admin/imports') {
      return renderRoleRequired(<AdminImportsPage {...commonAdminProps} />, {
        title: 'Quản trị import',
        isAllowed: isAdmin,
        requiredRoles: ['admin'],
      });
    }
    if (pathname === '/docs') {
      return <DocsPage />;
    }
    return (
      <SectionCard title="Không tìm thấy trang" subtitle="404" className="wide">
        <p className="muted">Route này chưa được map. Hãy quay về trang chủ hoặc khu quản trị.</p>
        <div className="actions-row">
          <AppLink to="/" className="route-pill">
            Về trang chủ
          </AppLink>
          <AppLink to="/admin" className="route-pill">
            Về admin
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
            <span className="muted">Mua bán đồ cũ và chat trực tiếp với người bán</span>
          </div>
          {headerSearchVisible ? (
            <form className="site-search" onSubmit={handleHeaderSearch}>
              <input
                value={filters.q}
                onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))}
                placeholder="Tìm điện thoại, xe, đồ gia dụng..."
              />
              <button type="submit" className="primary-btn">Tìm</button>
            </form>
          ) : null}
            <div className="site-header__right">
              <nav className="site-nav">
              {mainNav
                .filter((item) => !item.requiresAuth || user)
                .filter((item) => !item.requiresAdmin || isAdmin)
                .filter((item) => !item.requiresSeller || canSell)
                .map((item) => {
                  const isActive = item.to === '/'
                    ? homeRoute
                    : item.to === '/messages'
                      ? messagesRoute
                      : item.to === '/orders'
                        ? ordersRoute
                      : item.to === '/account'
                        ? accountRoute
                        : item.to === '/wallet'
                          ? walletRoute
                          : item.to === '/docs'
                              ? docsRoute
                              : item.to === '/admin'
                                ? adminRoute
                                : item.to === '/sell/products/create'
                                  ? sellerRoute
                                  : pathname.startsWith(item.to);
                  return (
                    <AppLink
                      key={item.to}
                      to={item.to}
                      className={`site-nav__link${isActive ? ' active' : ''}`}
                    >
                      <span className="nav-icon">{NAV_ICONS[item.id]}</span>
                      <span>{item.label}</span>
                    </AppLink>
                  );
                })}
              {!user ? (
                <>
                  <AppLink
                    to="/login"
                    className={`site-nav__link${pathname === '/login' ? ' active' : ''}`}
                  >
                    <span className="nav-icon">{NAV_ICONS.account}</span>
                    <span>Đăng nhập</span>
                  </AppLink>
                  <AppLink
                    to="/register"
                    className={`site-nav__link${pathname === '/register' ? ' active' : ''}`}
                  >
                    <span className="nav-icon">{NAV_ICONS.account}</span>
                    <span>Đăng ký</span>
                  </AppLink>
                </>
                ) : (
                  <>
                    <button type="button" onClick={() => run(handleLogout)}>
                      <span className="nav-icon">{NAV_ICONS.logout}</span>
                      <span>Đăng xuất</span>
                    </button>
                    {user ? (
                      <div className="notification-shell">
                        <button
                          type="button"
                          className="notification-pill"
                          onClick={() => setNotificationOpen((open) => !open)}
                        >
                          <span className="nav-icon">{NAV_ICONS.notifications}</span>
                          <span>Thông báo</span>
                          {unreadNotificationCount ? (
                            <span className="notification-badge">{unreadNotificationCount}</span>
                          ) : null}
                        </button>
                        {notificationOpen ? (
                          <div className="notification-panel">
                            <div className="notification-panel__head">
                              <strong>Thông báo</strong>
                              <div className="notification-panel__actions">
                                <button
                                  type="button"
                                  className="ghost-btn"
                                  onClick={() => run(() => handleMarkAllNotificationsRead())}
                                >
                                  Đã đọc hết
                                </button>
                                <AppLink to="/notifications" className="route-pill route-pill--button">
                                  Xem tất cả
                                </AppLink>
                              </div>
                            </div>
                            <div className="notification-panel__list">
                              {recentNotifications.map((item) => (
                                <button
                                  key={item._id}
                                  type="button"
                                  className={`notification-item${item.isRead ? '' : ' unread'}`}
                                  onClick={() => run(() => handleMarkNotificationRead(item._id))}
                                >
                                  <div>
                                    <strong>{item.title}</strong>
                                    <p>{compactText(item.message || 'Không có nội dung', 90)}</p>
                                  </div>
                                  <small>{formatDateTime(item.createdAt)}</small>
                                </button>
                              ))}
                              {!recentNotifications.length ? (
                                <div className="notification-empty">
                                  <strong>Chưa có thông báo.</strong>
                                  <p className="muted">
                                    Thông báo nạp ví, đơn hàng, chat, đấu giá sẽ hiển thị ở đây.
                                  </p>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </>
                )}
            </nav>
          </div>
        </div>
      </header>

      <main className="site-main">

        {sellerRoute ? (
          <SectionCard
            title="Kênh đăng bán"
            subtitle="Toàn bộ chức năng nằm ở từng trang riêng"
            className="wide"
          >
            <div className="actions-row wrap">
              <AppLink to="/sell/products" className={`route-pill${pathname === '/sell/products' ? ' active' : ''}`}>
                Danh sách tin đăng
              </AppLink>
              <AppLink
                to="/sell/products/create"
                className={`route-pill${pathname === '/sell/products/create' || sellerEditRoute ? ' active' : ''}`}
              >
                Đăng tin mới
              </AppLink>
              {isAdmin ? (
                <AppLink to="/admin/categories/create" className={`route-pill${pathname === '/admin/categories/create' ? ' active' : ''}`}>
                  Tạo danh mục
                </AppLink>
              ) : null}
              <AppLink to="/sell/auctions" className={`route-pill${pathname === '/sell/auctions' ? ' active' : ''}`}>
                Danh sách đấu giá
              </AppLink>
              <AppLink to="/sell/auctions/create" className={`route-pill${pathname === '/sell/auctions/create' ? ' active' : ''}`}>
                Tạo đấu giá
              </AppLink>
            </div>
          </SectionCard>
        ) : null}

        {adminRoute ? (
          <SectionCard title="Khu quản trị" subtitle="CRUD riêng cho admin" className="wide">
            <div className="actions-row wrap">
              <AppLink to="/admin" className={`route-pill${pathname === '/admin' ? ' active' : ''}`}>
                Dashboard
              </AppLink>
              <AppLink to="/admin/users" className={`route-pill${pathname === '/admin/users' ? ' active' : ''}`}>
                Người dùng
              </AppLink>
              <AppLink to="/admin/categories" className={`route-pill${pathname === '/admin/categories' ? ' active' : ''}`}>
                Danh mục
              </AppLink>
              <AppLink to="/admin/categories/create" className={`route-pill${pathname === '/admin/categories/create' ? ' active' : ''}`}>
                Tạo danh mục
              </AppLink>
              <AppLink to="/admin/products" className={`route-pill${pathname === '/admin/products' ? ' active' : ''}`}>
                Sản phẩm
              </AppLink>
              <AppLink
                to="/admin/products/create"
                className={`route-pill${pathname === '/admin/products/create' || adminEditRoute ? ' active' : ''}`}
              >
                Tạo sản phẩm
              </AppLink>
              <AppLink to="/admin/orders" className={`route-pill${pathname === '/admin/orders' ? ' active' : ''}`}>
                Vận hành
              </AppLink>
              <AppLink to="/admin/wallets" className={`route-pill${pathname === '/admin/wallets' ? ' active' : ''}`}>
                Ví tiền
              </AppLink>
              <AppLink to="/admin/imports" className={`route-pill${pathname === '/admin/imports' ? ' active' : ''}`}>
                Import
              </AppLink>
            </div>
          </SectionCard>
        ) : null}

        {renderRoute()}
      </main>

      {bidDialog.open ? (
        <div className="modal-backdrop" role="presentation" onClick={closeBidDialog}>
          <div
            className="bid-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="bid-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="bid-modal__head">
              <div>
                <p className="eyebrow">Đặt giá</p>
                <h3 id="bid-modal-title">{bidDialog.title || 'Phiên đấu giá'}</h3>
              </div>
              <button type="button" className="ghost-btn" onClick={closeBidDialog}>
                Đóng
              </button>
            </div>

            <div className="bid-modal__stats">
              <div className="bid-modal__stat">
                <span>Giá hiện tại</span>
                <strong>{Number(bidDialog.currentBid || 0).toLocaleString('vi-VN')} VND</strong>
              </div>
              <div className="bid-modal__stat">
                <span>Bước giá tối thiểu</span>
                <strong>{Number(bidDialog.bidStep || 0).toLocaleString('vi-VN')} VND</strong>
              </div>
              <div className="bid-modal__stat">
                <span>Mức cần nhập</span>
                <strong>
                  {(Number(bidDialog.currentBid || 0) + Number(bidDialog.bidStep || 10000)).toLocaleString('vi-VN')} VND
                </strong>
              </div>
            </div>

            <form className="bid-modal__form" onSubmit={(event) => run(() => handleSubmitBidDialog(event))}>
              <label className="bid-modal__field">
                <span>Số tiền bạn muốn đặt</span>
                <input
                  type="number"
                  min={Number(bidDialog.currentBid || 0) + Number(bidDialog.bidStep || 10000)}
                  step={Number(bidDialog.bidStep || 10000)}
                  value={bidDialog.amount}
                  onChange={(event) =>
                    setBidDialog((current) => ({
                      ...current,
                      amount: event.target.value,
                    }))
                  }
                  placeholder="Nhập số tiền đặt giá"
                  required
                />
              </label>

              <div className="bid-modal__actions">
                <button type="button" className="ghost-btn" onClick={closeBidDialog}>
                  Hủy
                </button>
                <button type="submit" className="primary-btn">
                  Gửi giá đặt
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <footer className="site-footer">
        <div className="site-footer__inner">
          <span>
            Marketplace demo theo flow Chợ Tốt/Mercari: xem sản phẩm, chat người bán, tạo đơn
            hàng, đấu giá và quản trị.
          </span>
          <div className="actions-row wrap">
            <AppLink to="/docs" className="route-pill route-pill--button">{'T\u00e0i li\u1ec7u API'}</AppLink>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;


