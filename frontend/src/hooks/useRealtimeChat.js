import { useEffect } from 'react';
import { io } from 'socket.io-client';

export const useRealtimeChat = ({ token, activeConversationId, onConversation, onMessage, onMessageUpdated, onMessagesRead, onTyping }) => {
  useEffect(() => {
    if (!token) {
      return undefined;
    }

    const socket = io({ auth: { token } });

    socket.on('conversation:created', onConversation);
    socket.on('message:created', onMessage);
    socket.on('message:updated', onMessageUpdated);
    socket.on('messages:read', onMessagesRead);
    socket.on('typing:update', onTyping);

    if (activeConversationId) {
      socket.emit('conversation:join', { conversationId: activeConversationId });
    }

    return () => {
      if (activeConversationId) {
        socket.emit('conversation:leave', { conversationId: activeConversationId });
      }
      socket.disconnect();
    };
  }, [token, activeConversationId, onConversation, onMessage, onMessageUpdated, onMessagesRead, onTyping]);
};
