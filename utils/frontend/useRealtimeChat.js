import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

export const useRealtimeChat = ({
  token,
  activeConversationId,
  onConversation,
  onMessage,
  onMessageUpdated,
  onMessagesRead,
  onTyping,
}) => {
  const socketRef = useRef(null);
  const [socketState, setSocketState] = useState('offline');

  useEffect(() => {
    if (!token) {
      setSocketState('offline');
      return undefined;
    }

    const socket = io({
      auth: { token },
    });
    socketRef.current = socket;

    socket.on('connect', () => setSocketState('connected'));
    socket.on('disconnect', () => setSocketState('disconnected'));
    socket.on('connect_error', () => setSocketState('error'));
    socket.on('conversation:created', onConversation);
    socket.on('message:created', onMessage);
    socket.on('message:updated', onMessageUpdated);
    socket.on('messages:read', onMessagesRead);
    socket.on('typing:update', onTyping);

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, onConversation, onMessage, onMessageUpdated, onMessagesRead, onTyping]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !activeConversationId) return undefined;

    socket.emit('conversation:join', { conversationId: activeConversationId });
    return () => {
      socket.emit('conversation:leave', { conversationId: activeConversationId });
    };
  }, [activeConversationId]);

  return {
    socketState,
    startTyping: (conversationId) => {
      if (socketRef.current && conversationId) {
        socketRef.current.emit('typing:start', { conversationId });
      }
    },
    stopTyping: (conversationId) => {
      if (socketRef.current && conversationId) {
        socketRef.current.emit('typing:stop', { conversationId });
      }
    },
  };
};
