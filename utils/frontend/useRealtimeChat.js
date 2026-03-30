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
  const handlersRef = useRef({
    onConversation,
    onMessage,
    onMessageUpdated,
    onMessagesRead,
    onTyping,
  });
  const [socketState, setSocketState] = useState('offline');

  useEffect(() => {
    handlersRef.current = {
      onConversation,
      onMessage,
      onMessageUpdated,
      onMessagesRead,
      onTyping,
    };
  }, [onConversation, onMessage, onMessageUpdated, onMessagesRead, onTyping]);

  useEffect(() => {
    if (!token) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setSocketState('offline');
      return undefined;
    }

    setSocketState('connecting');
    const socket = io(window.location.origin, {
      path: '/socket.io',
      auth: { token },
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => setSocketState('connected'));
    socket.on('disconnect', () => setSocketState('disconnected'));
    socket.on('connect_error', () => setSocketState('error'));
    socket.on('conversation:created', (payload) => handlersRef.current.onConversation?.(payload));
    socket.on('message:created', (payload) => handlersRef.current.onMessage?.(payload));
    socket.on('message:updated', (payload) => handlersRef.current.onMessageUpdated?.(payload));
    socket.on('messages:read', (payload) => handlersRef.current.onMessagesRead?.(payload));
    socket.on('typing:update', (payload) => handlersRef.current.onTyping?.(payload));

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !activeConversationId) return undefined;

    const joinConversation = () => {
      socket.emit('conversation:join', { conversationId: activeConversationId });
    };

    if (socket.connected) {
      joinConversation();
    }
    socket.on('connect', joinConversation);

    return () => {
      socket.off('connect', joinConversation);
      socket.emit('conversation:leave', { conversationId: activeConversationId });
    };
  }, [activeConversationId, token]);

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
