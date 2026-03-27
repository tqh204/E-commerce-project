const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const mongoose = require('mongoose');

const app = require('../app');
const connectDB = require('../config/database');
const { initSocket } = require('../lib/socket');

let server;
let baseUrl;

const request = async (path, options = {}) => {
  const response = await fetch(`${baseUrl}${path}`, options);
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch (error) {
    payload = { raw: text };
  }

  return { response, payload, text };
};

const login = async (identifier, password) => {
  const { response, payload } = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password }),
  });

  assert.equal(response.status, 200);
  assert.ok(payload?.data?.accessToken);
  return payload.data.accessToken;
};

test.before(async () => {
  await connectDB();
  server = http.createServer(app);
  initSocket(server);
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

test.after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await mongoose.disconnect();
});

test('docs endpoints are reachable', async () => {
  const docs = await request('/docs.html');
  assert.equal(docs.response.status, 200);
  assert.match(docs.text, /Marketplace API Docs/i);

  const openapi = await request('/api-docs/openapi.json');
  assert.equal(openapi.response.status, 200);
  assert.equal(openapi.payload.openapi, '3.0.3');
});

test('auth, product CRUD path, and chat edit path work', async () => {
  const sellerToken = await login('seller01@example.com', 'password123');
  const buyerToken = await login('buyer01@example.com', 'password123');

  const categories = await request('/api/categories?limit=1');
  assert.equal(categories.response.status, 200);
  const categoryId = categories.payload.data[0]._id;
  assert.ok(categoryId);

  const productCreate = await request('/api/products', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sellerToken}`,
    },
    body: JSON.stringify({
      categoryId,
      title: `Smoke Product ${Date.now()}`,
      description: 'Smoke test product for automated test suite',
      price: 123456,
      saleType: 'fixed_price',
      condition: 'good',
      status: 'active',
    }),
  });
  assert.equal(productCreate.response.status, 201);
  const productId = productCreate.payload.data._id;
  const sellerId = productCreate.payload.data.seller;

  const conversationCreate = await request('/api/conversations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${buyerToken}`,
    },
    body: JSON.stringify({
      productId,
      otherUserId: sellerId,
      initialMessage: 'Smoke chat start',
    }),
  });
  assert.equal(conversationCreate.response.status, 201);
  const conversationId = conversationCreate.payload.data._id;

  const messageCreate = await request(`/api/conversations/${conversationId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${buyerToken}`,
    },
    body: JSON.stringify({ content: 'Original smoke message' }),
  });
  assert.equal(messageCreate.response.status, 201);
  const messageId = messageCreate.payload.data._id;

  const messageEdit = await request(`/api/conversations/${conversationId}/messages/${messageId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${buyerToken}`,
    },
    body: JSON.stringify({ content: 'Edited smoke message' }),
  });
  assert.equal(messageEdit.response.status, 200);
  assert.equal(messageEdit.payload.data.content, 'Edited smoke message');
  assert.ok(messageEdit.payload.data.editedAt);

  const markRead = await request(`/api/conversations/${conversationId}/read`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sellerToken}`,
    },
    body: JSON.stringify({}),
  });
  assert.equal(markRead.response.status, 200);
  assert.ok(Array.isArray(markRead.payload.data.messageIds));

  const conversationList = await request('/api/conversations?limit=10', {
    headers: { Authorization: `Bearer ${sellerToken}` },
  });
  assert.equal(conversationList.response.status, 200);
  const matchedConversation = conversationList.payload.data.find((item) => item._id === conversationId);
  assert.ok(matchedConversation);
  assert.equal(typeof matchedConversation.unreadCount, 'number');
});
