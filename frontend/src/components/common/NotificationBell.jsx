/**
 * NotificationBell — Shows real-time unread count badge, opens a dropdown
 * of recent in-app notifications with click-to-mark-read and mark-all-read.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';

const BASE_URL = '/api/messaging/notifications';

async function apiFetch(path, opts = {}) {
  const token = localStorage.getItem('fh_access_token');
  const headers = { ...(opts.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (opts.body && typeof opts.body === 'object' && !(opts.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    opts = { ...opts, body: JSON.stringify(opts.body) };
  }
  const res = await fetch(path, { ...opts, headers });
  if (!res.ok) throw new Error(await res.text());
  if (res.status === 204) return null;
  return res.json();
}

const NTYPE_ICON = {
  HIRE: '🤝',
  MESSAGE: '💬',
  REVIEW: '⭐',
  MILESTONE: '🏁',
  ASSESSMENT: '🎓',
  BID: '📋',
  SYSTEM: '🔔',
};

function timeAgo(dateString) {
  const diff = Math.floor((Date.now() - new Date(dateString)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function NotificationBell({ onNavigate }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef(null);
  const bellRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiFetch(`${BASE_URL}/`);
      const results = Array.isArray(data) ? data : (data.results || []);
      setNotifications(results);
      setUnreadCount(typeof data.unread_count === 'number' ? data.unread_count : results.filter(n => !n.is_read).length);
    } catch (_) {
      // silently fail for background polling
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load + poll every 30s
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target) &&
          bellRef.current && !bellRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleToggle = () => {
    setOpen(prev => {
      if (!prev) fetchNotifications();
      return !prev;
    });
  };

  const markRead = async (notif) => {
    if (!notif.is_read) {
      try {
        await apiFetch(`${BASE_URL}/${notif.id}/read/`, { method: 'POST' });
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (_) {}
    }
    if (notif.link && onNavigate) {
      setOpen(false);
      onNavigate(notif.link);
    }
  };

  const markAllRead = async () => {
    try {
      await apiFetch(`${BASE_URL}/read-all/`, { method: 'POST' });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (_) {}
  };

  return (
    <div style={{ position: 'relative', display: 'inline-flex' }}>
      {/* Bell button */}
      <button
        ref={bellRef}
        onClick={handleToggle}
        aria-label={`Notifications (${unreadCount} unread)`}
        style={{
          position: 'relative',
          background: open ? 'var(--primary-50)' : 'transparent',
          border: '1px solid var(--border-medium)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-sm)',
          cursor: 'pointer',
          color: 'var(--text-main)',
          fontSize: '1.2rem',
          lineHeight: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '40px',
          height: '40px',
          transition: 'all 0.2s ease',
        }}
      >
        🔔
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            background: 'var(--danger)',
            color: '#fff',
            fontSize: '0.65rem',
            fontWeight: 700,
            borderRadius: '100px',
            minWidth: '18px',
            height: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 4px',
            lineHeight: 1,
            boxShadow: '0 0 0 2px #ffffff',
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          ref={panelRef}
          role="region"
          aria-label="Notifications panel"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: '360px',
            maxWidth: '92vw',
            background: '#ffffff',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 9999,
            overflow: 'hidden',
            animation: 'fadeSlideDown 0.18s ease',
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: 'var(--space-md) var(--space-lg)',
            borderBottom: '1px solid var(--border-subtle)',
            background: '#f8fafc',
          }}>
            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>
              Notifications {unreadCount > 0 && <span style={{ color: 'var(--primary-600)' }}>({unreadCount})</span>}
            </span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary-600)',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  fontWeight: 600,
                  padding: '2px 4px',
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
            {loading && notifications.length === 0 ? (
              <div style={{ padding: 'var(--space-xl)', textAlign: 'center', color: 'var(--text-muted)' }}>
                Loading…
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: 'var(--space-xl)', textAlign: 'center', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '2rem', marginBottom: 'var(--space-sm)' }}>🔕</div>
                <div>All caught up!</div>
              </div>
            ) : (
              notifications.map(notif => (
                <div
                  key={notif.id}
                  onClick={() => markRead(notif)}
                  style={{
                    display: 'flex',
                    gap: 'var(--space-md)',
                    padding: 'var(--space-md) var(--space-lg)',
                    cursor: notif.link ? 'pointer' : 'default',
                    background: notif.is_read ? 'transparent' : 'rgba(99, 102, 241, 0.05)',
                    borderBottom: '1px solid var(--border-subtle)',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.background = notif.is_read ? 'transparent' : 'rgba(99, 102, 241, 0.05)'}
                >
                  <div style={{ fontSize: '1.5rem', flexShrink: 0, lineHeight: 1, paddingTop: '2px' }}>
                    {NTYPE_ICON[notif.notification_type] || '🔔'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '0.84rem',
                      fontWeight: notif.is_read ? 500 : 700,
                      color: 'var(--text-main)',
                      marginBottom: '2px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {notif.title}
                    </div>
                    <div style={{
                      fontSize: '0.78rem',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.4,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}>
                      {notif.message}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {timeAgo(notif.created_at)}
                    </div>
                  </div>
                  {!notif.is_read && (
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: 'var(--primary-600)',
                      flexShrink: 0,
                      alignSelf: 'center',
                    }} />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
