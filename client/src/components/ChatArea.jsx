import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  ArrowLeft,
  MessageSquareDashed,
  ShieldCheck,
  Clock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

export default function ChatArea({
  activeContact,
  messages,
  onSendMessage,
  onBackToSidebar,
  loadingMessages,
  isMobileChatActive,
}) {
  const { user } = useAuth();
  const { isUserOnline } = useSocket();
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [errorBanner, setErrorBanner] = useState('');
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const isOnline = activeContact ? isUserOnline(activeContact.id) : false;

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? 'smooth' : 'auto',
    });
  };

  useEffect(() => {
    scrollToBottom(false);
  }, [activeContact?.id]);

  useEffect(() => {
    scrollToBottom(true);
  }, [messages.length]);

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!content.trim() || sending || !activeContact) return;

    if (content.trim().length > 2000) {
      setErrorBanner('Message exceeds 2,000 characters limit.');
      return;
    }

    const textToSend = content.trim();
    setContent('');
    setErrorBanner('');
    setSending(true);

    try {
      await onSendMessage(activeContact.id, textToSend);
    } catch (err) {
      setErrorBanner(err.message || 'Failed to deliver message.');
      setContent(textToSend); // Restore text on failure
    } finally {
      setSending(false);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTimestamp = (dateString) => {
    if (!dateString) return '';
    try {
      // Ensure UTC format parsing
      const date = new Date(dateString.endsWith('Z') ? dateString : dateString + 'Z');
      return new Intl.DateTimeFormat(undefined, {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).format(date);
    } catch {
      return '';
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.slice(0, 2).toUpperCase();
  };

  if (!activeContact) {
    return (
      <main className={`chat-main ${!isMobileChatActive ? 'mobile-hidden' : ''}`}>
        <div className="empty-state">
          <div className="empty-state-icon-box">
            <MessageSquareDashed size={32} />
          </div>
          <h2 className="empty-state-title">Select a Conversation</h2>
          <p className="empty-state-text">
            Choose a registered contact from the directory to start real-time, encrypted-session messaging.
          </p>
        </div>
      </main>
    );
  }

  const charCount = content.length;
  const isNearLimit = charCount > 1800;
  const isOverLimit = charCount > 2000;

  return (
    <main className={`chat-main ${!isMobileChatActive ? 'mobile-hidden' : ''}`}>
      {/* Conversation Top Header */}
      <div className="conversation-header">
        <div className="conversation-header-user">
          <button
            className="back-btn"
            onClick={onBackToSidebar}
            aria-label="Back to contacts list"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="user-item-avatar-wrapper">
            <div className="user-avatar">{getInitials(activeContact.username)}</div>
            <span
              className={`avatar-status-badge ${isOnline ? 'online' : ''}`}
              title={isOnline ? 'Online' : 'Offline'}
            />
          </div>

          <div>
            <div className="conversation-recipient-name">
              {activeContact.username}
            </div>
            <div className="conversation-recipient-status">
              <span
                className={`status-dot ${isOnline ? 'online' : ''}`}
                style={{ width: '6px', height: '6px' }}
              />
              <span>{isOnline ? 'Online' : 'Offline'}</span>
              <span style={{ margin: '0 4px', color: 'var(--color-border)' }}>•</span>
              <span style={{ fontSize: '0.75rem' }}>{activeContact.email}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
          <ShieldCheck size={16} color="var(--color-primary)" />
          <span>Direct One-to-One</span>
        </div>
      </div>

      {errorBanner && (
        <div className="connection-banner" style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger)', borderBottomColor: 'rgba(211, 47, 47, 0.2)' }}>
          {errorBanner}
        </div>
      )}

      {/* Messages Stream */}
      <div className="messages-container" role="log" aria-live="polite">
        {loadingMessages ? (
          <div style={{ margin: 'auto', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            Loading conversation history...
          </div>
        ) : messages.length === 0 ? (
          <div className="empty-state" style={{ margin: 'auto' }}>
            <div className="empty-state-icon-box" style={{ width: '52px', height: '52px' }}>
              <Clock size={24} />
            </div>
            <h3 className="empty-state-title" style={{ fontSize: '1.05rem' }}>
              No messages yet
            </h3>
            <p className="empty-state-text">
              Say hello to <strong>{activeContact.username}</strong>! All messages are stored permanently and delivered instantly.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOutgoing = msg.sender_id === user.id;

            return (
              <div
                key={msg.id || msg.temp_id || `${msg.created_at}_${msg.sender_id}`}
                className={`message-row ${isOutgoing ? 'outgoing' : 'incoming'}`}
              >
                <div className="message-bubble">{msg.content}</div>
                <div className="message-meta">
                  <span>{formatTimestamp(msg.created_at)}</span>
                  {isOutgoing && (
                    <span title="Persisted to SQLite database">✓</span>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Composer */}
      <div className="composer-container">
        <form className="composer-form" onSubmit={handleSend}>
          <textarea
            ref={textareaRef}
            className="composer-textarea"
            placeholder={`Message ${activeContact.username}... (Press Enter to send)`}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            maxLength={2500}
            disabled={sending}
          />

          <div className="composer-actions">
            <span
              className={`composer-char-count ${
                isOverLimit ? 'over-limit' : isNearLimit ? 'near-limit' : ''
              }`}
            >
              {charCount} / 2000
            </span>

            <button
              type="submit"
              className="composer-send-btn"
              disabled={!content.trim() || sending || isOverLimit}
              aria-label="Send message"
              title="Send message (Enter)"
            >
              <Send size={16} />
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
