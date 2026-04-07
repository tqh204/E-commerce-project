var socketIo = require('socket.io');
var authLib = require('./auth');
var schemas = require('../schemas');

var Server = socketIo.Server;
var verifyAccessToken = authLib.verifyAccessToken;
var Conversation = schemas.Conversation;
var User = schemas.User;

var ioInstance = null;

var userRoom = function(userId) {
  return 'user:' + userId;
};

var conversationRoom = function(conversationId) {
  return 'conversation:' + conversationId;
};

var serialize = function(value) {
  if (!value) {
    return null;
  }

  return typeof value.toObject === 'function'
    ? value.toObject({ virtuals: true })
    : value;
};

var getObjectIdValue = function(value) {
  if (value && value._id) {
    return value._id;
  }
  return value;
};

var emitToConversationParticipants = function(conversation, eventName, payload) {
  var conversationPayload = serialize(conversation);
  var participants;
  var conversationId;
  var index;
  var participantId;

  if (!ioInstance || !conversationPayload) {
    return;
  }

  conversationId = String(conversationPayload._id || payload.conversationId);
  ioInstance.to(conversationRoom(conversationId)).emit(eventName, payload);

  participants = conversationPayload.participants || [];
  for (index = 0; index < participants.length; index += 1) {
    participantId = getObjectIdValue(participants[index]);
    if (participantId) {
      ioInstance.to(userRoom(String(participantId))).emit(eventName, payload);
    }
  }
};

var broadcastMessageEvent = function(eventName, conversation, message) {
  var conversationPayload;
  var messagePayload;

  if (!conversation || !message) {
    return;
  }

  conversationPayload = serialize(conversation);
  messagePayload = serialize(message);
  emitToConversationParticipants(conversationPayload, eventName, {
    conversationId: String(conversationPayload._id || messagePayload.conversation),
    conversation: conversationPayload,
    message: messagePayload,
  });
};

var canAccessConversation = async function(conversationId, userId) {
  var conversation = await Conversation.findById(conversationId).select('participants');
  var index;

  if (!conversation) {
    return null;
  }

  for (index = 0; index < conversation.participants.length; index += 1) {
    if (String(conversation.participants[index]) === String(userId)) {
      return conversation;
    }
  }

  return null;
};

var extractSocketToken = function(socket) {
  var auth = socket.handshake && socket.handshake.auth ? socket.handshake.auth : {};
  var query = socket.handshake && socket.handshake.query ? socket.handshake.query : {};
  var headers = socket.handshake && socket.handshake.headers ? socket.handshake.headers : {};
  var authorization = headers.authorization || '';

  if (auth.token) {
    return auth.token;
  }
  if (query.token) {
    return query.token;
  }
  if (authorization) {
    return authorization.replace(/^Bearer\s+/i, '');
  }

  return '';
};

var initSocket = function(server) {
  if (ioInstance) {
    return ioInstance;
  }

  ioInstance = new Server(server, {
    cors: {
      origin: true,
      credentials: true,
    },
  });

  ioInstance.use(async function(socket, next) {
    var token;
    var decoded;
    var user;

    try {
      token = extractSocketToken(socket);
      if (!token) {
        return next(new Error('Authentication required'));
      }

      decoded = verifyAccessToken(token);
      user = await User.findById(decoded.sub).populate('roles', 'name permissions');
      if (!user || !user.isActive) {
        return next(new Error('User not available'));
      }

      socket.user = user;
      socket.userRoles = (user.roles || []).map(function(role) {
        return role.name;
      });
      return next();
    } catch (error) {
      return next(new Error('Invalid token'));
    }
  });

  ioInstance.on('connection', function(socket) {
    var userId = String(socket.user._id);

    socket.join(userRoom(userId));
    socket.emit('socket:ready', {
      userId: userId,
      roles: socket.userRoles,
    });

    socket.on('conversation:join', async function(payload) {
      var data = payload || {};
      var conversationId = data.conversationId;
      var conversation;

      if (!conversationId) {
        return;
      }

      conversation = await canAccessConversation(conversationId, userId);
      if (!conversation) {
        socket.emit('chat:error', {
          message: 'Forbidden conversation',
          conversationId: conversationId,
        });
        return;
      }

      socket.join(conversationRoom(conversationId));
      socket.emit('conversation:joined', { conversationId: conversationId });
    });

    socket.on('conversation:leave', function(payload) {
      var data = payload || {};
      var conversationId = data.conversationId;

      if (!conversationId) {
        return;
      }

      socket.leave(conversationRoom(conversationId));
    });

    socket.on('typing:start', async function(payload) {
      var data = payload || {};
      var conversationId = data.conversationId;
      var conversation;

      conversation = await canAccessConversation(conversationId, userId);
      if (!conversation) {
        return;
      }

      socket.to(conversationRoom(conversationId)).emit('typing:update', {
        conversationId: conversationId,
        userId: userId,
        fullName: socket.user.fullName,
        username: socket.user.username,
        isTyping: true,
      });
    });

    socket.on('typing:stop', async function(payload) {
      var data = payload || {};
      var conversationId = data.conversationId;
      var conversation;

      conversation = await canAccessConversation(conversationId, userId);
      if (!conversation) {
        return;
      }

      socket.to(conversationRoom(conversationId)).emit('typing:update', {
        conversationId: conversationId,
        userId: userId,
        fullName: socket.user.fullName,
        username: socket.user.username,
        isTyping: false,
      });
    });
  });

  return ioInstance;
};

var emitConversationCreated = function(conversation) {
  var payload = serialize(conversation);
  var participants;
  var index;
  var participantId;

  if (!payload || !ioInstance) {
    return;
  }

  participants = payload.participants || [];
  for (index = 0; index < participants.length; index += 1) {
    participantId = getObjectIdValue(participants[index]);
    if (participantId) {
      ioInstance.to(userRoom(String(participantId))).emit('conversation:created', payload);
    }
  }
};

var emitMessageCreated = function(conversation, message) {
  broadcastMessageEvent('message:created', conversation, message);
};

var emitMessageUpdated = function(conversation, message) {
  broadcastMessageEvent('message:updated', conversation, message);
};

var emitMessagesRead = function(conversation, payload) {
  emitToConversationParticipants(conversation, 'messages:read', payload);
};

var emitNotification = function(userId, payload) {
  var notificationPayload;

  if (!ioInstance || !userId) {
    return;
  }

  notificationPayload = serialize(payload);
  ioInstance.to(userRoom(String(userId))).emit('notification:created', notificationPayload);
};

module.exports = {
  initSocket: initSocket,
  emitConversationCreated: emitConversationCreated,
  emitMessageCreated: emitMessageCreated,
  emitMessageUpdated: emitMessageUpdated,
  emitMessagesRead: emitMessagesRead,
  emitNotification: emitNotification,
  userRoom: userRoom,
  conversationRoom: conversationRoom,
};
