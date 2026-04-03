import { clearStoredToken, getStoredToken, setStoredToken } from './auth';

const toQueryString = (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (Array.isArray(value)) {
      value.filter(Boolean).forEach((item) => query.append(key, item));
      return;
    }
    if (typeof value === 'string' && value.trim() === '') return;
    query.set(key, value);
  });
  return query.toString();
};

const jsonOptions = (method, body) => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

let refreshPromise = null;

const refreshAccessToken = async () => {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.success === false || !payload?.data?.accessToken) {
        clearStoredToken();
        throw new Error(payload.message || 'Session expired');
      }

      setStoredToken(payload.data.accessToken);
      return payload.data.accessToken;
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
};

export const apiFetch = async (path, options = {}, retryOnAuthFailure = true) => {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(path, {
    credentials: 'include',
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json()
    : { success: response.ok, data: await response.text() };

  if (!response.ok || payload.success === false) {
    const isRefreshRequest = path === '/api/auth/refresh';
    const shouldAttemptRefresh =
      response.status === 401 && retryOnAuthFailure && !isRefreshRequest && !String(path).startsWith('/api/auth/login') && !String(path).startsWith('/api/auth/register');

    if (shouldAttemptRefresh) {
      try {
        await refreshAccessToken();
        return apiFetch(path, options, false);
      } catch (error) {
        clearStoredToken();
      }
    }

    if (response.status === 401) {
      clearStoredToken();
    }
    throw new Error(payload.message || `Request failed (${response.status})`);
  }

  return payload;
};

export const api = {
  login: (body) => apiFetch('/api/auth/login', jsonOptions('POST', body)),
  register: (body) => apiFetch('/api/auth/register', jsonOptions('POST', body)),
  refresh: (body = {}) => apiFetch('/api/auth/refresh', jsonOptions('POST', body)),
  me: () => apiFetch('/api/auth/me'),
  logout: (body = {}) => apiFetch('/api/auth/logout', jsonOptions('POST', body)),

  users: (params = {}) => apiFetch(`/api/users?${toQueryString({ limit: 50, ...params })}`),
  user: (id) => apiFetch(`/api/users/${id}`),
  myProfile: () => apiFetch('/api/users/me/profile'),
  updateMyProfile: (body) => apiFetch('/api/users/me/profile', jsonOptions('PATCH', body)),
  updateUser: (id, body) => apiFetch(`/api/users/${id}`, jsonOptions('PUT', body)),
  deleteUser: (id) => apiFetch(`/api/users/${id}`, { method: 'DELETE' }),

  addresses: (params = {}) => apiFetch(`/api/addresses?${toQueryString(params)}`),
  address: (id) => apiFetch(`/api/addresses/${id}`),
  createAddress: (body) => apiFetch('/api/addresses', jsonOptions('POST', body)),
  updateAddress: (id, body) => apiFetch(`/api/addresses/${id}`, jsonOptions('PUT', body)),
  deleteAddress: (id) => apiFetch(`/api/addresses/${id}`, { method: 'DELETE' }),

  categories: (params = {}) => apiFetch(`/api/categories?${toQueryString({ limit: 100, ...params })}`),
  category: (id) => apiFetch(`/api/categories/${id}`),
  createCategory: (body) => apiFetch('/api/categories', jsonOptions('POST', body)),
  updateCategory: (id, body) => apiFetch(`/api/categories/${id}`, jsonOptions('PUT', body)),
  deleteCategory: (id) => apiFetch(`/api/categories/${id}`, { method: 'DELETE' }),

  products: (params = {}) => apiFetch(`/api/products?${toQueryString({ limit: 48, ...params })}`),
  product: (id) => apiFetch(`/api/products/${id}`),
  createProduct: (body) => apiFetch('/api/products', jsonOptions('POST', body)),
  updateProduct: (id, body) => apiFetch(`/api/products/${id}`, jsonOptions('PUT', body)),
  deleteProduct: (id) => apiFetch(`/api/products/${id}`, { method: 'DELETE' }),

  orders: (params = {}) => apiFetch(`/api/orders?${toQueryString({ limit: 50, ...params })}`),
  order: (id) => apiFetch(`/api/orders/${id}`),
  createOrder: (body) => apiFetch('/api/orders', jsonOptions('POST', body)),
  updateOrderStatus: (id, body) => apiFetch(`/api/orders/${id}/status`, jsonOptions('PATCH', body)),
  deleteOrder: (id) => apiFetch(`/api/orders/${id}`, { method: 'DELETE' }),

  auctions: (params = {}) => apiFetch(`/api/auctions?${toQueryString({ limit: 50, ...params })}`),
  auction: (id) => apiFetch(`/api/auctions/${id}`),
  createAuction: (body) => apiFetch('/api/auctions', jsonOptions('POST', body)),
  updateAuction: (id, body) => apiFetch(`/api/auctions/${id}`, jsonOptions('PUT', body)),
  placeBid: (id, amount) => apiFetch(`/api/auctions/${id}/bids`, jsonOptions('POST', { amount })),
  buyNowAuction: (id) => apiFetch(`/api/auctions/${id}/buy-now`, jsonOptions('POST', {})),
  openAuction: (id, body = {}) => apiFetch(`/api/auctions/${id}/open`, jsonOptions('POST', body)),
  closeAuction: (id, body = { force: true }) => apiFetch(`/api/auctions/${id}/close`, jsonOptions('POST', body)),
  deleteAuction: (id) => apiFetch(`/api/auctions/${id}`, { method: 'DELETE' }),

  conversations: (params = {}) => apiFetch(`/api/conversations?${toQueryString({ limit: 50, ...params })}`),
  createConversation: (body) => apiFetch('/api/conversations', jsonOptions('POST', body)),
  conversationMessages: (id, params = {}) => apiFetch(`/api/conversations/${id}/messages?${toQueryString({ limit: 100, ...params })}`),
  sendMessage: (id, body) => apiFetch(`/api/conversations/${id}/messages`, jsonOptions('POST', body)),
  updateMessage: (conversationId, messageId, body) => apiFetch(`/api/conversations/${conversationId}/messages/${messageId}`, jsonOptions('PATCH', body)),
  markConversationRead: (id) => apiFetch(`/api/conversations/${id}/read`, jsonOptions('PATCH', {})),
  deleteMessage: (conversationId, messageId) => apiFetch(`/api/conversations/${conversationId}/messages/${messageId}`, { method: 'DELETE' }),
  deleteMessageAttachment: (conversationId, messageId, mediaId) => apiFetch(`/api/conversations/${conversationId}/messages/${messageId}/media/${mediaId}`, { method: 'DELETE' }),

  uploadBase64: (body) => apiFetch('/api/uploads/base64', jsonOptions('POST', body)),
  uploadSingle: (formData) => apiFetch('/api/uploads/multipart', { method: 'POST', body: formData }),
  uploadMany: (formData) => apiFetch('/api/uploads/multipart-many', { method: 'POST', body: formData }),
  uploadRemote: (body) => apiFetch('/api/uploads/remote', jsonOptions('POST', body)),
  deleteMedia: (id) => apiFetch(`/api/uploads/${id}`, { method: 'DELETE' }),

  imports: (body) => apiFetch('/api/imports/chotot', jsonOptions('POST', body)),
  importBatches: (params = {}) => apiFetch(`/api/imports/batches?${toQueryString({ limit: 30, ...params })}`),
  importBatch: (id) => apiFetch(`/api/imports/batches/${id}`),

  escrows: (params = {}) => apiFetch(`/api/escrows?${toQueryString({ limit: 50, ...params })}`),
  escrow: (id) => apiFetch(`/api/escrows/${id}`),
  updateEscrow: (id, action, body) => apiFetch(`/api/escrows/${id}/${action}`, jsonOptions('PATCH', body)),

  walletSummary: () => apiFetch('/api/wallet'),
  walletTransactions: (params = {}) => apiFetch(`/api/wallet/transactions?${toQueryString({ limit: 50, ...params })}`),
  topUpWallet: (body) => apiFetch('/api/wallet/top-up', jsonOptions('POST', body)),
  momoTopUpWallet: (body) => apiFetch('/api/wallet/momo/top-up', jsonOptions('POST', body)),
  adminWalletUsers: (params = {}) => apiFetch(`/api/wallet/admin/users?${toQueryString({ limit: 50, ...params })}`),
  adminWalletTransactions: (params = {}) => apiFetch(`/api/wallet/admin/transactions?${toQueryString({ limit: 50, ...params })}`),
  adminTopUpWallet: (body) => apiFetch('/api/wallet/admin/top-up', jsonOptions('POST', body)),

  notifications: (params = {}) => apiFetch(`/api/notifications?${toQueryString({ limit: 50, ...params })}`),
  markNotificationRead: (id) => apiFetch(`/api/notifications/${id}/read`, jsonOptions('PATCH', {})),
  markAllNotificationsRead: () => apiFetch('/api/notifications/read-all', jsonOptions('PATCH', {})),

  reviews: (params = {}) => apiFetch(`/api/reviews?${toQueryString({ limit: 50, ...params })}`),
  review: (id) => apiFetch(`/api/reviews/${id}`),
  createReview: (body) => apiFetch('/api/reviews', jsonOptions('POST', body)),
  respondReview: (id, body) => apiFetch(`/api/reviews/${id}/respond`, jsonOptions('PATCH', body)),
  updateReviewVisibility: (id, body) => apiFetch(`/api/reviews/${id}/visibility`, jsonOptions('PATCH', body)),
};

