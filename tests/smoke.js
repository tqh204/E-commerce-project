const assert = require('node:assert/strict');
const http = require('http');
const mongoose = require('mongoose');

const app = require('../app');
const connectDB = require('../config/database');
const { initSocket } = require('../lib/socket');
const { Address, Conversation, Message, Product } = require('../schemas');

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
  assert.ok(payload?.data?.refreshToken);
  return payload.data;
};

const main = async () => {
  let createdAddressId = null;
  let createdConversationId = null;
  let createdProductId = null;
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

    const sellerAuth = await login('seller01@example.com', 'password123');
    const buyerAuth = await login('buyer01@example.com', 'password123');
    const sellerToken = sellerAuth.accessToken;
    const buyerToken = buyerAuth.accessToken;

    const refresh = await request('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: sellerAuth.refreshToken }),
    });
    assert.equal(refresh.response.status, 200);
    assert.ok(refresh.payload?.data?.accessToken);

    const currentUser = await request('/api/users/me/profile', {
      headers: { Authorization: `Bearer ${sellerToken}` },
    });
    assert.equal(currentUser.response.status, 200);
    assert.equal(currentUser.payload.data.email, 'seller01@example.com');

    const publicSeller = await request(`/api/users/${currentUser.payload.data._id}`);
    assert.equal(publicSeller.response.status, 200);
    assert.equal(publicSeller.payload.data.email, undefined);

    const profileUpdate = await request('/api/users/me/profile', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sellerToken}`,
      },
      body: JSON.stringify({
        fullName: 'Nguyen Van Seller Smoke',
        bio: 'Smoke profile update',
      }),
    });
    assert.equal(profileUpdate.response.status, 200);
    assert.equal(profileUpdate.payload.data.bio, 'Smoke profile update');

    const createAddress = await request('/api/addresses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${buyerToken}`,
      },
      body: JSON.stringify({
        label: 'work',
        fullName: 'Tran Thi Buyer',
        phone: '+84903333333',
        province: 'Ho Chi Minh',
        district: 'District 1',
        ward: 'Ben Nghe',
        street: '200 Le Loi',
        fullAddress: '200 Le Loi, Ben Nghe, District 1, Ho Chi Minh',
        postalCode: '700000',
        isDefault: true,
      }),
    });
    assert.equal(createAddress.response.status, 201);
    assert.equal(createAddress.payload.data.isDefault, true);
    createdAddressId = createAddress.payload.data._id;

    const listAddresses = await request('/api/addresses', {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    assert.equal(listAddresses.response.status, 200);
    assert.ok(Array.isArray(listAddresses.payload.data));
    assert.ok(listAddresses.payload.data.some((item) => item._id === createAddress.payload.data._id));

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
    createdProductId = productId;

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
    createdConversationId = conversationId;

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
    if (createdConversationId) {
      await Message.deleteMany({ conversation: createdConversationId });
      await Conversation.deleteOne({ _id: createdConversationId });
    }
    if (createdProductId) {
      await Product.deleteOne({ _id: createdProductId });
    }
    if (createdAddressId) {
      await Address.deleteOne({ _id: createdAddressId });
    }
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










