import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { MessageSquare, LogOut, Wifi, WifiOff } from 'lucide-react';

export default function Header() {
  const { user, logout } = useAuth();
  const { isConnected } = useSocket();

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <header className="app-header">
      <div className="header-brand">
        <div className="header-brand-logo">
          <MessageSquare size={18} />
        </div>
        <span className="header-brand-text">SMUNI Chat</span>
      </div>

      <div className="header-user">
        <div
          className="user-status-text"
          title={isConnected ? 'Connected to real-time server' : 'Reconnecting...'}
        >
          {isConnected ? (
            <>
              <span className="status-dot online"></span>
              <span style={{ color: 'var(--color-primary)', fontWeight: 500 }}>Live</span>
            </>
          ) : (
            <>
              <span className="status-dot" style={{ backgroundColor: '#F59E0B' }}></span>
              <span style={{ color: '#92400E' }}>Reconnecting...</span>
            </>
          )}
        </div>

        <div className="user-badge">
          <div className="user-avatar">{getInitials(user?.username)}</div>
          <div className="user-info">
            <span className="user-name">{user?.username}</span>
            <span className="user-status-text">{user?.email}</span>
          </div>
        </div>

        <button
          onClick={logout}
          className="btn btn-ghost"
          title="Sign out of your account"
          aria-label="Sign out"
        >
          <LogOut size={17} />
          <span>Sign Out</span>
        </button>
      </div>
    </header>
  );
}
