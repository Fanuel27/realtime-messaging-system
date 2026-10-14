import React, { useState } from 'react';
import { Search, Users, UserX } from 'lucide-react';
import { useSocket } from '../context/SocketContext';

export default function Sidebar({
  users,
  activeContact,
  onSelectContact,
  loading,
  isMobileChatActive,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const { isUserOnline } = useSocket();

  const filteredUsers = users.filter((u) => {
    const term = searchTerm.toLowerCase();
    return (
      u.username.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term)
    );
  });

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <aside className={`chat-sidebar ${isMobileChatActive ? 'mobile-hidden' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-title-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={18} color="var(--color-primary)" />
            <h2 className="sidebar-title">Direct Messages</h2>
          </div>
          <span className="badge-counter">{users.length}</span>
        </div>

        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search contacts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="user-list">
        {loading ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            Loading contacts...
          </div>
        ) : users.length === 0 ? (
          <div className="empty-state" style={{ padding: '32px 16px' }}>
            <div className="empty-state-icon-box" style={{ width: '48px', height: '48px' }}>
              <UserX size={24} />
            </div>
            <div className="empty-state-title" style={{ fontSize: '1rem' }}>
              No other users yet
            </div>
            <p className="empty-state-text" style={{ fontSize: '0.8rem' }}>
              Register another account in a new window to test real-time conversations.
            </p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
            No contacts match "{searchTerm}"
          </div>
        ) : (
          filteredUsers.map((u) => {
            const online = isUserOnline(u.id);
            const isActive = activeContact?.id === u.id;

            return (
              <div
                key={u.id}
                className={`user-item ${isActive ? 'active' : ''}`}
                onClick={() => onSelectContact(u)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    onSelectContact(u);
                  }
                }}
              >
                <div className="user-item-avatar-wrapper">
                  <div className="user-avatar">{getInitials(u.username)}</div>
                  <span
                    className={`avatar-status-badge ${online ? 'online' : ''}`}
                    title={online ? 'Online' : 'Offline'}
                  />
                </div>

                <div className="user-item-details">
                  <div className="user-item-header">
                    <span className="user-item-name">{u.username}</span>
                  </div>
                  <div className="user-item-status">
                    {online ? (
                      <span style={{ color: 'var(--color-online)', fontWeight: 500 }}>
                        Active now
                      </span>
                    ) : (
                      'Offline'
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
