import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from '../context/RouterContext';
import { profilesAPI, projectsAPI } from '../services/api';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import Alert from '../components/common/Alert';
import Loader from '../components/common/Loader';
import CustomerProfileModal from '../components/profile/CustomerProfileModal';
import ProjectCreateModal from '../components/project/ProjectCreateModal';
import ProjectProposalsModal from '../components/project/ProjectProposalsModal';

export default function CustomerDashboardPage() {
  const { user } = useAuth();
  const { navigate } = useRouter();

  const [profile, setProfile] = useState(null);
  const [projects, setProjects] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Modals
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [proposalsProject, setProposalsProject] = useState(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      const [profData, projData, contData] = await Promise.all([
        profilesAPI.getCustomerProfile(),
        projectsAPI.getMyProjects(),
        projectsAPI.getContracts(),
      ]);
      setProfile(profData);
      setProjects(Array.isArray(projData) ? projData : projData.results || []);
      setContracts(Array.isArray(contData) ? contData : contData.results || []);
    } catch (err) {
      setError(err.message || 'Unable to load customer management hub.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleApproveMilestone = async (milestoneId) => {
    if (!window.confirm('Approve this milestone deliverable and release funds to freelancer?')) return;
    try {
      await projectsAPI.updateMilestone(milestoneId, 'APPROVED');
      setSuccessMessage('Milestone approved and simulated funds released.');
      fetchDashboardData();
    } catch (err) {
      setError(err.message || 'Failed to approve milestone.');
    }
  };

  if (loading) {
    return <Loader message="Loading your client management hub..." fullScreen />;
  }

  // Calculate dynamic metrics
  const activeProjectsCount = projects.filter((p) => p.status === 'OPEN').length;
  const totalBidsReceived = projects.reduce((acc, p) => acc + (p.bids_count || 0), 0);
  const activeContractsCount = contracts.filter((c) => c.status === 'ACTIVE').length;
  const totalEscrowBudget = contracts.reduce((acc, c) => acc + parseFloat(c.total_amount || 0), 0);

  const statusVariant = {
    OPEN: 'success',
    IN_PROGRESS: 'primary',
    COMPLETED: 'default',
    PAUSED: 'warning',
    CLOSED: 'danger',
  };

  return (
    <div style={{ padding: 'var(--space-2xl) 0' }}>
      <div className="content-wrapper">
        {/* Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-md)', marginBottom: 'var(--space-2xl)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
              <h2>Customer Management Hub</h2>
              <Badge variant="role-customer">Client Account</Badge>
            </div>
            <p>Welcome, {user?.full_name} ({user?.email})</p>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
            <Button variant="accent" onClick={() => setCreateProjectOpen(true)}>
              + Post New Project
            </Button>
            <Button variant="secondary" onClick={() => setEditProfileOpen(true)}>
              Edit Company Profile
            </Button>
            <Button variant="outline" onClick={() => navigate('/marketplace')}>
              Browse Marketplace
            </Button>
          </div>
        </div>

        {error && <Alert type="error" onClose={() => setError('')}>{error}</Alert>}
        {successMessage && <Alert type="success" onClose={() => setSuccessMessage('')}>{successMessage}</Alert>}

        {/* Client KPI Metrics */}
        <div className="grid grid-cols-4" style={{ marginBottom: 'var(--space-2xl)' }}>
          <Card>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Posted Projects</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, margin: '4px 0', color: 'var(--primary-400)' }}>
              {projects.length}
            </div>
            <p style={{ fontSize: '0.78rem' }}>{activeProjectsCount} open for bids</p>
          </Card>

          <Card>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Proposals Received</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, margin: '4px 0', color: 'var(--accent-400)' }}>
              {totalBidsReceived}
            </div>
            <p style={{ fontSize: '0.78rem' }}>Awaiting review</p>
          </Card>

          <Card>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Active Contracts</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, margin: '4px 0', color: '#fff' }}>
              {activeContractsCount}
            </div>
            <p style={{ fontSize: '0.78rem' }}>In development</p>
          </Card>

          <Card>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Total Contracted</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, margin: '4px 0', color: '#38bdf8' }}>
              ${totalEscrowBudget.toFixed(2)}
            </div>
            <p style={{ fontSize: '0.78rem' }}>Simulated escrow funds</p>
          </Card>
        </div>

        {/* Company Overview Card */}
        <Card style={{ marginBottom: 'var(--space-xl)' }}>
          <div className="card-header">
            <div>
              <h3>{profile?.company_name || 'Individual Client Profile'}</h3>
              <p style={{ fontSize: '0.88rem' }}>
                {profile?.location && `📍 ${profile.location} • `}
                {profile?.website ? (
                  <a href={profile.website} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-400)' }}>
                    {profile.website} ↗
                  </a>
                ) : 'No website provided'}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setEditProfileOpen(true)}>
              Edit Details
            </Button>
          </div>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            {profile?.company_bio || 'Provide a brief summary of your organization so top technical freelancers can understand your project vision.'}
          </p>
        </Card>

        {/* Section 1: Manage Posted Projects */}
        <Card style={{ marginBottom: 'var(--space-2xl)' }}>
          <div className="card-header">
            <div>
              <h3>Posted Projects ({projects.length})</h3>
              <p style={{ fontSize: '0.88rem' }}>Manage your project listings, review submitted proposals, and hire talent.</p>
            </div>
            <Button variant="primary" size="sm" onClick={() => setCreateProjectOpen(true)}>
              + Create Listing
            </Button>
          </div>

          {projects.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-2xl) 0', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-xs)' }}>📋</div>
              <p style={{ marginBottom: 'var(--space-md)' }}>You haven't posted any projects yet.</p>
              <Button variant="accent" size="sm" onClick={() => setCreateProjectOpen(true)}>
                Post Your First Project
              </Button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              {projects.map((proj) => (
                <div
                  key={proj.id}
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
                      <h4 style={{ margin: 0 }}>{proj.title}</h4>
                      <Badge variant={statusVariant[proj.status] || 'primary'}>
                        {proj.status}
                      </Badge>
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      Category: {proj.category_name || 'General'} • Budget: <strong>${proj.budget}</strong> • Deadline: {proj.deadline}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-400)' }}>
                        {proj.bids_count || 0}
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Proposals</span>
                    </div>

                    <Button
                      variant={proj.bids_count > 0 ? 'accent' : 'outline'}
                      size="sm"
                      onClick={() => setProposalsProject(proj)}
                    >
                      {proj.bids_count > 0 ? `Review Proposals (${proj.bids_count})` : 'View Proposals'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Section 2: Active Contracts & Milestones */}
        <Card>
          <div className="card-header">
            <div>
              <h3>Active Contracts & Milestones ({contracts.length})</h3>
              <p style={{ fontSize: '0.88rem' }}>Oversight of hired developers, escrow funded deliverables, and release approvals.</p>
            </div>
          </div>

          {contracts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-2xl) 0', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-xs)' }}>🤝</div>
              <p>No active contracts. Hire a freelancer from your incoming proposals to start work.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                        <h4 style={{ margin: 0 }}>{cont.project_title}</h4>
                        <Badge variant={cont.status === 'COMPLETED' ? 'success' : 'primary'}>
                          {cont.status}
                        </Badge>
                      </div>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        Hired Freelancer: <strong>{cont.freelancer_data?.full_name || 'Assigned Developer'}</strong> • Total Contract: <strong>${cont.total_amount}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Milestones list */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 2 }}>Contract Deliverable Milestones:</div>
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

                          {m.status === 'SUBMITTED' && (
                            <Button
                              size="sm"
                              variant="accent"
                              onClick={() => handleApproveMilestone(m.id)}
                            >
                              Approve & Release
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Modals */}
      <CustomerProfileModal
        isOpen={editProfileOpen}
        onClose={() => setEditProfileOpen(false)}
        profile={profile}
        onSaved={(updated) => {
          setProfile(updated);
          setSuccessMessage('Company profile updated successfully.');
        }}
      />

      <ProjectCreateModal
        isOpen={createProjectOpen}
        onClose={() => setCreateProjectOpen(false)}
        onCreated={(newProject) => {
          setProjects((prev) => [newProject, ...prev]);
          setSuccessMessage(`Project "${newProject.title}" published to marketplace!`);
        }}
      />

      {proposalsProject && (
        <ProjectProposalsModal
          isOpen={!!proposalsProject}
          project={proposalsProject}
          onClose={() => setProposalsProject(null)}
          onHired={() => {
            fetchDashboardData();
          }}
        />
      )}
    </div>
  );
}
