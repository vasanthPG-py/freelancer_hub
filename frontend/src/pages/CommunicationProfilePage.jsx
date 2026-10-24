import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { profilesAPI, messagingAPI, reviewsAPI, authAPI, notificationsAPI, apiFetch } from '../services/api';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import Alert from '../components/common/Alert';
import Loader from '../components/common/Loader';
import Modal from '../components/common/Modal';
import ProfileEditModal from '../components/profile/ProfileEditModal';
import PortfolioModal from '../components/profile/PortfolioModal';
import ResumeUploadModal from '../components/profile/ResumeUploadModal';

export default function CommunicationProfilePage() {
  const { user, isCustomer, isFreelancer, updateUser } = useAuth();

  const [activeTab, setActiveTab] = useState('profile');
  const [profileData, setProfileData] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  const [notifications, setNotifications] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [transactions, setTransactions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Password Change state
  const [passwordForm, setPasswordForm] = useState({ old_password: '', new_password: '', confirm_password: '' });
  const [changingPassword, setChangingPassword] = useState(false);

  // Profile modals
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [portfolioModalOpen, setPortfolioModalOpen] = useState(false);
  const [resumeModalOpen, setResumeModalOpen] = useState(false);

  const loadProfileAndData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [profRes, convsRes, notifsRes, txRes] = await Promise.all([
        profilesAPI.getMyProfile().catch(() => null),
        messagingAPI.getConversations().catch(() => []),
        notificationsAPI.list().catch(() => ({ results: [] })),
        apiFetch('/api/payments/transactions/').catch(() => []),
      ]);

      setProfileData(profRes);
      setConversations(convsRes.results || convsRes || []);
      setNotifications(notifsRes.results || notifsRes || []);
      setTransactions(txRes.results || txRes || []);

      if (user?.id) {
        const revsRes = await reviewsAPI.getUserReviews(user.id).catch(() => ({ results: [] }));
        setReviews(revsRes.results || revsRes || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load profile communications.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadProfileAndData();
  }, [loadProfileAndData]);

  // Load messages when a conversation is clicked
  const handleSelectConversation = async (conv) => {
    setSelectedConversation(conv);
    try {
      const data = await messagingAPI.getConversation(conv.id);
      setMessages(data.messages || []);
    } catch (err) {
      setError(err.message || 'Failed to load conversation messages.');
    }
  };

  // Send message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;
    setSendingMsg(true);
    try {
      const sent = await messagingAPI.sendMessage(selectedConversation.id, newMessage.trim());
      setMessages((prev) => [...prev, sent]);
      setNewMessage('');
    } catch (err) {
      setError(err.message || 'Failed to send message.');
    } finally {
      setSendingMsg(false);
    }
  };

  // Mark notification read
  const handleMarkNotificationRead = async (id) => {
    try {
      await notificationsAPI.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      // silent
    }
  };

  // Handle password change
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setError('New passwords do not match.');
      return;
    }
    setChangingPassword(true);
    setError('');
    try {
      await apiFetch('/api/accounts/password/change/', {
        method: 'POST',
        body: {
          old_password: passwordForm.old_password,
          new_password: passwordForm.new_password,
        },
      });
      setSuccessMsg('Password changed successfully.');
      setPasswordForm({ old_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      setError(err.message || 'Failed to update password.');
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="content-wrapper" style={{ padding: 'var(--space-2xl) 0' }}>
      {/* Header */}
      <div style={{ marginBottom: 'var(--space-xl)' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', marginBottom: 4 }}>
          Account, Profile & Communications
        </h1>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
          Manage your public profile presence, secure project-specific communications, ratings, and account settings.
        </p>
      </div>

      {error && <Alert type="error" onClose={() => setError('')}>{error}</Alert>}
      {successMsg && <Alert type="success" onClose={() => setSuccessMsg('')}>{successMsg}</Alert>}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 'var(--space-sm)', borderBottom: '1px solid var(--border-color)', marginBottom: 'var(--space-xl)', overflowX: 'auto' }}>
        {[
          { key: 'profile', label: 'My Public Profile' },
          { key: 'messages', label: `Project Messages (${conversations.length})` },
          { key: 'notifications', label: `Notifications (${notifications.filter((n) => !n.is_read).length} Unread)` },
          { key: 'reviews', label: `Reviews & Ratings (${reviews.length})` },
          { key: 'transactions', label: `Simulated Transactions (${transactions.length})` },
          { key: 'security', label: 'Security & Password' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '10px 18px',
              border: 'none',
              borderBottom: activeTab === tab.key ? '2px solid var(--primary-500)' : '2px solid transparent',
              background: 'none',
              color: activeTab === tab.key ? '#fff' : 'var(--text-muted)',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <Loader text="Loading account details..." />
      ) : (
        <>
          {/* TAB 1: Profile View & Management */}
          {activeTab === 'profile' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-lg)' }}>
              <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-md)' }}>
                  <div>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                      {user?.full_name || user?.email}
                    </h2>
                    <div style={{ display: 'flex', gap: 'var(--space-xs)', marginTop: 4 }}>
                      <Badge variant={isCustomer ? 'role-customer' : 'role-freelancer'}>{user?.role}</Badge>
                      {user?.is_verified ? (
                        <Badge variant="verified">AI Verified ✓</Badge>
                      ) : (
                        <Badge variant="unverified">Unverified</Badge>
                      )}
                    </div>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => setEditProfileOpen(true)}>
                    Edit Profile
                  </Button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', fontSize: '0.92rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Email:</span> <strong>{user?.email}</strong>
                  </div>
                  {isFreelancer && (
                    <>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Professional Title:</span>{' '}
                        <strong>{profileData?.title || 'Not specified'}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Hourly Rate:</span>{' '}
                        <strong style={{ color: 'var(--primary-400)' }}>${profileData?.hourly_rate || '0.00'}/hr</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Location:</span>{' '}
                        <strong>{profileData?.location || 'Remote'}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Bio:</span>
                        <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
                          {profileData?.bio || 'No profile bio added yet.'}
                        </p>
                      </div>
                    </>
                  )}
                  {isCustomer && (
                    <>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Company Name:</span>{' '}
                        <strong>{profileData?.company_name || 'Individual Client'}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Website:</span>{' '}
                        <a href={profileData?.website} target="_blank" rel="noreferrer" style={{ color: 'var(--primary-400)' }}>
                          {profileData?.website || 'N/A'}
                        </a>
                      </div>
                    </>
                  )}
                </div>
              </Card>

              {/* Freelancer Portfolio & Resume Card */}
              {isFreelancer && (
                <Card>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#fff' }}>Portfolio & Resume</h3>
                    <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                      <Button size="sm" variant="secondary" onClick={() => setResumeModalOpen(true)}>
                        Resume
                      </Button>
                      <Button size="sm" variant="primary" onClick={() => setPortfolioModalOpen(true)}>
                        + Portfolio
                      </Button>
                    </div>
                  </div>

                  <div>
                    <h4 style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginBottom: 'var(--space-xs)' }}>
                      Portfolio Showcases:
                    </h4>
                    {profileData?.portfolio_items && profileData.portfolio_items.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                        {profileData.portfolio_items.map((item) => (
                          <div key={item.id} style={{ padding: 'var(--space-sm)', background: 'var(--bg-canvas)', borderRadius: 'var(--radius-sm)' }}>
                            <strong style={{ color: '#fff' }}>{item.title}</strong>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
                              {item.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No portfolio items uploaded.</p>
                    )}
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* TAB 2: Project Messages */}
          {activeTab === 'messages' && (
            <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 'var(--space-md)', minHeight: '520px' }}>
              {/* Conversation list */}
              <Card style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: 'var(--space-md)', borderBottom: '1px solid var(--border-color)', fontWeight: 700, color: '#fff' }}>
                  Contract Conversations
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '480px', overflowY: 'auto' }}>
                  {conversations.length === 0 ? (
                    <div style={{ padding: 'var(--space-lg)', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                      No active contract conversations. Secure messaging unlocks once a project contract is signed.
                    </div>
                  ) : (
                    conversations.map((conv) => (
                      <div
                        key={conv.id}
                        onClick={() => handleSelectConversation(conv)}
                        style={{
                          padding: 'var(--space-md)',
                          borderBottom: '1px solid var(--border-color)',
                          cursor: 'pointer',
                          background: selectedConversation?.id === conv.id ? 'var(--bg-elevated)' : 'transparent',
                        }}
                      >
                        <strong style={{ color: '#fff', fontSize: '0.95rem', display: 'block' }}>
                          {conv.project_title || `Contract #${conv.contract}`}
                        </strong>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {conv.other_party_name || conv.other_party_email}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </Card>

              {/* Chat Thread */}
              <Card style={{ display: 'flex', flexDirection: 'column', padding: 0 }}>
                {selectedConversation ? (
                  <>
                    <div style={{ padding: 'var(--space-md)', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-canvas)' }}>
                      <strong style={{ color: '#fff' }}>{selectedConversation.project_title}</strong>
                      <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Direct messaging with {selectedConversation.other_party_name || selectedConversation.other_party_email}
                      </span>
                    </div>

                    <div style={{ flex: 1, padding: 'var(--space-md)', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', minHeight: '340px', maxHeight: '420px' }}>
                      {messages.length === 0 ? (
                        <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: 'var(--space-2xl)' }}>
                          No messages in this contract thread yet. Say hello!
                        </div>
                      ) : (
                        messages.map((msg) => {
                          const isMe = msg.sender === user?.id;
                          return (
                            <div
                              key={msg.id}
                              style={{
                                alignSelf: isMe ? 'flex-end' : 'flex-start',
                                maxWidth: '75%',
                                padding: 'var(--space-sm) var(--space-md)',
                                borderRadius: 'var(--radius-md)',
                                background: isMe ? 'var(--primary-600)' : 'var(--bg-canvas)',
                                color: '#fff',
                                fontSize: '0.92rem',
                              }}
                            >
                              <div style={{ fontSize: '0.75rem', opacity: 0.7, marginBottom: 2 }}>
                                {msg.sender_name || (isMe ? 'You' : 'Client')} • {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                              <div>{msg.content}</div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: 'var(--space-sm)', padding: 'var(--space-md)', borderTop: '1px solid var(--border-color)' }}>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        style={{ flex: 1 }}
                      />
                      <Button variant="primary" type="submit" loading={sendingMsg}>
                        Send
                      </Button>
                    </form>
                  </>
                ) : (
                  <div style={{ padding: 'var(--space-3xl)', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Select a conversation from the left to view the project chat thread.
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* TAB 3: Notifications */}
          {activeTab === 'notifications' && (
            <Card>
              <h3 style={{ margin: '0 0 var(--space-md) 0', color: '#fff' }}>Recent Notifications</h3>
              {notifications.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>You have no notifications at this time.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      style={{
                        padding: 'var(--space-md)',
                        background: notif.is_read ? 'transparent' : 'rgba(99, 102, 241, 0.08)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', marginBottom: 2 }}>
                          <strong style={{ color: '#fff' }}>{notif.title}</strong>
                          <Badge variant="category">{notif.notification_type}</Badge>
                        </div>
                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                          {notif.message}
                        </p>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {new Date(notif.created_at).toLocaleString()}
                        </span>
                      </div>
                      {!notif.is_read && (
                        <Button size="sm" variant="secondary" onClick={() => handleMarkNotificationRead(notif.id)}>
                          Mark Read
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* TAB 4: Reviews & Ratings */}
          {activeTab === 'reviews' && (
            <Card>
              <h3 style={{ margin: '0 0 var(--space-md) 0', color: '#fff' }}>Client & Freelancer Reviews</h3>
              {reviews.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>No completed project reviews recorded yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                  {reviews.map((rev) => (
                    <div key={rev.id} style={{ padding: 'var(--space-md)', background: 'var(--bg-canvas)', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <strong style={{ color: '#fff' }}>{rev.reviewer_name}</strong>
                        <span style={{ color: 'var(--accent-400)', fontWeight: 700 }}>
                          ★ {rev.overall_rating} / 5.0
                        </span>
                      </div>
                      <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0 0', fontSize: '0.92rem' }}>
                        "{rev.comment}"
                      </p>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(rev.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* TAB 5: Simulated Transactions */}
          {activeTab === 'transactions' && (
            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
                <div>
                  <h3 style={{ margin: 0, color: '#fff' }}>Simulated Transaction Ledger</h3>
                  <span style={{ fontSize: '0.82rem', color: 'var(--accent-400)' }}>
                    [SIMULATION MODE] No real monetary exchange or payment gateway
                  </span>
                </div>
              </div>

              {transactions.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>No simulated transactions recorded for your account.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                        <th style={{ padding: '8px' }}>Ref #</th>
                        <th style={{ padding: '8px' }}>Project</th>
                        <th style={{ padding: '8px' }}>Type</th>
                        <th style={{ padding: '8px' }}>Amount</th>
                        <th style={{ padding: '8px' }}>Status</th>
                        <th style={{ padding: '8px' }}>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((tx) => (
                        <tr key={tx.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '10px 8px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                            {tx.reference_id?.slice(0, 8)}...
                          </td>
                          <td style={{ padding: '10px 8px', color: '#fff' }}>{tx.project_title}</td>
                          <td style={{ padding: '10px 8px' }}>
                            <Badge variant="category">{tx.transaction_type}</Badge>
                          </td>
                          <td style={{ padding: '10px 8px', fontWeight: 700, color: 'var(--accent-400)' }}>
                            ${tx.amount}
                          </td>
                          <td style={{ padding: '10px 8px' }}>
                            <Badge variant="status-completed">{tx.status}</Badge>
                          </td>
                          <td style={{ padding: '10px 8px', color: 'var(--text-muted)' }}>
                            {new Date(tx.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}

          {/* TAB 6: Security & Password */}
          {activeTab === 'security' && (
            <Card style={{ maxWidth: '520px' }}>
              <h3 style={{ margin: '0 0 var(--space-md) 0', color: '#fff' }}>Change Account Password</h3>
              <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="old_pw">Current Password *</label>
                  <input
                    id="old_pw"
                    type="password"
                    className="form-input"
                    value={passwordForm.old_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, old_password: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="new_pw">New Password (min 8 chars) *</label>
                  <input
                    id="new_pw"
                    type="password"
                    className="form-input"
                    value={passwordForm.new_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                    required
                    minLength={8}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="conf_pw">Confirm New Password *</label>
                  <input
                    id="conf_pw"
                    type="password"
                    className="form-input"
                    value={passwordForm.confirm_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                    required
                    minLength={8}
                  />
                </div>
                <Button type="submit" variant="primary" loading={changingPassword}>
                  Update Password
                </Button>
              </form>
            </Card>
          )}
        </>
      )}

      {/* Profile Edit Modal */}
      {editProfileOpen && (
        <ProfileEditModal
          profile={profileData}
          onClose={() => setEditProfileOpen(false)}
          onSuccess={(updated) => {
            setProfileData(updated);
            setEditProfileOpen(false);
            setSuccessMsg('Profile updated successfully.');
          }}
        />
      )}

      {/* Portfolio Modal */}
      {portfolioModalOpen && (
        <PortfolioModal
          onClose={() => setPortfolioModalOpen(false)}
          onSuccess={() => {
            setPortfolioModalOpen(false);
            setSuccessMsg('Portfolio item added.');
            loadProfileAndData();
          }}
        />
      )}

      {/* Resume Modal */}
      {resumeModalOpen && (
        <ResumeUploadModal
          onClose={() => setResumeModalOpen(false)}
          onSuccess={() => {
            setResumeModalOpen(false);
            setSuccessMsg('Resume parsed and uploaded successfully.');
            loadProfileAndData();
          }}
        />
      )}
    </div>
  );
}
