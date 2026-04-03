const { Server } = require('socket.io');
const { verifyAccessToken } = require('./auth');
const { Conversation, User } = require('../schemas');

let ioInstance = null;

const userRoom = (userId) => `user:${userId}`;
const conversationRoom = (conversationId) => `conversation:${conversationId}`;

const serialize = (value) => {
  if (!value) {
    return null;
  }
  return typeof value.toObject === 'function' ? value.toObject({ virtuals: true }) : value;
};

const emitToConversationParticipants = (conversation, eventName, payload) => {
  const conversationPayload = serialize(conversation);
  if (!ioInstance || !conversationPayload) {
    return;
  }

  const conversationId = String(conversationPayload._id || payload.conversationId);
  ioInstance.to(conversationRoom(conversationId)).emit(eventName, payload);
  (conversationPayload.participants || []).forEach((participant) => {
    const participantId = participant?._id || participant;
    if (participantId) {
      ioInstance.to(userRoom(String(participantId))).emit(eventName, payload);
    }
  });
};

const broadcastMessageEvent = (eventName, conversation, message) => {
  if (!conversation || !message) {
    return;
  }

  const conversationPayload = serialize(conversation);
  const messagePayload = serialize(message);
  emitToConversationParticipants(conversationPayload, eventName, {
    conversationId: String(conversationPayload._id || messagePayload.conversation),
    conversation: conversationPayload,
    message: messagePayload,
  });
};

const canAccessConversation = async (conversationId, userId) => {
  const conversation = await Conversation.findById(conversationId).select('participants');
  if (!conversation) {
    return null;
  }

  const isParticipant = conversation.participants.some(
    (participantId) => String(participantId) === String(userId)
  );
  return isParticipant ? conversation : null;
};

const initSocket = (server) => {
  if (ioInstance) {
    return ioInstance;
  }

  ioInstance = new Server(server, {
    cors: {
      origin: true,
      credentials: true,
    },
  });

  ioInstance.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.query?.token ||
        socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '');

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = verifyAccessToken(token);
      const user = await User.findById(decoded.sub).populate('roles', 'name permissions');
      if (!user || !user.isActive) {
        return next(new Error('User not available'));
      }

      socket.user = user;
      socket.userRoles = (user.roles || []).map((role) => role.name);
      return next();
    } catch (error) {
      return next(new Error('Invalid token'));
    }
  });

  ioInstance.on('connection', (socket) => {
    const userId = String(socket.user._id);
    socket.join(userRoom(userId));
    socket.emit('socket:ready', {
      userId,
      roles: socket.userRoles,
    });

    socket.on('conversation:join', async ({ conversationId } = {}) => {
      if (!conversationId) {
        return;
      }

      const conversation = await canAccessConversation(conversationId, userId);
      if (!conversation) {
        socket.emit('chat:error', { message: 'Forbidden conversation', conversationId });
        return;
      }

      socket.join(conversationRoom(conversationId));
      socket.emit('conversation:joined', { conversationId });
    });

    socket.on('conversation:leave', ({ conversationId } = {}) => {
      if (!conversationId) {
        return;
      }
      socket.leave(conversationRoom(conversationId));
    });

    socket.on('typing:start', async ({ conversationId } = {}) => {
      const conversation = await canAccessConversation(conversationId, userId);
      if (!conversation) {
        return;
      }
      socket.to(conversationRoom(conversationId)).emit('typing:update', {
        conversationId,
        userId,
        fullName: socket.user.fullName,
        username: socket.user.username,
        isTyping: true,
      });
    });

    socket.on('typing:stop', async ({ conversationId } = {}) => {
      const conversation = await canAccessConversation(conversationId, userId);
      if (!conversation) {
        return;
      }
      socket.to(conversationRoom(conversationId)).emit('typing:update', {
        conversationId,
        userId,
        fullName: socket.user.fullName,
        username: socket.user.username,
        isTyping: false,
      });
    });
  });

  return ioInstance;
};

const emitConversationCreated = (conversation) => {
  const payload = serialize(conversation);
  if (!payload) {
    return;
  }

  (payload.participants || []).forEach((participant) => {
    const participantId = participant?._id || participant;
    if (participantId) {
      ioInstance?.to(userRoom(String(participantId))).emit('conversation:created', payload);
    }
  });
};

const emitMessageCreated = (conversation, message) => {
  broadcastMessageEvent('message:created', conversation, message);
};

const emitMessageUpdated = (conversation, message) => {
  broadcastMessageEvent('message:updated', conversation, message);
};

const emitMessagesRead = (conversation, payload) => {
  emitToConversationParticipants(conversation, 'messages:read', payload);
};

const emitNotification = (userId, payload) => {
  if (!ioInstance || !userId) {
    return;
  }
  const notificationPayload = serialize(payload);
  ioInstance.to(userRoom(String(userId))).emit('notification:created', notificationPayload);
};

module.exports = {
  initSocket,
  emitConversationCreated,
  emitMessageCreated,
  emitMessageUpdated,
  emitMessagesRead,
  emitNotification,
  userRoom,
  conversationRoom,
};
