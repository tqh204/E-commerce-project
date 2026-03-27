const s = {
  token: localStorage.getItem('market_access_token') || '',
  user: null,
  categories: [],
  products: [],
  selected: null,
  selectedAuction: null,
  orders: [],
  auctions: [],
  conversations: [],
  escrows: [],
  reviews: [],
  filters: {},
  activeConversationId: '',
  activeMessages: [],
  socket: null,
  socketReady: false,
  typingUsers: {},
  typingTimer: null,
};

const $ = (id) => document.getElementById(id);
const F = (n) => Number(n || 0).toLocaleString('vi-VN');
const D = (v) => (v ? new Date(v).toLocaleString('vi-VN') : 'n/a');
const log = (label, payload) => {
  $('log').textContent = `[${new Date().toLocaleTimeString('vi-VN')}] ${label}\n${typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2)}\n\n` + $('log').textContent;
};
const setToken = (token) => {
  s.token = token || '';
  if (s.token) localStorage.setItem('market_access_token', s.token);
  else localStorage.removeItem('market_access_token');
};
const headers = (extra = {}) => {
  const next = { ...extra };
  if (s.token) next.Authorization = `Bearer ${s.token}`;
  return next;
};
const api = async (url, options = {}) => {
  const response = await fetch(url, { credentials: 'include', ...options, headers: headers(options.headers || {}) });
  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : { success: response.ok, data: await response.text() };
  if (!response.ok || payload.success === false) throw new Error(payload.message || `Request failed (${response.status})`);
  return payload;
};
const qs = (obj = {}) => {
  const query = new URLSearchParams();
  Object.entries(obj).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') query.set(key, value);
  });
  return query.toString();
};
const esc = (v) => String(v || '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
const selectedAuction = () => s.auctions.find((a) => String(a.product?._id || a.product) === String(s.selected?._id)) || null;
const activeConversation = () => s.conversations.find((c) => c._id === s.activeConversationId) || null;
const quoteText = (message) => {
  if (!message) return '';
  if (message.status === 'deleted') return 'Tin nhan da thu hoi';
  if (message.content && message.content !== '[image]') return message.content;
  if (message.attachmentUrls?.length) return `[${message.attachmentUrls.length} anh]`;
  return '[Tin nhan]';
};
const setConversationUnread = (conversationId, unreadCount) => {
  const conversation = s.conversations.find((item) => item._id === conversationId);
  if (conversation) conversation.unreadCount = Math.max(0, Number(unreadCount || 0));
};
const setChatStatus = (text) => {
  const el = $('chatStatus');
  if (el) el.textContent = text;
};
const normalizeMessage = (m) => ({
  ...m,
  sender: m.sender || {},
  attachments: Array.isArray(m.attachments) ? m.attachments : [],
  attachmentUrls: Array.isArray(m.attachmentUrls) ? m.attachmentUrls : [],
  readBy: Array.isArray(m.readBy) ? m.readBy : [],
  replyTo: m.replyTo || null,
});
const upsertConversation = (conversation) => {
  if (!conversation?._id) return;
  const index = s.conversations.findIndex((item) => item._id === conversation._id);
  if (index >= 0) {
    const prevUnread = Number(s.conversations[index].unreadCount || 0);
    s.conversations[index] = {
      ...s.conversations[index],
      ...conversation,
      unreadCount: conversation.unreadCount !== undefined ? conversation.unreadCount : prevUnread,
    };
  } else s.conversations.unshift({ unreadCount: 0, ...conversation });
  s.conversations.sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0));
};
const upsertActiveMessage = (message) => {
  if (!message?._id) return;
  const normalized = normalizeMessage(message);
  const index = s.activeMessages.findIndex((item) => item._id === normalized._id);
  if (index >= 0) s.activeMessages[index] = { ...s.activeMessages[index], ...normalized };
  else s.activeMessages.push(normalized);
  s.activeMessages.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
};
const syncConv = (conversation, message) => {
  if (!conversation?._id || !message) return;
  upsertConversation({
    ...conversation,
    lastMessage: message.status === 'deleted' ? '[deleted]' : message.content || '[attachment]',
    lastMessageAt: message.createdAt,
    lastMessageId: message._id,
    lastMessageBy: message.sender?._id || message.sender,
  });
};
const disconnectSocket = () => {
  if (s.socket) s.socket.disconnect();
  s.socket = null;
  s.socketReady = false;
  setChatStatus(s.user ? 'Dang offline.' : 'Dang nhap de bat realtime chat.');
};
const setTypingUser = (conversationId, payload) => {
  if (!conversationId) return;
  if (!s.typingUsers[conversationId]) s.typingUsers[conversationId] = {};
  if (payload.isTyping) s.typingUsers[conversationId][payload.userId] = payload.fullName || payload.username || 'Nguoi dung';
  else delete s.typingUsers[conversationId][payload.userId];
};
const mergeReadReceipt = (payload) => {
  const readSet = new Set((payload.messageIds || []).map(String));
  s.activeMessages = s.activeMessages.map((message) => {
    if (!readSet.has(String(message._id))) return message;
    const next = { ...message, readBy: Array.isArray(message.readBy) ? [...message.readBy] : [] };
    if (!next.readBy.some((item) => String(item.userId?._id || item.userId) === String(payload.readerId))) {
      next.readBy.push({ userId: payload.readerId, readAt: payload.readAt });
    }
    if ((next.sender?._id || next.sender) !== payload.readerId) next.status = 'read';
    return next;
  });
  if (String(payload.readerId) === String(s.user?._id)) {
    setConversationUnread(payload.conversationId, 0);
    renderConversations();
  }
};
const connectSocket = () => {
  if (!s.token || typeof io !== 'function') {
    disconnectSocket();
    return;
  }
  if (s.socket) s.socket.disconnect();
  const socket = io({ auth: { token: s.token } });
  s.socket = socket;
  setChatStatus('Dang ket noi realtime...');

  socket.on('connect', () => {
    s.socketReady = true;
    setChatStatus('Realtime chat dang online.');
    if (s.activeConversationId) socket.emit('conversation:join', { conversationId: s.activeConversationId });
  });
  socket.on('disconnect', () => {
    s.socketReady = false;
    setChatStatus(s.user ? 'Mat ket noi realtime, dang cho tu dong noi lai.' : 'Dang nhap de bat realtime chat.');
  });
  socket.on('connect_error', (error) => {
    s.socketReady = false;
    setChatStatus(`Realtime chat loi: ${error.message}`);
    log('Socket error', error.message);
  });
  socket.on('conversation:created', (conversation) => {
    upsertConversation(conversation);
    renderConversations();
    renderChatWindow();
    log('Realtime conversation', { conversationId: conversation._id });
  });
  socket.on('message:created', ({ conversationId, conversation, message }) => {
    const nextMessage = normalizeMessage(message);
    const isMine = String(nextMessage.sender?._id || nextMessage.sender) === String(s.user?._id);
    syncConv(conversation, nextMessage);
    if (!isMine && String(s.activeConversationId) !== String(conversationId)) {
      const matchedConversation = s.conversations.find((item) => item._id === conversationId);
      if (matchedConversation) matchedConversation.unreadCount = Number(matchedConversation.unreadCount || 0) + 1;
    }
    renderConversations();
    if (String(s.activeConversationId) === String(conversationId)) {
      upsertActiveMessage(nextMessage);
      if (!isMine) markConversationRead(conversationId).catch(() => {});
    }
    renderChatWindow();
  });
  socket.on('message:updated', ({ conversationId, conversation, message }) => {
    const nextMessage = normalizeMessage(message);
    syncConv(conversation, nextMessage);
    renderConversations();
    if (String(s.activeConversationId) === String(conversationId)) upsertActiveMessage(nextMessage);
    renderChatWindow();
  });
  socket.on('messages:read', (payload) => {
    mergeReadReceipt(payload);
    renderChatWindow();
  });
  socket.on('typing:update', (payload) => {
    setTypingUser(payload.conversationId, payload);
    renderChatWindow();
  });
  socket.on('chat:error', (payload) => log('Chat error', payload));
};

const renderStats = () => {
  $('stats').innerHTML = [['Products', s.products.length], ['Categories', s.categories.length], ['Auctions', s.products.filter((p) => p.saleType === 'auction').length], ['Chotot', s.products.filter((p) => p.source === 'chotot').length]].map(([label, value]) => `<article class="stat"><strong>${value}</strong><span class="muted">${label}</span></article>`).join('');
};
const sessionBox = () => {
  if (!s.user) {
    $('sessionBox').innerHTML = '<strong>Chua dang nhap</strong><div class="muted tiny">Dang ky hoac dang nhap de mua, bid va dang tin.</div>';
    setChatStatus('Dang nhap de bat realtime chat.');
    return;
  }
  const roles = (s.user.roles || []).map((role) => role.name).join(', ') || 'n/a';
  $('sessionBox').innerHTML = `<strong>${s.user.fullName}</strong><div class="muted tiny">${s.user.email}</div><div class="muted tiny">Roles: ${roles}</div>`;
  setChatStatus(s.socketReady ? 'Realtime chat dang online.' : 'Dang ket noi realtime...');
};
const renderConversations = () => {
  $('conversations').innerHTML = !s.user ? '<div class="muted">Dang nhap de xem chat.</div>' : !s.conversations.length ? '<div class="muted">Chua co conversation.</div>' : s.conversations.map((c) => `<article class="mini" data-conv="${c._id}" style="border-color:${s.activeConversationId === c._id ? 'rgba(213,93,39,.45)' : 'rgba(80,58,39,.08)'};"><h4 style="display:flex;justify-content:space-between;gap:8px;align-items:center;">${esc(c.subject || c.product?.title || 'Conversation')}${Number(c.unreadCount || 0) ? `<span class="badge auction">${Number(c.unreadCount || 0)}</span>` : ''}</h4><div class="meta">${esc(c.lastMessage || 'Chua co noi dung')}</div><div class="meta">Updated: ${D(c.lastMessageAt)}</div></article>`).join('');
  document.querySelectorAll('[data-conv]').forEach((el) => (el.onclick = () => openConversation(el.dataset.conv)));
};
const renderChatWindow = () => {
  const box = $('chatWindow');
  if (!box) return;
  if (!s.user) {
    box.innerHTML = '<div class="muted">Dang nhap de mo chat realtime.</div>';
    return;
  }

  const conversation = activeConversation();
  if (!conversation) {
    box.innerHTML = '<div class="muted">Chon mot conversation o dashboard hoac nhan tin tu trang chi tiet san pham.</div>';
    return;
  }

  const peers = (conversation.participants || []).filter((participant) => String(participant._id || participant) !== String(s.user._id));
  const typingNames = Object.values(s.typingUsers[s.activeConversationId] || {});
  const messageHtml = s.activeMessages.length
    ? s.activeMessages.map((message) => {
        const self = String(message.sender?._id || message.sender) === String(s.user._id);
        const deleted = message.status === 'deleted';
        const seen = self && (message.readBy || []).some((item) => String(item.userId?._id || item.userId) !== String(s.user._id));
        const replyHtml = message.replyTo ? `<div style="margin:8px 0;padding:10px;border-left:3px solid rgba(213,93,39,.45);background:rgba(255,255,255,.65);border-radius:10px;"><div class="tiny muted">Reply</div><strong>${esc(quoteText(message.replyTo))}</strong></div>` : '';
        const textHtml = !deleted && message.content && message.content !== '[image]' ? `<div>${esc(message.content)}</div>` : '';
        const mediaHtml = (message.attachmentUrls || []).map((url, index) => {
          const mediaId = message.attachments?.[index]?._id || message.attachments?.[index] || '';
          const removeButton = self && !deleted && mediaId ? `<button type="button" class="secondary tiny" data-message-id="${message._id}" data-media-id="${mediaId}" style="margin-top:6px;">Xoa anh</button>` : '';
          return `<div style="margin-top:8px;"><img src="${url}" alt="chat-media" style="max-width:100%;border-radius:12px;display:block;">${removeButton}</div>`;
        }).join('');
        const bodyHtml = deleted ? '<div class="muted">Tin nhan da bi thu hoi.</div>' : textHtml || (!mediaHtml ? `<div>${esc(message.content || '[attachment]')}</div>` : '');
        const replyButton = !deleted ? `<button type="button" class="secondary tiny" data-reply-id="${message._id}" style="margin-top:8px;">Reply</button>` : '';
        const editButton = self && !deleted ? `<button type="button" class="secondary tiny" data-edit-id="${message._id}" style="margin-top:8px;">Sua</button>` : '';
        const revokeButton = self && !deleted ? `<button type="button" class="secondary tiny" data-revoke-id="${message._id}" style="margin-top:8px;">Thu hoi</button>` : '';
        return `<article class="chat-message ${self ? 'self' : ''}"><strong>${esc(self ? 'Ban' : message.sender?.fullName || message.sender?.username || 'User')}</strong>${replyHtml}${bodyHtml}${mediaHtml}<div class="chat-meta">${D(message.createdAt)}${message.editedAt ? ' • Da sua' : ''}${self ? ` • ${seen ? 'Da xem' : 'Da gui'}` : ''}</div><div class="actions">${replyButton}${editButton}${revokeButton}</div></article>`;
      }).join('')
    : '<div class="muted">Chua co tin nhan.</div>';

  box.innerHTML = `<div class="mini"><div class="chat-head"><div><h3>${esc(conversation.subject || conversation.product?.title || 'Conversation')}</h3><div class="chat-meta">${peers.map((peer) => esc(peer.fullName || peer.username || 'User')).join(', ') || 'Khong ro doi tuong'}</div></div><button id="closeChatBtn" class="secondary" type="button">Dong</button></div><div id="chatThread" class="chat-thread">${messageHtml}</div><div class="chat-meta" style="margin-top:8px;min-height:18px;">${typingNames.length ? `${esc(typingNames.join(', '))} dang nhap...` : ''}</div><form id="chatSendForm" class="stack" style="margin-top:10px;"><div class="field"><label>Nhap tin nhan</label><textarea id="chatComposer" name="content" placeholder="Nhap tin nhan hoac gui kem hinh..."></textarea></div><div class="field"><label>Gui nhieu anh</label><div id="chatDropzone" style="padding:14px;border:1px dashed rgba(80,58,39,.25);border-radius:14px;background:#fff;cursor:pointer;text-align:center;">Keo tha anh vao day hoac bam de chon toi da 5 anh</div><input id="chatFiles" type="file" accept="image/*" multiple style="margin-top:10px;"><div id="chatPreview" class="chips" style="margin-top:10px;"></div></div><div class="actions"><button class="primary" type="submit">Gui tin realtime</button></div></form></div>`;

  $('closeChatBtn').onclick = () => {
    if (s.socket && s.activeConversationId) {
      s.socket.emit('typing:stop', { conversationId: s.activeConversationId });
      s.socket.emit('conversation:leave', { conversationId: s.activeConversationId });
    }
    s.activeConversationId = '';
    s.activeMessages = [];
    renderConversations();
    renderChatWindow();
  };

  document.querySelectorAll('[data-revoke-id]').forEach((button) => {
    button.onclick = async () => {
      try {
        await api(`/api/conversations/${s.activeConversationId}/messages/${button.dataset.revokeId}`, { method: 'DELETE' });
      } catch (error) {
        alert(error.message);
        log('Revoke message failed', error.message);
      }
    };
  });

  document.querySelectorAll('[data-reply-id]').forEach((button) => {
    button.onclick = async () => {
      const content = prompt('Nhap noi dung reply:', '');
      if (!content) return;
      try {
        await api(`/api/conversations/${s.activeConversationId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, replyTo: button.dataset.replyId, messageType: 'text' }),
        });
      } catch (error) {
        alert(error.message);
        log('Reply message failed', error.message);
      }
    };
  });

  document.querySelectorAll('[data-edit-id]').forEach((button) => {
    button.onclick = async () => {
      const current = s.activeMessages.find((message) => message._id === button.dataset.editId);
      const content = prompt('Sua noi dung message:', current?.content || '');
      if (content === null) return;
      try {
        await api(`/api/conversations/${s.activeConversationId}/messages/${button.dataset.editId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        });
      } catch (error) {
        alert(error.message);
        log('Edit message failed', error.message);
      }
    };
  });

  document.querySelectorAll('[data-media-id]').forEach((button) => {
    button.onclick = async () => {
      try {
        await api(`/api/conversations/${s.activeConversationId}/messages/${button.dataset.messageId}/media/${button.dataset.mediaId}`, { method: 'DELETE' });
      } catch (error) {
        alert(error.message);
        log('Delete image failed', error.message);
      }
    };
  });

  const fileInput = $('chatFiles');
  const preview = $('chatPreview');
  const dropzone = $('chatDropzone');
  const showFiles = (files) => {
    preview.innerHTML = !files.length ? '<span class="muted tiny">Chua chon anh nao.</span>' : files.map((file) => `<span class="badge" style="display:flex;align-items:center;gap:8px;"><img src="${URL.createObjectURL(file)}" alt="preview" style="width:36px;height:36px;object-fit:cover;border-radius:8px;">${esc(file.name)}</span>`).join('');
  };
  const setFiles = (files) => {
    const chosen = Array.from(files || []).filter((file) => String(file.type || '').startsWith('image/')).slice(0, 5);
    const dt = new DataTransfer();
    chosen.forEach((file) => dt.items.add(file));
    fileInput.files = dt.files;
    showFiles(chosen);
  };
  const emitTyping = (flag) => {
    if (s.socket && s.activeConversationId) s.socket.emit(flag ? 'typing:start' : 'typing:stop', { conversationId: s.activeConversationId });
  };

  showFiles(Array.from(fileInput.files || []));
  fileInput.onchange = () => setFiles(fileInput.files);
  dropzone.onclick = () => fileInput.click();
  ['dragenter', 'dragover'].forEach((name) => dropzone.addEventListener(name, (event) => {
    event.preventDefault();
    dropzone.style.borderColor = 'rgba(213,93,39,.6)';
    dropzone.style.background = 'rgba(213,93,39,.08)';
  }));
  ['dragleave', 'drop'].forEach((name) => dropzone.addEventListener(name, (event) => {
    event.preventDefault();
    dropzone.style.borderColor = 'rgba(80,58,39,.25)';
    dropzone.style.background = '#fff';
  }));
  dropzone.addEventListener('drop', (event) => setFiles(event.dataTransfer?.files || []));
  $('chatComposer').addEventListener('input', () => {
    emitTyping(true);
    clearTimeout(s.typingTimer);
    s.typingTimer = setTimeout(() => emitTyping(false), 1200);
  });
  $('chatComposer').addEventListener('blur', () => emitTyping(false));

  $('chatSendForm').onsubmit = async (event) => {
    event.preventDefault();
    const content = $('chatComposer').value.trim();
    const files = Array.from(fileInput.files || []);
    if (!s.activeConversationId || (!content && !files.length)) return;

    try {
      emitTyping(false);
      const messagePayload = await api(`/api/conversations/${s.activeConversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content || (files.length ? '[image]' : ''), messageType: files.length ? 'image' : 'text' }),
      });
      if (files.length === 1) {
        const upload = new FormData();
        upload.append('ownerType', 'message');
        upload.append('ownerId', messagePayload.data._id);
        upload.append('file', files[0]);
        await api('/api/uploads/multipart', { method: 'POST', body: upload });
      } else if (files.length > 1) {
        const upload = new FormData();
        upload.append('ownerType', 'message');
        upload.append('ownerId', messagePayload.data._id);
        files.forEach((file) => upload.append('files', file));
        await api('/api/uploads/multipart-many', { method: 'POST', body: upload });
      }
      $('chatComposer').value = '';
      setFiles([]);
    } catch (error) {
      alert(error.message);
      log('Send message failed', error.message);
    }
  };

  const thread = $('chatThread');
  if (thread) thread.scrollTop = thread.scrollHeight;
};

const renderCategories = () => {
  const options = ['<option value="">Tat ca danh muc</option>', ...s.categories.map((category) => `<option value="${category._id}">${category.name}</option>`)].join('');
  $('filterCategory').innerHTML = options;
  $('listingCategory').innerHTML = s.categories.map((category) => `<option value="${category._id}">${category.name}</option>`).join('');
  $('filterCategory').value = s.filters.categoryId || '';
  $('categoryChips').innerHTML = [`<button class="chip ${!s.filters.categoryId ? 'active' : ''}" type="button" data-id="">Tat ca</button>`, ...s.categories.map((category) => `<button class="chip ${s.filters.categoryId === category._id ? 'active' : ''}" type="button" data-id="${category._id}">${category.name}</button>`)].join('');
  document.querySelectorAll('#categoryChips [data-id]').forEach((button) => (button.onclick = async () => {
    s.filters.categoryId = button.dataset.id || '';
    $('filterCategory').value = s.filters.categoryId;
    await loadProducts();
  }));
};
const renderProducts = () => {
  $('catalogMeta').textContent = `${s.products.length} san pham`;
  if (!s.products.length) {
    $('products').innerHTML = '<div class="muted">Khong co san pham.</div>';
    return;
  }
  $('products').innerHTML = s.products.map((product) => `<article class="product" data-id="${product._id}"><div class="thumb">${product.thumbnailImage ? `<img src="${product.thumbnailImage}" alt="${esc(product.title)}">` : 'No image'}</div><div class="body"><div class="chips"><span class="badge ${product.saleType === 'auction' ? 'auction' : ''}">${product.saleType === 'auction' ? 'Auction' : 'Buy now'}</span><span class="badge">${product.source}</span></div><h3>${esc(product.title)}</h3><div class="price">${F(product.saleType === 'auction' ? product.currentBid || product.startingBid || product.price : product.price)} VND</div><div class="meta">${esc([product.ward, product.district, product.province].filter(Boolean).join(', ') || product.addressText || 'Khong ro vi tri')}<br>${esc(product.seller?.fullName || product.seller?.username || 'Unknown seller')}</div></div></article>`).join('');
  document.querySelectorAll('.product[data-id]').forEach((card) => (card.onclick = () => selectProduct(card.dataset.id)));
};
const renderOrders = () => { $('orders').innerHTML = !s.user ? '<div class="muted">Dang nhap de xem orders.</div>' : !s.orders.length ? '<div class="muted">Chua co order.</div>' : s.orders.map((order) => `<article class="mini"><h4>${esc(order.product?.title || 'Order')}</h4><div class="meta">Status: ${order.status}</div><div class="meta">Total: ${F(order.totalAmount)} VND</div></article>`).join(''); };
const renderAuctions = () => { $('auctions').innerHTML = !s.auctions.length ? '<div class="muted">Chua co auction.</div>' : s.auctions.map((auction) => `<article class="mini" data-auction="${auction._id}"><h4>${esc(auction.product?.title || 'Auction')}</h4><div class="meta">Status: ${auction.status}</div><div class="meta">Current bid: ${F(auction.currentBid || auction.startingBid)} VND</div><div class="meta">End: ${D(auction.endAt)}</div></article>`).join(''); document.querySelectorAll('[data-auction]').forEach((el) => (el.onclick = () => loadAuctionDetail(el.dataset.auction))); };
const renderEscrows = () => { $('escrows').innerHTML = !s.user ? '<div class="muted">Dang nhap de xem escrow.</div>' : !s.escrows.length ? '<div class="muted">Chua co escrow.</div>' : s.escrows.map((escrow) => `<article class="mini"><h4>${esc(escrow.order?.orderCode || 'Escrow')}</h4><div class="meta">Status: ${escrow.status}</div><div class="meta">Amount: ${F(escrow.amount)} VND</div><div class="meta">Buyer: ${esc(escrow.buyer?.fullName || escrow.buyer?.username || 'n/a')}</div><div class="meta">Seller: ${esc(escrow.seller?.fullName || escrow.seller?.username || 'n/a')}</div><div class="meta">Dispute: ${esc(escrow.disputeReason || 'n/a')}</div><div class="meta">Notes: ${esc(escrow.resolutionNotes || 'n/a')}</div><div class="meta">Held: ${D(escrow.heldAt)} | Released: ${D(escrow.releasedAt)} | Refunded: ${D(escrow.refundedAt)}</div><div class="actions" style="margin-top:8px;"><button class="secondary" type="button" data-escrow-action="hold" data-escrow-id="${escrow._id}">Hold</button><button class="secondary" type="button" data-escrow-action="release" data-escrow-id="${escrow._id}">Release</button><button class="secondary" type="button" data-escrow-action="dispute" data-escrow-id="${escrow._id}">Dispute</button><button class="secondary" type="button" data-escrow-action="refund" data-escrow-id="${escrow._id}">Refund</button></div></article>`).join(''); document.querySelectorAll('[data-escrow-id]').forEach((button) => (button.onclick = () => updateEscrow(button.dataset.escrowId, button.dataset.escrowAction))); };
const renderReviews = () => { $('reviews').innerHTML = !s.user ? '<div class="muted">Dang nhap de xem review.</div>' : !s.reviews.length ? '<div class="muted">Chua co review nao.</div>' : s.reviews.map((review) => `<article class="mini"><h4>${esc(review.product?.title || 'Review')}</h4><div class="meta">Score: ${review.score}/5</div><div class="meta">${esc(review.comment || 'Khong co noi dung')}</div></article>`).join(''); };
const renderDetail = () => {
  if (!s.selected) {
    $('detail').innerHTML = '<div class="muted">Chon mot san pham de xem chi tiet.</div>';
    return;
  }
  const product = s.selected;
  const auction = s.selectedAuction || selectedAuction();
  const isOwner = s.user && String(product.seller?._id || product.seller) === String(s.user._id);
  $('detail').innerHTML = `${product.thumbnailImage ? `<img src="${product.thumbnailImage}" alt="${esc(product.title)}">` : ''}<h2>${esc(product.title)}</h2><div class="price">${F(product.saleType === 'auction' ? product.currentBid || product.startingBid || product.price : product.price)} VND</div><p class="meta">${esc(product.description || 'Khong co mo ta')}</p><div class="mini"><div class="meta">Nguon: ${product.source}</div><div class="meta">Seller: ${esc(product.seller?.fullName || product.seller?.username || 'n/a')}</div><div class="meta">Vi tri: ${esc([product.ward, product.district, product.province].filter(Boolean).join(', ') || product.addressText || 'n/a')}</div><div class="meta">Tags: ${esc((product.tags || []).join(', ') || 'n/a')}</div></div><div class="stack" style="margin-top:12px;"><button id="buyBtn" class="primary" ${product.saleType === 'auction' || !s.user || isOwner ? 'disabled' : ''}>Mua ngay</button><div class="${product.saleType === 'auction' ? '' : 'hidden'}"><div class="field"><label>Dat gia</label><input id="bidInput" type="number" min="0" placeholder="${auction ? auction.currentBid || auction.startingBid || product.price : product.price}" ${!s.user || isOwner || !auction ? 'disabled' : ''}></div><button id="bidBtn" class="primary" ${!s.user || isOwner || !auction ? 'disabled' : ''}>Dat bid</button><div class="muted tiny" style="margin-top:8px;">${auction ? `Auction ket thuc: ${D(auction.endAt)}` : 'Chua co auction detail'}</div>${product.saleType === 'auction' && s.user && isOwner && auction ? '<button id="closeAuctionBtn" class="secondary" style="margin-top:8px;">Dong auction</button>' : ''}</div><div class="field"><label>Gui tin nhanh</label><textarea id="messageInput" ${!s.user || isOwner ? 'disabled' : ''}>Xin chao, san pham nay con khong?</textarea></div><button id="chatBtn" class="secondary" ${!s.user || isOwner ? 'disabled' : ''}>Mo chat voi nguoi ban</button></div>`;
  $('buyBtn')?.addEventListener('click', createOrder);
  $('bidBtn')?.addEventListener('click', () => placeBid(Number($('bidInput').value || 0)));
  $('chatBtn')?.addEventListener('click', () => startConversation($('messageInput').value.trim()));
  $('closeAuctionBtn')?.addEventListener('click', closeSelectedAuction);
};
const loadCategories = async () => {
  const payload = await api('/api/categories?limit=100');
  s.categories = payload.data || [];
  renderCategories();
  renderStats();
  log('Loaded categories', { total: s.categories.length });
};
const loadProducts = async () => {
  const payload = await api(`/api/products?${qs({ status: 'active', limit: 24, ...s.filters })}`);
  s.products = payload.data || [];
  renderProducts();
  renderStats();
  renderCategories();
  if (s.selected) {
    const next = s.products.find((item) => item._id === s.selected._id);
    if (next) s.selected = next;
  }
  renderDetail();
  log('Loaded products', { count: s.products.length, filters: s.filters });
};
const loadAuctions = async () => {
  const payload = await api('/api/auctions?limit=30');
  s.auctions = payload.data || [];
  renderAuctions();
  renderDetail();
  log('Loaded auctions', { total: s.auctions.length });
};
const loadOrders = async () => {
  if (!s.user) { s.orders = []; renderOrders(); return; }
  const payload = await api('/api/orders?limit=20');
  s.orders = payload.data || [];
  renderOrders();
  log('Loaded orders', { total: s.orders.length });
};
const loadConversations = async () => {
  if (!s.user) {
    s.conversations = [];
    s.activeConversationId = '';
    s.activeMessages = [];
    renderConversations();
    renderChatWindow();
    return;
  }
  const payload = await api('/api/conversations?limit=20');
  s.conversations = payload.data || [];
  renderConversations();
  if (s.activeConversationId && !s.conversations.some((item) => item._id === s.activeConversationId)) {
    s.activeConversationId = '';
    s.activeMessages = [];
  }
  renderChatWindow();
  log('Loaded conversations', { total: s.conversations.length });
};
const loadEscrows = async () => {
  if (!s.user) { s.escrows = []; renderEscrows(); return; }
  const payload = await api('/api/escrows?limit=20');
  s.escrows = payload.data || [];
  renderEscrows();
  log('Loaded escrows', { total: s.escrows.length });
};
const loadReviews = async () => {
  if (!s.user) { s.reviews = []; renderReviews(); return; }
  const payload = await api(`/api/reviews?reviewerId=${s.user._id}&limit=20`);
  s.reviews = payload.data || [];
  renderReviews();
  log('Loaded reviews', { total: s.reviews.length });
};
const selectProduct = async (id) => {
  const payload = await api(`/api/products/${id}`);
  s.selected = payload.data;
  s.selectedAuction = s.auctions.find((auction) => String(auction.product?._id || auction.product) === String(id)) || null;
  if (s.selectedAuction) await loadAuctionDetail(s.selectedAuction._id, true);
  else renderDetail();
  log('Selected product', payload.data);
};
const loadAuctionDetail = async (id, silent = false) => {
  const payload = await api(`/api/auctions/${id}`);
  s.selectedAuction = payload.data.auction;
  renderDetail();
  if (!silent) log('Loaded auction detail', payload.data);
};
const createOrder = async () => {
  if (!s.selected || !s.user) return;
  const body = { productId: s.selected._id, quantity: 1, paymentType: 'escrow', shippingMethod: 'delivery', shippingFee: 30000, platformFee: 20000, shippingAddress: { fullName: s.user.fullName, phone: s.user.phone || '', province: s.selected.province || '', district: s.selected.district || '', ward: s.selected.ward || '', address: s.selected.addressText || '' }, buyerNotes: 'Created from marketplace frontend' };
  const payload = await api('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  log('Created order', payload.data);
  await Promise.all([loadOrders(), loadEscrows()]);
  alert('Tao don hang thanh cong.');
};
const placeBid = async (amount) => {
  if (!s.selectedAuction || !amount) { alert('Nhap gia hop le de dat bid.'); return; }
  const payload = await api(`/api/auctions/${s.selectedAuction._id}/bids`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount }) });
  log('Placed bid', payload.data);
  await Promise.all([loadAuctions(), loadProducts()]);
  alert('Dat bid thanh cong.');
};
const closeSelectedAuction = async () => {
  if (!s.selectedAuction) return;
  const payload = await api(`/api/auctions/${s.selectedAuction._id}/close`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ force: true }) });
  log('Closed auction', payload.data);
  await Promise.all([loadAuctions(), loadProducts(), loadOrders(), loadEscrows()]);
  alert('Dong auction thanh cong.');
};
const markConversationRead = async (conversationId = s.activeConversationId) => {
  if (!conversationId || !s.user) return;
  await api(`/api/conversations/${conversationId}/read`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
  setConversationUnread(conversationId, 0);
  renderConversations();
};
const startConversation = async (message) => {
  if (!s.selected || !s.user) return;
  const sellerId = s.selected.seller?._id || s.selected.seller;
  const payload = await api('/api/conversations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: s.selected._id, otherUserId: sellerId, subject: `Hoi ve ${s.selected.title}`, initialMessage: message || 'Xin chao, san pham nay con khong?' }) });
  upsertConversation(payload.data);
  await loadConversations();
  await openConversation(payload.data._id, true);
  log('Started conversation', payload.data);
};
const openConversation = async (id, silent = false) => {
  const payload = await api(`/api/conversations/${id}/messages?limit=50`);
  s.activeConversationId = id;
  s.activeMessages = (payload.data || []).slice().reverse().map(normalizeMessage);
  setConversationUnread(id, 0);
  renderConversations();
  renderChatWindow();
  if (s.socket) s.socket.emit('conversation:join', { conversationId: id });
  await markConversationRead(id).catch(() => {});
  if (!silent) log(`Conversation ${id}`, { total: s.activeMessages.length });
};
const updateEscrow = async (id, action) => {
  const reason = ['dispute', 'refund'].includes(action) ? prompt(`Nhap ly do cho ${action}:`, action === 'dispute' ? 'Item khong dung mo ta' : 'Buyer yeu cau hoan tien') : '';
  if (reason === null) return;
  const notes = prompt('Ghi chu them (co the bo trong):', 'Updated from marketplace frontend');
  if (notes === null) return;
  const payload = await api(`/api/escrows/${id}/${action}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason, notes }) });
  log(`Escrow ${action}`, payload.data);
  await Promise.all([loadEscrows(), loadOrders()]);
  alert(`Escrow ${action} thanh cong.`);
};
const createReview = async (body) => {
  const payload = await api('/api/reviews', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  log('Created review', payload.data);
  await loadReviews();
  alert('Gui review thanh cong.');
};
const restore = async () => {
  if (!s.token) {
    s.user = null;
    disconnectSocket();
    sessionBox();
    renderChatWindow();
    return;
  }
  try {
    const payload = await api('/api/auth/me');
    s.user = payload.data;
    sessionBox();
    connectSocket();
    await Promise.allSettled([loadOrders(), loadConversations(), loadEscrows(), loadReviews()]);
    log('Restored session', payload.data);
  } catch (error) {
    setToken('');
    s.user = null;
    disconnectSocket();
    sessionBox();
    renderChatWindow();
    log('Restore session failed', error.message);
  }
};
const login = async (body) => {
  const payload = await api('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  setToken(payload.data.accessToken);
  s.user = payload.data.user;
  sessionBox();
  connectSocket();
  await Promise.allSettled([loadOrders(), loadConversations(), loadEscrows(), loadReviews()]);
  log('Logged in', payload.data.user);
};
const register = async (body) => {
  const payload = await api('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  setToken(payload.data.accessToken);
  s.user = payload.data.user;
  sessionBox();
  connectSocket();
  await Promise.allSettled([loadOrders(), loadConversations(), loadEscrows(), loadReviews()]);
  log('Registered user', payload.data.user);
};
$('loginForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  try { await login(Object.fromEntries(new FormData(event.currentTarget).entries())); }
  catch (error) { alert(error.message); log('Login failed', error.message); }
});
$('registerForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  try { await register(Object.fromEntries(new FormData(event.currentTarget).entries())); }
  catch (error) { alert(error.message); log('Register failed', error.message); }
});
$('meBtn').addEventListener('click', restore);
$('logoutBtn').addEventListener('click', async () => {
  try { await api('/api/auth/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) }); }
  catch (error) { log('Logout warning', error.message); }
  disconnectSocket();
  setToken('');
  s.user = null;
  s.orders = [];
  s.conversations = [];
  s.activeConversationId = '';
  s.activeMessages = [];
  s.typingUsers = {};
  s.escrows = [];
  s.reviews = [];
  sessionBox();
  renderOrders();
  renderConversations();
  renderEscrows();
  renderReviews();
  renderChatWindow();
});
$('filterForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  s.filters = Object.fromEntries(new FormData(event.currentTarget).entries());
  await loadProducts();
});
$('resetFilterBtn').addEventListener('click', async () => {
  $('filterForm').reset();
  s.filters = {};
  await loadProducts();
});
$('reloadBtn').addEventListener('click', async () => { await Promise.all([loadProducts(), loadAuctions()]); });
$('reloadDashBtn').addEventListener('click', async () => { await Promise.all([loadOrders(), loadAuctions(), loadConversations(), loadEscrows(), loadReviews()]); });
$('refreshChatBtn')?.addEventListener('click', async () => {
  await loadConversations();
  if (s.activeConversationId) await openConversation(s.activeConversationId, true);
});
$('reviewForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!s.user) { alert('Dang nhap truoc khi review.'); return; }
  const body = Object.fromEntries(new FormData(event.currentTarget).entries());
  body.score = Number(body.score || 5);
  try {
    await createReview(body);
    event.currentTarget.reset();
  } catch (error) {
    alert(error.message);
    log('Create review failed', error.message);
  }
});
$('listingForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!s.user) { alert('Dang nhap truoc khi dang tin.'); return; }
  const formData = new FormData(event.currentTarget);
  const file = formData.get('file');
  const saleType = formData.get('saleType');
  const body = {
    categoryId: formData.get('categoryId'),
    title: formData.get('title'),
    description: formData.get('description'),
    price: Number(formData.get('price') || 0),
    saleType,
    condition: formData.get('condition'),
    addressText: formData.get('addressText'),
    province: formData.get('province'),
    district: formData.get('district'),
    ward: formData.get('ward'),
    tags: String(formData.get('tags') || '').split(',').map((value) => value.trim()).filter(Boolean),
    status: 'active',
    fulfillmentType: 'both',
  };

  try {
    const productPayload = await api('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const product = productPayload.data;
    log('Created listing', product);
    if (file && file.size > 0) {
      const upload = new FormData();
      upload.append('ownerType', 'product');
      upload.append('ownerId', product._id);
      upload.append('isPrimary', 'true');
      upload.append('file', file);
      const uploadPayload = await api('/api/uploads/multipart', { method: 'POST', body: upload });
      log('Uploaded listing image', uploadPayload.data);
    }
    if (saleType === 'auction') {
      const start = formData.get('auctionStart');
      const end = formData.get('auctionEnd');
      const startingBid = Number(formData.get('startingBid') || 0);
      if (start && end && startingBid > 0) {
        const auctionPayload = await api('/api/auctions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: product._id, startAt: new Date(start).toISOString(), endAt: new Date(end).toISOString(), startingBid, currentBid: startingBid, bidStep: Number(formData.get('bidStep') || 500000), buyNowPrice: Number(formData.get('buyNowPrice') || 0) || undefined, status: 'live' }) });
        log('Created auction', auctionPayload.data);
      }
    }
    event.currentTarget.reset();
    await Promise.all([loadProducts(), loadAuctions(), loadOrders()]);
    alert('Tao listing thanh cong.');
  } catch (error) {
    alert(error.message);
    log('Create listing failed', error.message);
  }
});

const boot = async () => {
  renderStats();
  renderProducts();
  renderOrders();
  renderAuctions();
  renderConversations();
  renderEscrows();
  renderReviews();
  renderChatWindow();
  sessionBox();
  await Promise.allSettled([loadCategories(), loadProducts(), loadAuctions()]);
  await restore();
};

boot();

