import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from '../context/RouterContext';
import { profilesAPI, bidsAPI, projectsAPI } from '../services/api';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import Alert from '../components/common/Alert';
import Loader from '../components/common/Loader';

// Profile Modals
import ProfileEditModal from '../components/profile/ProfileEditModal';
import ResumeUploadModal from '../components/profile/ResumeUploadModal';
import PortfolioModal from '../components/profile/PortfolioModal';

export default function FreelancerDashboardPage() {
  const { user } = useAuth();
  const { navigate } = useRouter();

  const [profile, setProfile] = useState(null);
  const [portfolios, setPortfolios] = useState([]);
  const [myBids, setMyBids] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Modals state
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [uploadResumeOpen, setUploadResumeOpen] = useState(false);
  const [addPortfolioOpen, setAddPortfolioOpen] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    try {
      const [profData, portData, bidsData, contData] = await Promise.all([
        profilesAPI.getFreelancerProfile(),
        profilesAPI.getPortfolios(),
        bidsAPI.getMyBids(),
        projectsAPI.getContracts(),
      ]);
      setProfile(profData);
      setPortfolios(Array.isArray(portData) ? portData : portData.results || []);
      setMyBids(Array.isArray(bidsData) ? bidsData : bidsData.results || []);
      setContracts(Array.isArray(contData) ? contData : contData.results || []);
    } catch (err) {
      setError(err.message || 'Unable to retrieve freelancer workspace data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleDeletePortfolio = async (id) => {
    if (!window.confirm('Are you sure you want to remove this portfolio project?')) return;
    try {
      await profilesAPI.deletePortfolio(id);
      setPortfolios((prev) => prev.filter((p) => p.id !== id));
      setSuccessMessage('Portfolio project removed.');
    } catch (err) {
      setError(err.message || 'Failed to remove portfolio project.');
    }
  };

  const handleWithdrawBid = async (bidId) => {
    if (!window.confirm('Are you sure you want to withdraw this proposal?')) return;
    try {
      await bidsAPI.withdraw(bidId);
      setSuccessMessage('Proposal withdrawn successfully.');
      fetchDashboardData();
    } catch (err) {
      setError(err.message || 'Failed to withdraw proposal.');
    }
  };

  const handleSubmitMilestoneWork = async (milestoneId) => {
    if (!window.confirm('Submit work deliverable for client review?')) return;
    try {
      await projectsAPI.updateMilestone(milestoneId, 'SUBMITTED');
      setSuccessMessage('Work submitted for client review.');
      fetchDashboardData();
    } catch (err) {
      setError(err.message || 'Failed to submit milestone work.');
    }
  };

  if (loading) {
    return <Loader message="Loading your freelancer workspace..." fullScreen />;
  }

  const bidStatusVariant = {
    PENDING: 'warning',
    SHORTLISTED: 'primary',
    ACCEPTED: 'success',
    REJECTED: 'danger',
    WITHDRAWN: 'default',
  };

  return (
    <div style={{ padding: 'var(--space-2xl) 0' }}>
      <div className="content-wrapper">
        {/* Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-md)', marginBottom: 'var(--space-2xl)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
              <h2>Freelancer Workspace</h2>
              <Badge variant="role-freelancer">Freelancer Account</Badge>
              {user?.is_verified ? (
                <Badge variant="verified">AI-Verified Talent</Badge>
              ) : (
                <Badge variant="warning">Verification Pending</Badge>
              )}
            </div>
            <p>Welcome, {user?.full_name} ({user?.email})</p>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
            <Button variant="primary" onClick={() => navigate('/assessment')}>
              {user?.is_verified ? 'Retake AI Assessment' : 'Take AI Verification Assessment'}
            </Button>
            <Button variant="outline" onClick={() => navigate('/marketplace')}>
              Browse Marketplace
            </Button>
          </div>
        </div>

        {error && <Alert type="error" onClose={() => setError('')}>{error}</Alert>}
        {successMessage && <Alert type="success" onClose={() => setSuccessMessage('')}>{successMessage}</Alert>}

        {/* Verification Warning Banner if not verified */}
        {!user?.is_verified && (
          <Card style={{ borderLeft: '4px solid var(--warning)', marginBottom: 'var(--space-xl)', background: 'rgba(245, 158, 11, 0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
              <div>
                <h4 style={{ color: '#fbbf24', marginBottom: 4 }}>AI Skill Verification Required</h4>
                <p style={{ fontSize: '0.9rem' }}>
                  Pass your server-evaluated AI assessment to unlock proposal bidding and earn the <strong>AI-Verified</strong> badge.
                </p>
              </div>
              <Button variant="primary" size="sm" onClick={() => navigate('/assessment')}>
                Start Timed Test
              </Button>
            </div>
          </Card>
        )}

        {/* Metrics Overview Grid */}
        <div className="grid grid-cols-4" style={{ marginBottom: 'var(--space-2xl)' }}>
          <Card>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Hourly Rate</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, margin: '4px 0', color: 'var(--accent-400)' }}>
              ${profile?.hourly_rate || '50.00'}<span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>/hr</span>
            </div>
            <p style={{ fontSize: '0.78rem' }}>Tier: {profile?.experience_level || 'INTERMEDIATE'}</p>
          </Card>

          <Card>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Active Proposals</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, margin: '4px 0', color: 'var(--primary-400)' }}>
              {myBids.length}
            </div>
            <p style={{ fontSize: '0.78rem' }}>Submitted across marketplace</p>
          </Card>

          <Card>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Active Contracts</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, margin: '4px 0', color: '#fff' }}>
              {contracts.length}
            </div>
            <p style={{ fontSize: '0.78rem' }}>In active delivery</p>
          </Card>

          <Card>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Resume Status</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, margin: '6px 0', color: profile?.resume ? 'var(--accent-400)' : 'var(--warning)' }}>
              {profile?.resume ? 'Uploaded & Synced' : 'Missing Resume'}
            </div>
            <p style={{ fontSize: '0.78rem' }}>AI input contextualizer</p>
          </Card>
        </div>

        {/* Section: My Submitted Proposals */}
        <Card style={{ marginBottom: 'var(--space-2xl)' }}>
          <div className="card-header">
            <div>
              <h3>Submitted Proposals ({myBids.length})</h3>
              <p style={{ fontSize: '0.88rem' }}>Track client review status, shortlisted bids, and turnaround deadlines.</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/marketplace')}>
              Find More Projects
            </Button>
          </div>

          {myBids.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-2xl) 0', color: 'var(--text-muted)' }}>
              <p>You haven't submitted any proposals yet.</p>
              <Button variant="primary" size="sm" style={{ marginTop: 'var(--space-sm)' }} onClick={() => navigate('/marketplace')}>
                Explore Open Projects
              </Button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              {myBids.map((bid) => (
                <div
                  key={bid.id}
                  style={{
                    background: 'var(--bg-surface-elevated)',
                    padding: 'var(--space-md)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 'var(--space-md)',
                  }}
                >
                  <div style={{ flex: '1 1 300px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', marginBottom: 4 }}>
                      <h4 style={{ margin: 0 }}>{bid.project_title}</h4>
                      <Badge variant={bidStatusVariant[bid.status] || 'primary'}>
                        {bid.status}
                      </Badge>
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      Client: <strong>{bid.customer_company || 'Client'}</strong> • Proposed: <strong>${bid.bid_amount}</strong> ({bid.delivery_days} days delivery)
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                    {['PENDING', 'SHORTLISTED'].includes(bid.status) && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleWithdrawBid(bid.id)}
                      >
                        Withdraw Bid
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Section: Active Hired Contracts & Milestones */}
        {contracts.length > 0 && (
          <Card style={{ marginBottom: 'var(--space-2xl)' }}>
            <div className="card-header">
              <div>
                <h3>Active Contracts & Deliverables ({contracts.length})</h3>
                <p style={{ fontSize: '0.88rem' }}>Milestone execution and deliverable submissions for client approval.</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              {contracts.map((cont) => (
                <div
                  key={cont.id}
                  style={{
                    background: 'var(--bg-surface-elevated)',
                    padding: 'var(--space-md)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)' }}>
                    <div>
                      <h4 style={{ margin: 0 }}>{cont.project_title}</h4>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        Client: <strong>{cont.customer_data?.company_name || 'Client'}</strong> • Total Value: <strong>${cont.total_amount}</strong>
                      </span>
                    </div>
                    <Badge variant={cont.status === 'COMPLETED' ? 'success' : 'primary'}>
                      {cont.status}
                    </Badge>
                  </div>

                  {/* Milestones */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                    {(cont.milestones || []).map((m) => (
                      <div
                        key={m.id}
                        style={{
                          background: 'var(--bg-canvas)',
                          padding: 'var(--space-xs) var(--space-md)',
                          borderRadius: 'var(--radius-sm)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: 'var(--space-sm)',
                        }}
                      >
                        <div>
                          <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{m.title}</span>
                          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginLeft: 8 }}>
                            ${m.amount}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                          <Badge
                            variant={
                              m.status === 'APPROVED' ? 'success' :
                              m.status === 'SUBMITTED' ? 'warning' : 'primary'
                            }
                          >
                            {m.status}
                          </Badge>

                          {m.status === 'FUNDED' && (
                            <Button
                              size="sm"
                              variant="accent"
                              onClick={() => handleSubmitMilestoneWork(m.id)}
                            >
                              Submit Deliverable
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Profile Details & Skills Card */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--space-xl)', marginBottom: 'var(--space-2xl)' }}>
          <Card>
            <div className="card-header">
              <div>
                <h3>{profile?.title || 'Add Professional Title'}</h3>
                <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                  📍 {profile?.location || 'Location not specified'} • Tier: {profile?.experience_level}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                <Button variant="secondary" size="sm" onClick={() => setEditProfileOpen(true)}>
                  Edit Profile
                </Button>
                <Button variant="outline" size="sm" onClick={() => setUploadResumeOpen(true)}>
                  Upload Resume
                </Button>
              </div>
            </div>

            <p style={{ marginBottom: 'var(--space-lg)', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              {profile?.bio || 'You have not added a summary yet. Click "Edit Profile" to highlight your core engineering accomplishments.'}
            </p>

            <div style={{ marginBottom: 'var(--space-md)' }}>
              <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#fff', marginBottom: 'var(--space-xs)' }}>
                Technical Competencies & Stack:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {profile?.skills_data && profile.skills_data.length > 0 ? (
                  profile.skills_data.map((skill) => (
                    <Badge key={skill.id} variant="primary">
                      {skill.name}
                    </Badge>
                  ))
                ) : (
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    No skills attached yet. Click "Edit Profile" to tag your technical proficiencies.
                  </span>
                )}
              </div>
            </div>

            {profile?.resume && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', padding: 'var(--space-sm) var(--space-md)', background: 'var(--bg-canvas)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', marginTop: 'var(--space-md)' }}>
                <span>📄</span>
                <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)', flex: 1 }}>
                  {profile.resume.original_name}
                </span>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Uploaded {new Date(profile.resume.uploaded_at).toLocaleDateString()}
                </span>
              </div>
            )}
          </Card>
        </div>

        {/* Portfolio Showcase Grid */}
        <Card>
          <div className="card-header">
            <div>
              <h3>Featured Engineering Portfolio</h3>
              <p style={{ fontSize: '0.88rem' }}>Showcase projects validating your past delivery and technical capabilities.</p>
            </div>
            <Button variant="accent" size="sm" onClick={() => setAddPortfolioOpen(true)}>
              + Add Showcase Project
            </Button>
          </div>

          {portfolios.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-2xl) 0', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-xs)' }}>📁</div>
              <p style={{ marginBottom: 'var(--space-md)' }}>No portfolio items created yet.</p>
              <Button variant="outline" size="sm" onClick={() => setAddPortfolioOpen(true)}>
                Add Your First Project
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2" style={{ gap: 'var(--space-md)' }}>
              {portfolios.map((item) => (
                <Card key={item.id} style={{ background: 'var(--bg-surface-elevated)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-xs)' }}>
                    <h4>{item.title}</h4>
                    <button
                      type="button"
                      onClick={() => handleDeletePortfolio(item.id)}
                      aria-label="Delete portfolio project"
                      style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '1rem' }}
                    >
                      🗑️
                    </button>
                  </div>
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-md)', minHeight: 48 }}>
                    {item.description}
                  </p>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: 'var(--space-md)' }}>
                    {(item.skills_data || []).map((s) => (
                      <Badge key={s.id} variant="primary" style={{ fontSize: '0.7rem' }}>
                        {s.name}
                      </Badge>
                    ))}
                  </div>

                  {item.project_url && (
                    <a
                      href={item.project_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary-400)', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                    >
                      <span>Explore Live Project</span> ↗
                    </a>
                  )}
                </Card>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Profile Modals */}
      <ProfileEditModal
        isOpen={editProfileOpen}
        onClose={() => setEditProfileOpen(false)}
        profile={profile}
        onSaved={(updated) => {
          setProfile(updated);
          setSuccessMessage('Profile information saved.');
        }}
      />

      <ResumeUploadModal
        isOpen={uploadResumeOpen}
        onClose={() => setUploadResumeOpen(false)}
        currentResume={profile?.resume}
        currentText={profile?.resume_text}
        onUploaded={(newResume, extractedText) => {
          setProfile((prev) => ({
            ...prev,
            resume: newResume,
            resume_text: extractedText,
          }));
          setSuccessMessage('Resume uploaded and synchronized.');
        }}
      />

      <PortfolioModal
        isOpen={addPortfolioOpen}
        onClose={() => setAddPortfolioOpen(false)}
        onCreated={(newItem) => {
          setPortfolios((prev) => [newItem, ...prev]);
          setSuccessMessage('Project added to portfolio.');
        }}
      />
    </div>
  );
}
