var assert = require('node:assert/strict');
var http = require('http');
var mongoose = require('mongoose');

var app = require('../app');
var connectDB = require('../config/database');
var socketLib = require('../lib/socket');
var schemas = require('../schemas');

var initSocket = socketLib.initSocket;
var Address = schemas.Address;
var Conversation = schemas.Conversation;
var Message = schemas.Message;
var Product = schemas.Product;

var server;
var baseUrl;

var request = async function(path, options) {
  var response;
  var text;
  var payload = null;

  if (!options) {
    options = {};
  }

  response = await fetch(baseUrl + path, options);
  text = await response.text();

  try {
    payload = text ? JSON.parse(text) : null;
  } catch (error) {
    payload = { raw: text };
  }

  return {
    response: response,
    payload: payload,
    text: text,
  };
};

var assertAuthPayload = function(payload) {
  assert.ok(payload && payload.data && payload.data.accessToken);
  assert.ok(payload && payload.data && payload.data.refreshToken);
};

var login = async function(identifier, password) {
  var result = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: identifier, password: password }),
  });

  assert.equal(result.response.status, 200);
  assertAuthPayload(result.payload);
  return result.payload.data;
};

var listenOnRandomPort = function(serverInstance) {
  return new Promise(function(resolve) {
    serverInstance.listen(0, resolve);
  });
};

var closeServer = function(serverInstance) {
  return new Promise(function(resolve) {
    serverInstance.close(resolve);
  });
};

var findConversationById = function(items, conversationId) {
  var index;

  for (index = 0; index < items.length; index += 1) {
    if (items[index]._id === conversationId) {
      return items[index];
    }
  }

  return null;
};

var main = async function() {
  var createdAddressId = null;
  var createdConversationId = null;
  var createdProductId = null;
  var homepage;
  var reactApp;
  var sellerCreatePage;
  var adminCreatePage;
  var docsPage;
  var openapi;
  var sellerAuth;
  var buyerAuth;
  var sellerToken;
  var buyerToken;
  var refresh;
  var currentUser;
  var publicSeller;
  var profileUpdate;
  var createAddress;
  var listAddresses;
  var categories;
  var categoryId;
  var productCreate;
  var productId;
  var sellerId;
  var conversationCreate;
  var conversationId;
  var messageCreate;
  var messageId;
  var messageEdit;
  var markRead;
  var conversationList;
  var matchedConversation;

  await connectDB();
  server = http.createServer(app);
  initSocket(server);
  await listenOnRandomPort(server);
  baseUrl = 'http://127.0.0.1:' + server.address().port;

  try {
    homepage = await request('/');
    assert.equal(homepage.response.status, 200);
    assert.match(homepage.text, /Marketplace React/i);

    reactApp = await request('/react');
    assert.equal(reactApp.response.status, 200);
    assert.match(reactApp.text, /Marketplace React/i);

    sellerCreatePage = await request('/sell/products/create');
    assert.equal(sellerCreatePage.response.status, 200);
    assert.match(sellerCreatePage.text, /Marketplace React/i);

    adminCreatePage = await request('/admin/products/create');
    assert.equal(adminCreatePage.response.status, 200);
    assert.match(adminCreatePage.text, /Marketplace React/i);

    docsPage = await request('/docs');
    assert.equal(docsPage.response.status, 200);
    assert.match(docsPage.text, /Marketplace React/i);

    openapi = await request('/api-docs/openapi.json');
    assert.equal(openapi.response.status, 200);
    assert.equal(openapi.payload.openapi, '3.0.3');

    sellerAuth = await login('seller01@example.com', 'password123');
    buyerAuth = await login('buyer01@example.com', 'password123');
    sellerToken = sellerAuth.accessToken;
    buyerToken = buyerAuth.accessToken;

    refresh = await request('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: sellerAuth.refreshToken }),
    });
    assert.equal(refresh.response.status, 200);
    assert.ok(refresh.payload && refresh.payload.data && refresh.payload.data.accessToken);

    currentUser = await request('/api/users/me/profile', {
      headers: { Authorization: 'Bearer ' + sellerToken },
    });
    assert.equal(currentUser.response.status, 200);
    assert.equal(currentUser.payload.data.email, 'seller01@example.com');

    publicSeller = await request('/api/users/' + currentUser.payload.data._id);
    assert.equal(publicSeller.response.status, 200);
    assert.equal(publicSeller.payload.data.email, undefined);

    profileUpdate = await request('/api/users/me/profile', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + sellerToken,
      },
      body: JSON.stringify({
        fullName: 'Nguyen Van Seller Smoke',
        bio: 'Smoke profile update',
      }),
    });
    assert.equal(profileUpdate.response.status, 200);
    assert.equal(profileUpdate.payload.data.bio, 'Smoke profile update');

    createAddress = await request('/api/addresses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + buyerToken,
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

    listAddresses = await request('/api/addresses', {
      headers: { Authorization: 'Bearer ' + buyerToken },
    });
    assert.equal(listAddresses.response.status, 200);
    assert.ok(Array.isArray(listAddresses.payload.data));
    assert.ok(
      listAddresses.payload.data.some(function(item) {
        return item._id === createAddress.payload.data._id;
      })
    );

    categories = await request('/api/categories?limit=1');
    assert.equal(categories.response.status, 200);
    categoryId = categories.payload.data[0]._id;
    assert.ok(categoryId);

    productCreate = await request('/api/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + sellerToken,
      },
      body: JSON.stringify({
        categoryId: categoryId,
        title: 'Smoke Product ' + Date.now(),
        description: 'Smoke test product for automated test suite',
        price: 123456,
        saleType: 'fixed_price',
        condition: 'good',
        status: 'active',
      }),
    });
    assert.equal(productCreate.response.status, 201);
    productId = productCreate.payload.data._id;
    sellerId = productCreate.payload.data.seller;
    createdProductId = productId;

    conversationCreate = await request('/api/conversations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + buyerToken,
      },
      body: JSON.stringify({
        productId: productId,
        otherUserId: sellerId,
        initialMessage: 'Smoke chat start',
      }),
    });
    assert.equal(conversationCreate.response.status, 201);
    conversationId = conversationCreate.payload.data._id;
    createdConversationId = conversationId;

    messageCreate = await request('/api/conversations/' + conversationId + '/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + buyerToken,
      },
      body: JSON.stringify({ content: 'Original smoke message' }),
    });
    assert.equal(messageCreate.response.status, 201);
    messageId = messageCreate.payload.data._id;

    messageEdit = await request('/api/conversations/' + conversationId + '/messages/' + messageId, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + buyerToken,
      },
      body: JSON.stringify({ content: 'Edited smoke message' }),
    });
    assert.equal(messageEdit.response.status, 200);
    assert.equal(messageEdit.payload.data.content, 'Edited smoke message');
    assert.ok(messageEdit.payload.data.editedAt);

    markRead = await request('/api/conversations/' + conversationId + '/read', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + sellerToken,
      },
      body: JSON.stringify({}),
    });
    assert.equal(markRead.response.status, 200);
    assert.ok(Array.isArray(markRead.payload.data.messageIds));

    conversationList = await request('/api/conversations?limit=10', {
      headers: { Authorization: 'Bearer ' + sellerToken },
    });
    assert.equal(conversationList.response.status, 200);
    matchedConversation = findConversationById(conversationList.payload.data, conversationId);
    assert.ok(matchedConversation);
    assert.equal(typeof matchedConversation.unreadCount, 'number');

    console.log(JSON.stringify({
      ok: true,
      docs: true,
      productId: productId,
      conversationId: conversationId,
      messageId: messageId,
      unreadCount: matchedConversation.unreadCount,
    }, null, 2));
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
      await closeServer(server);
    }
    await mongoose.disconnect();
  }
};

main().catch(function(error) {
  console.error(error);
  process.exitCode = 1;
});
