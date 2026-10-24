/**
 * ConversationDrawer — A slide-in side panel for threaded messaging.
 * Lists all conversations in the left column; shows full thread + reply box on the right.
 * Fully wired to the Django messaging REST API.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { messagingAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

// ── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(dateString) {
  const diff = Math.floor((Date.now() - new Date(dateString)) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

function Avatar({ name, size = 36 }) {
  const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const hue = [...initials].reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `hsl(${hue},65%,45%)`, display: 'flex', alignItems: 'center',
      justifyContent: 'center', color: '#fff', fontWeight: 700,
      fontSize: `${size * 0.38}px`, userSelect: 'none',
    }}>{initials}</div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function ConversationDrawer({ isOpen, onClose }) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const fetchConversations = useCallback(async () => {
    try {
      setLoadingList(true);
      const data = await messagingAPI.getConversations();
      setConversations(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      setError(err.message || 'Could not load conversations.');
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) fetchConversations();
  }, [isOpen, fetchConversations]);

  const openConversation = async (conv) => {
    try {
      setActiveConv(conv);
      setLoadingThread(true);
      setMessages([]);
      const detail = await messagingAPI.getConversation(conv.id);
      setMessages(detail.messages || []);
    } catch (err) {
      setError(err.message || 'Could not load messages.');
    } finally {
      setLoadingThread(false);
    }
  };

  // Auto-scroll to bottom when messages load
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!draft.trim() || !activeConv) return;
    setSending(true);
    try {
      const msg = await messagingAPI.sendMessage(activeConv.id, draft.trim());
      setMessages(prev => [...prev, msg]);
      setDraft('');
      // Update conversation list preview
      fetchConversations();
    } catch (err) {
      setError(err.message || 'Failed to send message.');
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  if (!isOpen) return null;

  const panelStyle = {
    position: 'fixed',
    top: 0, right: 0,
    height: '100vh',
    width: '720px',
    maxWidth: '100vw',
    background: 'var(--color-surface)',
    borderLeft: '1px solid var(--color-border)',
    boxShadow: '-8px 0 40px rgba(0,0,0,0.4)',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 2000,
    animation: 'slideInRight 0.25s cubic-bezier(0.16,1,0.3,1)',
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          zIndex: 1999, backdropFilter: 'blur(2px)',
        }}
      />

      <aside style={panelStyle} role="dialog" aria-label="Messages">
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: 'var(--space-lg) var(--space-xl)',
          borderBottom: '1px solid var(--color-border)',
          background: 'var(--color-surface-elevated)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
            <span style={{ fontSize: '1.2rem' }}>💬</span>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Messages</h3>
            {conversations.length > 0 && (
              <span style={{
                background: 'var(--color-accent)', color: '#fff', borderRadius: '100px',
                fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px',
              }}>{conversations.length}</span>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close messages"
            style={{
              background: 'transparent', border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)', padding: '6px 12px',
              color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: '0.85rem',
            }}
          >✕ Close</button>
        </div>

        {error && (
          <div style={{
            padding: 'var(--space-sm) var(--space-lg)', background: 'rgba(239,68,68,0.12)',
            color: 'var(--color-danger)', fontSize: '0.82rem', borderBottom: '1px solid var(--color-border)',
          }}>
            {error}
            <button onClick={() => setError('')} style={{ marginLeft: '8px', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>✕</button>
          </div>
        )}

        {/* Body: List + Thread side-by-side */}
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          {/* Left: Conversation list */}
          <div style={{
            width: '260px', flexShrink: 0,
            borderRight: '1px solid var(--color-border)',
            overflowY: 'auto',
          }}>
            {loadingList ? (
              <div style={{ padding: 'var(--space-xl)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                Loading…
              </div>
            ) : conversations.length === 0 ? (
              <div style={{ padding: 'var(--space-xl)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📭</div>
                <div style={{ fontSize: '0.85rem' }}>No conversations yet</div>
              </div>
            ) : (
              conversations.map(conv => {
                const other = conv.other_participant;
                const isActive = activeConv?.id === conv.id;
                return (
                  <div
                    key={conv.id}
                    onClick={() => openConversation(conv)}
                    style={{
                      display: 'flex',
                      gap: 'var(--space-sm)',
                      padding: 'var(--space-md)',
                      cursor: 'pointer',
                      background: isActive ? 'rgba(99,102,241,0.12)' : 'transparent',
                      borderBottom: '1px solid var(--color-border)',
                      borderLeft: isActive ? '3px solid var(--color-accent)' : '3px solid transparent',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <Avatar name={other?.name || '?'} size={38} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        display: 'flex', justifyContent: 'space-between',
                        alignItems: 'baseline', marginBottom: '2px',
                      }}>
                        <span style={{ fontWeight: 600, fontSize: '0.84rem', color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }}>
                          {other?.name || 'Unknown'}
                        </span>
                        {conv.last_message_preview && (
                          <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', flexShrink: 0 }}>
                            {timeAgo(conv.last_message_preview.created_at)}
                          </span>
                        )}
                      </div>
                      {conv.project_title && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          📁 {conv.project_title}
                        </div>
                      )}
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {conv.last_message_preview?.content || 'No messages yet'}
                      </div>
                      {conv.unread_count > 0 && (
                        <span style={{
                          display: 'inline-block', marginTop: '4px',
                          background: 'var(--color-accent)', color: '#fff',
                          borderRadius: '100px', fontSize: '0.65rem', fontWeight: 700,
                          padding: '1px 6px',
                        }}>{conv.unread_count} new</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right: Thread */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            {!activeConv ? (
              <div style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                color: 'var(--color-text-muted)',
              }}>
                <div style={{ fontSize: '3rem', marginBottom: 'var(--space-md)' }}>💬</div>
                <div style={{ fontSize: '0.9rem' }}>Select a conversation to start chatting</div>
              </div>
            ) : (
              <>
                {/* Thread header */}
                <div style={{
                  padding: 'var(--space-md) var(--space-lg)',
                  borderBottom: '1px solid var(--color-border)',
                  background: 'var(--color-surface-elevated)',
                  display: 'flex', alignItems: 'center', gap: 'var(--space-sm)',
                  flexShrink: 0,
                }}>
                  <Avatar name={activeConv.other_participant?.name || '?'} size={32} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--color-text-primary)' }}>
                      {activeConv.other_participant?.name || 'Unknown'}
                    </div>
                    {activeConv.project_title && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                        📁 {activeConv.project_title}
                      </div>
                    )}
                  </div>
                </div>

                {/* Messages */}
                <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-lg)' }}>
                  {loadingThread ? (
                    <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 'var(--space-xl)' }}>
                      Loading messages…
                    </div>
                  ) : messages.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
                      No messages yet. Say hello! 👋
                    </div>
                  ) : (
                    messages.map(msg => {
                      const isOwn = msg.sender === user?.id;
                      return (
                        <div
                          key={msg.id}
                          style={{
                            display: 'flex',
                            flexDirection: isOwn ? 'row-reverse' : 'row',
                            alignItems: 'flex-end',
                            gap: 'var(--space-sm)',
                            marginBottom: 'var(--space-md)',
                          }}
                        >
                          {!isOwn && <Avatar name={msg.sender_name} size={28} />}
                          <div style={{
                            maxWidth: '70%',
                            background: isOwn
                              ? 'linear-gradient(135deg, var(--color-accent), var(--color-primary))'
                              : 'var(--color-surface-elevated)',
                            color: isOwn ? '#fff' : 'var(--color-text-primary)',
                            borderRadius: isOwn ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                            padding: 'var(--space-sm) var(--space-md)',
                            fontSize: '0.85rem',
                            lineHeight: 1.5,
                            boxShadow: 'var(--shadow-sm)',
                          }}>
                            {msg.is_system_message && (
                              <div style={{ fontSize: '0.7rem', opacity: 0.7, marginBottom: '4px' }}>🤖 System</div>
                            )}
                            {msg.content}
                            <div style={{ fontSize: '0.65rem', opacity: 0.65, marginTop: '4px', textAlign: 'right' }}>
                              {timeAgo(msg.created_at)}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={bottomRef} />
                </div>

                {/* Reply box */}
                <form
                  onSubmit={sendMessage}
                  style={{
                    display: 'flex',
                    gap: 'var(--space-sm)',
                    padding: 'var(--space-md) var(--space-lg)',
                    borderTop: '1px solid var(--color-border)',
                    background: 'var(--color-surface-elevated)',
                    flexShrink: 0,
                  }}
                >
                  <textarea
                    ref={inputRef}
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage(e);
                      }
                    }}
                    placeholder="Type a message… (Enter to send, Shift+Enter for newline)"
                    rows={2}
                    style={{
                      flex: 1,
                      background: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      padding: 'var(--space-sm) var(--space-md)',
                      color: 'var(--color-text-primary)',
                      fontSize: '0.85rem',
                      resize: 'none',
                      lineHeight: 1.5,
                    }}
                  />
                  <button
                    type="submit"
                    disabled={sending || !draft.trim()}
                    style={{
                      background: 'linear-gradient(135deg, var(--color-accent), var(--color-primary))',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 'var(--radius-md)',
                      padding: 'var(--space-sm) var(--space-lg)',
                      fontWeight: 700,
                      cursor: sending || !draft.trim() ? 'not-allowed' : 'pointer',
                      opacity: sending || !draft.trim() ? 0.5 : 1,
                      fontSize: '0.9rem',
                      transition: 'all 0.2s ease',
                      alignSelf: 'flex-end',
                    }}
                  >
                    {sending ? '…' : '➤ Send'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
