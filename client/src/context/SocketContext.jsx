import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user, token } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState(new Set());
  const socketRef = useRef(null);

  useEffect(() => {
    if (!token || !user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    // Connect to Socket.IO backend
    const newSocket = io({
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    newSocket.on('presence:initial', (data) => {
      if (data && Array.isArray(data.onlineUserIds)) {
        setOnlineUserIds(new Set(data.onlineUserIds));
      }
    });

    newSocket.on('presence:update', (data) => {
      if (data && Array.isArray(data.onlineUserIds)) {
        setOnlineUserIds(new Set(data.onlineUserIds));
      }
    });

    return () => {
      newSocket.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
    };
  }, [token, user]);

  const sendSocketMessage = (recipientId, content) => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current || !socketRef.current.connected) {
        // Fallback to HTTP POST if socket is temporarily disconnected
        fetch('/api/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ recipient_id: recipientId, content }),
        })
          .then(async (res) => {
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to send message');
            resolve(data.data);
          })
          .catch(reject);
        return;
      }

      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      socketRef.current.emit(
        'message:send',
        { recipient_id: recipientId, content, temp_id: tempId },
        (response) => {
          if (response && response.success) {
            resolve(response.message);
          } else {
            reject(new Error(response?.error || 'Failed to send message'));
          }
        }
      );
    });
  };

  const isUserOnline = (targetUserId) => {
    return onlineUserIds.has(Number(targetUserId));
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        onlineUserIds,
        isUserOnline,
        sendSocketMessage,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
