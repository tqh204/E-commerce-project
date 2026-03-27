import { getStoredToken, setStoredToken } from './auth';

const toQueryString = (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      query.set(key, value);
    }
  });
  return query.toString();
};

export const apiFetch = async (path, options = {}) => {
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
    if (response.status === 401) {
      setStoredToken('');
    }
    throw new Error(payload.message || `Request failed (${response.status})`);
  }

  return payload;
};

export const api = {
  login: (body) => apiFetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  register: (body) => apiFetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  me: () => apiFetch('/api/auth/me'),
  logout: () => apiFetch('/api/auth/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) }),
  categories: (params = {}) => apiFetch(`/api/categories?${toQueryString({ limit: 100, ...params })}`),
  products: (params = {}) => apiFetch(`/api/products?${toQueryString({ limit: 24, ...params })}`),
  product: (id) => apiFetch(`/api/products/${id}`),
  createProduct: (body) => apiFetch('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  updateProduct: (id, body) => apiFetch(`/api/products/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  users: (params = {}) => apiFetch(`/api/users?${toQueryString({ limit: 20, ...params })}`),
  orders: (params = {}) => apiFetch(`/api/orders?${toQueryString({ limit: 20, ...params })}`),
  updateOrderStatus: (id, status) => apiFetch(`/api/orders/${id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }),
  createOrder: (body) => apiFetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  auctions: (params = {}) => apiFetch(`/api/auctions?${toQueryString({ limit: 20, ...params })}`),
  auction: (id) => apiFetch(`/api/auctions/${id}`),
  createAuction: (body) => apiFetch('/api/auctions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  placeBid: (id, amount) => apiFetch(`/api/auctions/${id}/bids`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount }) }),
  closeAuction: (id, body = { force: true }) => apiFetch(`/api/auctions/${id}/close`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  conversations: (params = {}) => apiFetch(`/api/conversations?${toQueryString({ limit: 20, ...params })}`),
  conversationMessages: (id, params = {}) => apiFetch(`/api/conversations/${id}/messages?${toQueryString({ limit: 50, ...params })}`),
  createConversation: (body) => apiFetch('/api/conversations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  sendMessage: (id, body) => apiFetch(`/api/conversations/${id}/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  editMessage: (conversationId, messageId, body) => apiFetch(`/api/conversations/${conversationId}/messages/${messageId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  markConversationRead: (id) => apiFetch(`/api/conversations/${id}/read`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) }),
  escrows: (params = {}) => apiFetch(`/api/escrows?${toQueryString({ limit: 20, ...params })}`),
  updateEscrow: (id, action, body) => apiFetch(`/api/escrows/${id}/${action}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  reviews: (params = {}) => apiFetch(`/api/reviews?${toQueryString({ limit: 20, ...params })}`),
  createReview: (body) => apiFetch('/api/reviews', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  categoriesCreate: (body) => apiFetch('/api/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  categoriesUpdate: (id, body) => apiFetch(`/api/categories/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  categoriesDelete: (id) => apiFetch(`/api/categories/${id}`, { method: 'DELETE' }),
  imports: (body) => apiFetch('/api/imports/chotot', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  importBatches: (params = {}) => apiFetch(`/api/imports/batches?${toQueryString({ limit: 12, ...params })}`),
  uploadSingle: (formData) => apiFetch('/api/uploads/multipart', { method: 'POST', body: formData }),
};
