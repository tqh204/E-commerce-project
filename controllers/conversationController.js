var fs = require('fs');
var path = require('path');
var schemas = require('../schemas');
var socketLib = require('../lib/socket');
var notificationLib = require('../lib/notifications');
var httpLib = require('../lib/http');

var Conversation = schemas.Conversation;
var Media = schemas.Media;
var Message = schemas.Message;
var Product = schemas.Product;
var emitConversationCreated = socketLib.emitConversationCreated;
var emitMessageCreated = socketLib.emitMessageCreated;
var emitMessageUpdated = socketLib.emitMessageUpdated;
var emitMessagesRead = socketLib.emitMessagesRead;
var createNotification = notificationLib.createNotification;
var buildPaginationMeta = httpLib.buildPaginationMeta;
var parsePagination = httpLib.parsePagination;

var NEW_MESSAGE_TITLE = 'Tin nhan moi';
var NEW_MESSAGE_FALLBACK = 'Da gui mot tin nhan.';

var createControllerError = function(message, status, details) {
  var error = new Error(message);
  error.status = status || 400;
  if (details !== undefined) {
    error.details = details;
  }
  return error;
};

var populateConversation = function(query) {
  return query
    .populate('participants', 'username fullName avatarUrl')
    .populate('product', 'title thumbnailImage seller');
};

var loadConversationForClient = function(conversationId) {
  return populateConversation(Conversation.findById(conversationId));
};

var getObjectIdValue = function(value) {
  if (value && value._id) {
    return value._id;
  }
  return value;
};

var ensureParticipant = async function(conversationId, userId) {
  var conversation = await Conversation.findById(conversationId);
  var index = 0;
  var isParticipant = false;

  if (!conversation) {
    return null;
  }

  for (index = 0; index < conversation.participants.length; index += 1) {
    if (String(conversation.participants[index]) === String(userId)) {
      isParticipant = true;
      break;
    }
  }

  return isParticipant ? conversation : false;
};

var loadHydratedMessage = function(messageId) {
  return Message.findById(messageId)
    .populate('sender', 'username fullName avatarUrl')
    .populate('replyTo', 'content status sender createdAt');
};

var findReadState = function(readBy, userId) {
  var items = readBy || [];
  var index = 0;

  for (index = 0; index < items.length; index += 1) {
    if (String(getObjectIdValue(items[index].userId)) === String(userId)) {
      return items[index];
    }
  }

  return null;
};

var attachConversationMeta = async function(conversations, userId) {
  var isArrayInput = Array.isArray(conversations);
  var list = isArrayInput ? conversations : [conversations];
  var enriched = [];
  var index = 0;

  for (index = 0; index < list.length; index += 1) {
    var conversation = list[index];
    var payload;
    var unreadCount;
    var readState;

    if (!conversation) {
      enriched.push(conversation);
      continue;
    }

    unreadCount = await Message.countDocuments({
      conversation: conversation._id,
      sender: { $ne: userId },
      'readBy.userId': { $ne: userId },
    });

    payload =
      typeof conversation.toObject === 'function'
        ? conversation.toObject({ virtuals: true })
        : conversation;

    readState = findReadState(payload.readBy, userId);
    payload.unreadCount = unreadCount;
    payload.lastReadAt = readState ? readState.readAt || null : null;
    enriched.push(payload);
  }

  return isArrayInput ? enriched : enriched[0];
};

var getMessagePreview = function(message) {
  if (!message) {
    return '';
  }
  if (message.status === 'deleted') {
    return '[deleted]';
  }
  return message.content || '[attachment]';
};

var updateConversationPreview = async function(conversationId, fallbackMessage) {
  var conversation = await Conversation.findById(conversationId);
  var latestMessage;
  var previewMessage;

  if (!conversation) {
    return null;
  }

  latestMessage = await Message.findOne({ conversation: conversationId }).sort({ createdAt: -1 });
  previewMessage = latestMessage || fallbackMessage || null;

  conversation.lastMessageId = previewMessage ? previewMessage._id || null : null;
  conversation.lastMessage = getMessagePreview(previewMessage);
  conversation.lastMessageBy = previewMessage ? previewMessage.sender || null : null;
  conversation.lastMessageAt = previewMessage
    ? previewMessage.createdAt || conversation.updatedAt || new Date()
    : conversation.updatedAt || new Date();

  await conversation.save();
  return loadConversationForClient(conversationId);
};

var removeLocalFileIfNeeded = function(url) {
  var absolutePath;

  if (!url || String(url).indexOf('/uploads/') !== 0) {
    return;
  }

  absolutePath = path.join(__dirname, '..', 'public', String(url));
  if (fs.existsSync(absolutePath)) {
    fs.unlinkSync(absolutePath);
  }
};

var removeMediaEntries = async function(mediaIds) {
  var ids = mediaIds || [];
  var medias;
  var index;

  if (!ids.length) {
    return;
  }

  medias = await Media.find({ _id: { $in: ids } });
  for (index = 0; index < medias.length; index += 1) {
    removeLocalFileIfNeeded(medias[index].url);
  }
  await Media.deleteMany({ _id: { $in: ids } });
};

var addUniqueParticipant = function(participantIds, userId) {
  var normalizedId = String(userId);

  if (participantIds.indexOf(normalizedId) === -1) {
    participantIds.push(normalizedId);
  }
};

var buildNotificationMessage = function(user, content) {
  var senderName = user.fullName || user.username || 'Nguoi dung';
  var messageContent = content || NEW_MESSAGE_FALLBACK;
  return senderName + ': ' + messageContent;
};

var notifyConversationParticipants = async function(conversation, actorUser, message) {
  var participants = conversation && conversation.participants ? conversation.participants : [];
  var hydratedMessageId = message && message._id ? String(message._id) : '';
  var index;

  for (index = 0; index < participants.length; index += 1) {
    var participant = participants[index];
    var participantId = getObjectIdValue(participant);

    if (!participantId || String(participantId) === String(actorUser._id)) {
      continue;
    }

    await createNotification({
      userId: participantId,
      title: NEW_MESSAGE_TITLE,
      message: buildNotificationMessage(actorUser, message ? message.content : ''),
      type: 'chat_message',
      refType: 'conversation',
      refId: String(conversation._id),
      metadata: {
        conversationId: String(conversation._id),
        messageId: hydratedMessageId,
      },
    });
  }
};

module.exports.listConversations = async function(query, actor) {
  var pagination = parsePagination(query || {});
  var page = pagination.page;
  var limit = pagination.limit;
  var skip = pagination.skip;
  var filter = { participants: actor.user._id };
  var results = await Promise.all([
    populateConversation(Conversation.find(filter))
      .sort({ lastMessageAt: -1 })
      .skip(skip)
      .limit(limit),
    Conversation.countDocuments(filter),
  ]);
  var conversations = results[0];
  var total = results[1];
  var payload = await attachConversationMeta(conversations, actor.user._id);

  return {
    data: payload,
    meta: buildPaginationMeta(page, limit, total),
  };
};

module.exports.createConversation = async function(body, actor) {
  var participantIds = [];
  var participants;
  var conversation;
  var createdNewConversation = false;
  var message = null;
  var hydratedConversation;
  var hydratedMessage;
  var index;

  addUniqueParticipant(participantIds, actor.user._id);
  if (body.otherUserId) {
    addUniqueParticipant(participantIds, body.otherUserId);
  }
  if (Array.isArray(body.participants)) {
    for (index = 0; index < body.participants.length; index += 1) {
      addUniqueParticipant(participantIds, body.participants[index]);
    }
  }

  if (participantIds.length < 2) {
    throw createControllerError('Conversation needs at least two participants', 400);
  }

  if (body.productId) {
    var product = await Product.findById(body.productId);
    if (!product) {
      throw createControllerError('Product not found', 404);
    }
  }

  participants = participantIds.slice();
  conversation = await Conversation.findOne({
    product: body.productId || null,
    participants: { $all: participants, $size: participants.length },
  });

  if (!conversation) {
    conversation = await Conversation.create({
      participants: participants,
      product: body.productId,
      order: body.orderId,
      type: body.type || (body.productId ? 'product' : 'direct'),
      subject: body.subject,
      lastMessage: body.initialMessage || '',
      lastMessageBy: actor.user._id,
      lastMessageAt: new Date(),
    });
    createdNewConversation = true;
  }

  if (body.initialMessage) {
    message = await Message.create({
      conversation: conversation._id,
      sender: actor.user._id,
      content: body.initialMessage,
      status: 'sent',
      readBy: [{ userId: actor.user._id, readAt: new Date() }],
    });
    conversation.lastMessageId = message._id;
    conversation.lastMessage = message.content;
    conversation.lastMessageBy = actor.user._id;
    conversation.lastMessageAt = message.createdAt;
    await conversation.save();
  }

  hydratedConversation = await attachConversationMeta(
    await loadConversationForClient(conversation._id),
    actor.user._id
  );

  if (createdNewConversation) {
    emitConversationCreated(hydratedConversation);
  }

  if (message) {
    hydratedMessage = await loadHydratedMessage(message._id);
    emitMessageCreated(hydratedConversation, hydratedMessage);
    await notifyConversationParticipants(hydratedConversation, actor.user, hydratedMessage);
  }

  return hydratedConversation;
};

module.exports.getConversationMessages = async function(conversationId, query, actor) {
  var conversation = await ensureParticipant(conversationId, actor.user._id);
  var pagination;
  var results;

  if (conversation === null) {
    return null;
  }
  if (conversation === false) {
    throw createControllerError('Forbidden', 403);
  }

  pagination = parsePagination(query || {});
  results = await Promise.all([
    Message.find({ conversation: conversation._id })
      .populate('sender', 'username fullName avatarUrl')
      .populate('replyTo', 'content status sender createdAt')
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit),
    Message.countDocuments({ conversation: conversation._id }),
  ]);

  return {
    data: results[0],
    meta: buildPaginationMeta(pagination.page, pagination.limit, results[1]),
  };
};

module.exports.sendMessage = async function(conversationId, body, actor) {
  var conversation = await ensureParticipant(conversationId, actor.user._id);
  var message;
  var hydratedConversation;
  var hydratedMessage;

  if (conversation === null) {
    return null;
  }
  if (conversation === false) {
    throw createControllerError('Forbidden', 403);
  }

  message = await Message.create({
    conversation: conversation._id,
    sender: actor.user._id,
    content: body.content,
    attachmentUrls: body.attachmentUrls,
    attachments: body.attachments,
    messageType: body.messageType,
    replyTo: body.replyTo,
    status: 'sent',
    readBy: [{ userId: actor.user._id, readAt: new Date() }],
  });

  conversation.lastMessageId = message._id;
  conversation.lastMessage = message.content || '[attachment]';
  conversation.lastMessageBy = actor.user._id;
  conversation.lastMessageAt = message.createdAt;
  await conversation.save();

  hydratedConversation = await attachConversationMeta(
    await loadConversationForClient(conversation._id),
    actor.user._id
  );
  hydratedMessage = await loadHydratedMessage(message._id);

  emitMessageCreated(hydratedConversation, hydratedMessage);
  await notifyConversationParticipants(hydratedConversation, actor.user, hydratedMessage);

  return hydratedMessage;
};

module.exports.markConversationRead = async function(conversationId, actor) {
  var conversation = await ensureParticipant(conversationId, actor.user._id);
  var unreadMessages;
  var readAt;
  var index;
  var hasText;
  var hasAttachment;
  var existingRead;
  var hydratedConversation;
  var messageIds = [];

  if (conversation === null) {
    return null;
  }
  if (conversation === false) {
    throw createControllerError('Forbidden', 403);
  }

  unreadMessages = await Message.find({
    conversation: conversation._id,
    sender: { $ne: actor.user._id },
    'readBy.userId': { $ne: actor.user._id },
  });

  readAt = new Date();
  for (index = 0; index < unreadMessages.length; index += 1) {
    var currentMessage = unreadMessages[index];
    currentMessage.readBy.push({ userId: actor.user._id, readAt: readAt });
    hasText = Boolean(String(currentMessage.content || '').trim());
    hasAttachment =
      (Array.isArray(currentMessage.attachments) && currentMessage.attachments.length > 0) ||
      (Array.isArray(currentMessage.attachmentUrls) && currentMessage.attachmentUrls.length > 0);

    if (!hasText && !hasAttachment) {
      currentMessage.status = 'deleted';
    } else if (currentMessage.status !== 'deleted') {
      currentMessage.status = 'read';
    }

    await currentMessage.save();
    messageIds.push(currentMessage._id);
  }

  existingRead = findReadState(conversation.readBy, actor.user._id);
  if (existingRead) {
    existingRead.readAt = readAt;
  } else {
    conversation.readBy.push({ userId: actor.user._id, readAt: readAt });
  }
  await conversation.save();

  hydratedConversation = await attachConversationMeta(
    await loadConversationForClient(conversation._id),
    actor.user._id
  );

  emitMessagesRead(hydratedConversation, {
    conversationId: String(conversation._id),
    readerId: String(actor.user._id),
    readAt: readAt,
    messageIds: messageIds.map(function(messageId) {
      return String(messageId);
    }),
  });

  return { readAt: readAt, messageIds: messageIds };
};

module.exports.updateMessage = async function(conversationId, messageId, body, actor) {
  var conversation = await ensureParticipant(conversationId, actor.user._id);
  var message;
  var isOwner;
  var isAdmin;
  var hydratedConversation;
  var hydratedMessage;

  if (conversation === null) {
    return null;
  }
  if (conversation === false) {
    throw createControllerError('Forbidden', 403);
  }

  message = await Message.findOne({ _id: messageId, conversation: conversation._id });
  if (!message) {
    return false;
  }

  isOwner = String(message.sender) === String(actor.user._id);
  isAdmin = (actor.userRoles || []).indexOf('admin') !== -1;
  if (!isOwner && !isAdmin) {
    throw createControllerError('Forbidden', 403);
  }
  if (message.status === 'deleted') {
    throw createControllerError('Deleted message cannot be edited', 400);
  }

  if (body.content !== undefined) {
    message.content = body.content;
  }
  if (body.replyTo !== undefined) {
    message.replyTo = body.replyTo || null;
  }
  if (body.messageType) {
    message.messageType = body.messageType;
  }
  message.editedAt = new Date();
  message.editedBy = actor.user._id;

  await message.save();

  hydratedConversation = await attachConversationMeta(
    await updateConversationPreview(conversation._id, message),
    actor.user._id
  );
  hydratedMessage = await loadHydratedMessage(message._id);
  emitMessageUpdated(hydratedConversation, hydratedMessage);

  return hydratedMessage;
};

module.exports.deleteMessage = async function(conversationId, messageId, actor) {
  var conversation = await ensureParticipant(conversationId, actor.user._id);
  var message;
  var isOwner;
  var isAdmin;
  var hydratedConversation;
  var hydratedMessage;

  if (conversation === null) {
    return null;
  }
  if (conversation === false) {
    throw createControllerError('Forbidden', 403);
  }

  message = await Message.findOne({ _id: messageId, conversation: conversation._id });
  if (!message) {
    return false;
  }

  isOwner = String(message.sender) === String(actor.user._id);
  isAdmin = (actor.userRoles || []).indexOf('admin') !== -1;
  if (!isOwner && !isAdmin) {
    throw createControllerError('Forbidden', 403);
  }

  await removeMediaEntries(message.attachments || []);
  message.content = '';
  message.attachments = [];
  message.attachmentUrls = [];
  message.status = 'deleted';
  message.messageType = 'text';
  await message.save();

  hydratedConversation = await attachConversationMeta(
    await updateConversationPreview(conversation._id, message),
    actor.user._id
  );
  hydratedMessage = await loadHydratedMessage(message._id);
  emitMessageUpdated(hydratedConversation, hydratedMessage);

  return hydratedMessage;
};

module.exports.deleteMessageAttachment = async function(conversationId, messageId, mediaId, actor) {
  var conversation = await ensureParticipant(conversationId, actor.user._id);
  var message;
  var isOwner;
  var isAdmin;
  var media;
  var hydratedConversation;
  var hydratedMessage;

  if (conversation === null) {
    return null;
  }
  if (conversation === false) {
    throw createControllerError('Forbidden', 403);
  }

  message = await Message.findOne({ _id: messageId, conversation: conversation._id });
  if (!message) {
    return false;
  }

  isOwner = String(message.sender) === String(actor.user._id);
  isAdmin = (actor.userRoles || []).indexOf('admin') !== -1;
  if (!isOwner && !isAdmin) {
    throw createControllerError('Forbidden', 403);
  }

  media = await Media.findById(mediaId);
  if (!media) {
    throw createControllerError('Media not found', 404);
  }

  message.attachments = (message.attachments || []).filter(function(attachmentId) {
    return String(attachmentId) !== String(media._id);
  });
  message.attachmentUrls = (message.attachmentUrls || []).filter(function(url) {
    return url !== media.url;
  });

  if (!message.attachmentUrls.length && message.content === '[image]') {
    message.content = '';
    message.status = 'deleted';
  }

  await message.save();
  removeLocalFileIfNeeded(media.url);
  await media.deleteOne();

  hydratedConversation = await attachConversationMeta(
    await updateConversationPreview(conversation._id, message),
    actor.user._id
  );
  hydratedMessage = await loadHydratedMessage(message._id);
  emitMessageUpdated(hydratedConversation, hydratedMessage);

  return hydratedMessage;
};
