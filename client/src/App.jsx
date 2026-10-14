import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider, useSocket } from './context/SocketContext';
import Auth from './components/Auth';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';

function ChatApp() {
  const { user, token } = useAuth();
  const { socket, sendSocketMessage } = useSocket();

  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [activeContact, setActiveContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isMobileChatActive, setIsMobileChatActive] = useState(false);

  // Fetch registered user directory
  const fetchUsers = useCallback(async () => {
    if (!token) return;
    try {
      setLoadingUsers(true);
      const res = await fetch('/api/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error('Failed to fetch users directory:', err);
    } finally {
      setLoadingUsers(false);
    }
  }, [token]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Fetch conversation messages when active contact changes
  const fetchMessages = useCallback(
    async (contactId) => {
      if (!token || !contactId) return;
      try {
        setLoadingMessages(true);
        const res = await fetch(`/api/messages/${contactId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setMessages(data.messages || []);
        }
      } catch (err) {
        console.error('Failed to fetch conversation:', err);
      } finally {
        setLoadingMessages(false);
      }
    },
    [token]
  );

  const handleSelectContact = (contact) => {
    setActiveContact(contact);
    setIsMobileChatActive(true);
    fetchMessages(contact.id);
  };

  const handleBackToSidebar = () => {
    setIsMobileChatActive(false);
  };

  // Listen for real-time incoming and outgoing messages
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (newMessage) => {
      if (!newMessage || !user) return;

      // Check if this message belongs to the current open conversation
      if (
        activeContact &&
        ((newMessage.sender_id === activeContact.id && newMessage.recipient_id === user.id) ||
         (newMessage.sender_id === user.id && newMessage.recipient_id === activeContact.id))
      ) {
        setMessages((prev) => {
          // Avoid duplicate insertion if message ID or temp_id matches
          const exists = prev.some(
            (m) =>
              (m.id && newMessage.id && m.id === newMessage.id) ||
              (m.temp_id && newMessage.temp_id && m.temp_id === newMessage.temp_id)
          );
          if (exists) {
            // Replace temporary message if needed
            return prev.map((m) =>
              m.temp_id && newMessage.temp_id && m.temp_id === newMessage.temp_id
                ? newMessage
                : m
            );
          }
          return [...prev, newMessage];
        });
      }
    };

    socket.on('message:new', handleNewMessage);

    return () => {
      socket.off('message:new', handleNewMessage);
    };
  }, [socket, activeContact, user]);

  const handleSendMessage = async (recipientId, content) => {
    const savedMessage = await sendSocketMessage(recipientId, content);

    // Optimistically update message if socket haven't echoed it yet
    if (savedMessage) {
      setMessages((prev) => {
        const exists = prev.some(
          (m) =>
            (m.id && savedMessage.id && m.id === savedMessage.id) ||
            (m.temp_id && savedMessage.temp_id && m.temp_id === savedMessage.temp_id)
        );
        if (exists) return prev;
        return [...prev, savedMessage];
      });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Header />
      <div className="chat-layout">
        <Sidebar
          users={users}
          activeContact={activeContact}
          onSelectContact={handleSelectContact}
          loading={loadingUsers}
          isMobileChatActive={isMobileChatActive}
        />
        <ChatArea
          activeContact={activeContact}
          messages={messages}
          onSendMessage={handleSendMessage}
          onBackToSidebar={handleBackToSidebar}
          loadingMessages={loadingMessages}
          isMobileChatActive={isMobileChatActive}
        />
      </div>
    </div>
  );
}

function MainApp() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="auth-container">
        <div style={{ textAlign: 'center', color: 'var(--color-primary)' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              border: '3px solid var(--color-primary-light)',
              borderTopColor: 'var(--color-primary)',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 12px auto',
            }}
          />
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          <span style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
            Loading SMUNI Messaging...
          </span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <SocketProvider>
      <ChatApp />
    </SocketProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
