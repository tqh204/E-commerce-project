const fs = require('fs');
const path = require('path');
const { Conversation, Media, Message, Product } = require('../schemas');
const { emitConversationCreated, emitMessageCreated, emitMessageUpdated, emitMessagesRead } = require('../lib/socket');
const {
  asyncHandler,
  buildPaginationMeta,
  parsePagination,
  sendError,
  sendSuccess,
} = require('../lib/http');

const populateConversation = (query) =>
  query
    .populate('participants', 'username fullName avatarUrl')
    .populate('product', 'title thumbnailImage seller');

const loadConversationForClient = (conversationId) =>
  populateConversation(Conversation.findById(conversationId));

const ensureParticipant = async (conversationId, userId) => {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    return null;
  }

  const isParticipant = conversation.participants.some((id) => String(id) === String(userId));
  return isParticipant ? conversation : false;
};

const loadHydratedMessage = (messageId) =>
  Message.findById(messageId)
    .populate('sender', 'username fullName avatarUrl')
    .populate('replyTo', 'content status sender createdAt');

const attachConversationMeta = async (conversations, userId) => {
  const list = Array.isArray(conversations) ? conversations : [conversations];
  const enriched = await Promise.all(
    list.map(async (conversation) => {
      if (!conversation) {
        return conversation;
      }

      const unreadCount = await Message.countDocuments({
        conversation: conversation._id,
        sender: { $ne: userId },
        'readBy.userId': { $ne: userId },
      });

      const payload =
        typeof conversation.toObject === 'function'
          ? conversation.toObject({ virtuals: true })
          : { ...conversation };

      const readState = (payload.readBy || []).find(
        (item) => String(item.userId?._id || item.userId) === String(userId)
      );

      payload.unreadCount = unreadCount;
      payload.lastReadAt = readState?.readAt || null;
      return payload;
    })
  );

  return Array.isArray(conversations) ? enriched : enriched[0];
};

const updateConversationPreview = async (conversationId, fallbackMessage) => {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    return null;
  }

  const latestMessage = await Message.findOne({ conversation: conversationId }).sort({ createdAt: -1 });
  const previewMessage = latestMessage || fallbackMessage;
  conversation.lastMessageId = previewMessage?._id || null;
  conversation.lastMessage = previewMessage
    ? previewMessage.status === 'deleted'
      ? '[deleted]'
      : previewMessage.content || '[attachment]'
    : '';
  conversation.lastMessageBy = previewMessage?.sender || null;
  conversation.lastMessageAt = previewMessage?.createdAt || conversation.updatedAt || new Date();
  await conversation.save();
  return loadConversationForClient(conversationId);
};

const removeLocalFileIfNeeded = (url) => {
  if (!url || !String(url).startsWith('/uploads/')) {
    return;
  }
  const absolutePath = path.join(__dirname, '..', 'public', String(url));
  if (fs.existsSync(absolutePath)) {
    fs.unlinkSync(absolutePath);
  }
};

const removeMediaEntries = async (mediaIds = []) => {
  if (!mediaIds.length) {
    return;
  }
  const medias = await Media.find({ _id: { $in: mediaIds } });
  medias.forEach((media) => removeLocalFileIfNeeded(media.url));
  await Media.deleteMany({ _id: { $in: mediaIds } });
};

exports.listConversations = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = { participants: req.user._id };
  const [conversations, total] = await Promise.all([
    populateConversation(Conversation.find(filter))
      .sort({ lastMessageAt: -1 })
      .skip(skip)
      .limit(limit),
    Conversation.countDocuments(filter),
  ]);

  const payload = await attachConversationMeta(conversations, req.user._id);
  return sendSuccess(res, payload, buildPaginationMeta(page, limit, total));
});

exports.createConversation = asyncHandler(async (req, res) => {
  const participantIds = new Set([String(req.user._id)]);
  if (req.body.otherUserId) {
    participantIds.add(String(req.body.otherUserId));
  }
  if (Array.isArray(req.body.participants)) {
    req.body.participants.forEach((id) => participantIds.add(String(id)));
  }

  if (participantIds.size < 2) {
    return sendError(res, 'Conversation needs at least two participants', 400);
  }

  if (req.body.productId) {
    const product = await Product.findById(req.body.productId);
    if (!product) {
      return sendError(res, 'Product not found', 404);
    }
  }

  const participants = Array.from(participantIds);
  let conversation = await Conversation.findOne({
    product: req.body.productId || null,
    participants: { $all: participants, $size: participants.length },
  });

  let createdNewConversation = false;
  if (!conversation) {
    conversation = await Conversation.create({
      participants,
      product: req.body.productId,
      order: req.body.orderId,
      type: req.body.type || (req.body.productId ? 'product' : 'direct'),
      subject: req.body.subject,
      lastMessage: req.body.initialMessage || '',
      lastMessageBy: req.user._id,
      lastMessageAt: new Date(),
    });
    createdNewConversation = true;
  }

  let message = null;
  if (req.body.initialMessage) {
    message = await Message.create({
      conversation: conversation._id,
      sender: req.user._id,
      content: req.body.initialMessage,
      status: 'sent',
      readBy: [{ userId: req.user._id, readAt: new Date() }],
    });
    conversation.lastMessageId = message._id;
    conversation.lastMessage = message.content;
    conversation.lastMessageBy = req.user._id;
    conversation.lastMessageAt = message.createdAt;
    await conversation.save();
  }

  const hydratedConversation = await attachConversationMeta(
    await loadConversationForClient(conversation._id),
    req.user._id
  );
  if (createdNewConversation) {
    emitConversationCreated(hydratedConversation);
  }

  if (message) {
    const hydratedMessage = await loadHydratedMessage(message._id);
    emitMessageCreated(hydratedConversation, hydratedMessage);
  }

  return sendSuccess(res, hydratedConversation, null, 201);
});

exports.getConversationMessages = asyncHandler(async (req, res) => {
  const conversation = await ensureParticipant(req.params.id, req.user._id);
  if (conversation === null) {
    return sendError(res, 'Conversation not found', 404);
  }
  if (conversation === false) {
    return sendError(res, 'Forbidden', 403);
  }

  const { page, limit, skip } = parsePagination(req.query);
  const [messages, total] = await Promise.all([
    Message.find({ conversation: conversation._id })
      .populate('sender', 'username fullName avatarUrl')
      .populate('replyTo', 'content status sender createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Message.countDocuments({ conversation: conversation._id }),
  ]);

  return sendSuccess(res, messages, buildPaginationMeta(page, limit, total));
});

exports.sendMessage = asyncHandler(async (req, res) => {
  const conversation = await ensureParticipant(req.params.id, req.user._id);
  if (conversation === null) {
    return sendError(res, 'Conversation not found', 404);
  }
  if (conversation === false) {
    return sendError(res, 'Forbidden', 403);
  }

  const message = await Message.create({
    conversation: conversation._id,
    sender: req.user._id,
    content: req.body.content,
    attachmentUrls: req.body.attachmentUrls,
    attachments: req.body.attachments,
    messageType: req.body.messageType,
    replyTo: req.body.replyTo,
    status: 'sent',
    readBy: [{ userId: req.user._id, readAt: new Date() }],
  });

  conversation.lastMessageId = message._id;
  conversation.lastMessage = message.content || '[attachment]';
  conversation.lastMessageBy = req.user._id;
  conversation.lastMessageAt = message.createdAt;
  await conversation.save();

  const hydratedConversation = await attachConversationMeta(
    await loadConversationForClient(conversation._id),
    req.user._id
  );
  const hydratedMessage = await loadHydratedMessage(message._id);

  emitMessageCreated(hydratedConversation, hydratedMessage);

  return sendSuccess(res, hydratedMessage, null, 201);
});

exports.markConversationRead = asyncHandler(async (req, res) => {
  const conversation = await ensureParticipant(req.params.id, req.user._id);
  if (conversation === null) {
    return sendError(res, 'Conversation not found', 404);
  }
  if (conversation === false) {
    return sendError(res, 'Forbidden', 403);
  }

  const unreadMessages = await Message.find({
    conversation: conversation._id,
    sender: { $ne: req.user._id },
    'readBy.userId': { $ne: req.user._id },
  });

  const readAt = new Date();
  for (const message of unreadMessages) {
    message.readBy.push({ userId: req.user._id, readAt });
    const hasText = Boolean(String(message.content || '').trim());
    const hasAttachment =
      Array.isArray(message.attachments) && message.attachments.length > 0 ||
      Array.isArray(message.attachmentUrls) && message.attachmentUrls.length > 0;

    if (!hasText && !hasAttachment) {
      message.status = 'deleted';
    } else if (message.status !== 'deleted') {
      message.status = 'read';
    }
    await message.save();
  }

  const existingRead = conversation.readBy.find((item) => String(item.userId) === String(req.user._id));
  if (existingRead) {
    existingRead.readAt = readAt;
  } else {
    conversation.readBy.push({ userId: req.user._id, readAt });
  }
  await conversation.save();

  const hydratedConversation = await attachConversationMeta(
    await loadConversationForClient(conversation._id),
    req.user._id
  );
  emitMessagesRead(hydratedConversation, {
    conversationId: String(conversation._id),
    readerId: String(req.user._id),
    readAt,
    messageIds: unreadMessages.map((message) => String(message._id)),
  });

  return sendSuccess(res, { readAt, messageIds: unreadMessages.map((message) => message._id) });
});

exports.updateMessage = asyncHandler(async (req, res) => {
  const conversation = await ensureParticipant(req.params.id, req.user._id);
  if (conversation === null) {
    return sendError(res, 'Conversation not found', 404);
  }
  if (conversation === false) {
    return sendError(res, 'Forbidden', 403);
  }

  const message = await Message.findOne({ _id: req.params.messageId, conversation: conversation._id });
  if (!message) {
    return sendError(res, 'Message not found', 404);
  }

  const isOwner = String(message.sender) === String(req.user._id);
  const isAdmin = (req.userRoles || []).includes('admin');
  if (!isOwner && !isAdmin) {
    return sendError(res, 'Forbidden', 403);
  }
  if (message.status === 'deleted') {
    return sendError(res, 'Deleted message cannot be edited', 400);
  }

  if (req.body.content !== undefined) {
    message.content = req.body.content;
  }
  if (req.body.replyTo !== undefined) {
    message.replyTo = req.body.replyTo || null;
  }
  if (req.body.messageType) {
    message.messageType = req.body.messageType;
  }
  message.editedAt = new Date();
  message.editedBy = req.user._id;

  await message.save();

  const hydratedConversation = await attachConversationMeta(
    await updateConversationPreview(conversation._id, message),
    req.user._id
  );
  const hydratedMessage = await loadHydratedMessage(message._id);
  emitMessageUpdated(hydratedConversation, hydratedMessage);

  return sendSuccess(res, hydratedMessage);
});

exports.deleteMessage = asyncHandler(async (req, res) => {
  const conversation = await ensureParticipant(req.params.id, req.user._id);
  if (conversation === null) {
    return sendError(res, 'Conversation not found', 404);
  }
  if (conversation === false) {
    return sendError(res, 'Forbidden', 403);
  }

  const message = await Message.findOne({ _id: req.params.messageId, conversation: conversation._id });
  if (!message) {
    return sendError(res, 'Message not found', 404);
  }

  const isOwner = String(message.sender) === String(req.user._id);
  const isAdmin = (req.userRoles || []).includes('admin');
  if (!isOwner && !isAdmin) {
    return sendError(res, 'Forbidden', 403);
  }

  await removeMediaEntries(message.attachments || []);
  message.content = '';
  message.attachments = [];
  message.attachmentUrls = [];
  message.status = 'deleted';
  message.messageType = 'text';
  await message.save();

  const hydratedConversation = await attachConversationMeta(
    await updateConversationPreview(conversation._id, message),
    req.user._id
  );
  const hydratedMessage = await loadHydratedMessage(message._id);
  emitMessageUpdated(hydratedConversation, hydratedMessage);

  return sendSuccess(res, hydratedMessage);
});

exports.deleteMessageAttachment = asyncHandler(async (req, res) => {
  const conversation = await ensureParticipant(req.params.id, req.user._id);
  if (conversation === null) {
    return sendError(res, 'Conversation not found', 404);
  }
  if (conversation === false) {
    return sendError(res, 'Forbidden', 403);
  }

  const message = await Message.findOne({ _id: req.params.messageId, conversation: conversation._id });
  if (!message) {
    return sendError(res, 'Message not found', 404);
  }

  const isOwner = String(message.sender) === String(req.user._id);
  const isAdmin = (req.userRoles || []).includes('admin');
  if (!isOwner && !isAdmin) {
    return sendError(res, 'Forbidden', 403);
  }

  const media = await Media.findById(req.params.mediaId);
  if (!media) {
    return sendError(res, 'Media not found', 404);
  }

  message.attachments = (message.attachments || []).filter(
    (attachmentId) => String(attachmentId) !== String(media._id)
  );
  message.attachmentUrls = (message.attachmentUrls || []).filter((url) => url !== media.url);

  if (!message.attachmentUrls.length && message.content === '[image]') {
    message.content = '';
    message.status = 'deleted';
  }

  await message.save();
  removeLocalFileIfNeeded(media.url);
  await media.deleteOne();

  const hydratedConversation = await attachConversationMeta(
    await updateConversationPreview(conversation._id, message),
    req.user._id
  );
  const hydratedMessage = await loadHydratedMessage(message._id);
  emitMessageUpdated(hydratedConversation, hydratedMessage);

  return sendSuccess(res, hydratedMessage);
});
