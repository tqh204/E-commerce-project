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

const main = async () => {
  await connectDB();
  server = http.createServer(app);
  initSocket(server);
  await new Promise((resolve) => server.listen(0, resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const homepage = await request('/');
    assert.equal(homepage.response.status, 200);
    assert.match(homepage.text, /Marketplace React/i);

    const reactApp = await request('/react');
    assert.equal(reactApp.response.status, 200);
    assert.match(reactApp.text, /Marketplace React/i);

    const sellerCreatePage = await request('/sell/products/create');
    assert.equal(sellerCreatePage.response.status, 200);
    assert.match(sellerCreatePage.text, /Marketplace React/i);

    const adminCreatePage = await request('/admin/products/create');
    assert.equal(adminCreatePage.response.status, 200);
    assert.match(adminCreatePage.text, /Marketplace React/i);

    const docs = await request('/docs.html');
    assert.equal(docs.response.status, 200);
    assert.match(docs.text, /Marketplace API Explorer/i);

    const openapi = await request('/api-docs/openapi.json');
    assert.equal(openapi.response.status, 200);
    assert.equal(openapi.payload.openapi, '3.0.3');

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

    console.log(JSON.stringify({ ok: true, docs: true, productId, conversationId, messageId, unreadCount: matchedConversation.unreadCount }, null, 2));
  } finally {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await mongoose.disconnect();
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});









