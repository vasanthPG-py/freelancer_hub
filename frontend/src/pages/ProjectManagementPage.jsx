import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from '../context/RouterContext';
import { projectsAPI, bidsAPI, apiFetch } from '../services/api';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import Alert from '../components/common/Alert';
import Loader from '../components/common/Loader';
import Modal from '../components/common/Modal';
import ProjectCreateModal from '../components/project/ProjectCreateModal';
import ProjectProposalsModal from '../components/project/ProjectProposalsModal';

export default function ProjectManagementPage() {
  const { user, isCustomer, isFreelancer } = useAuth();
  const { query, navigate } = useRouter();

  const [projects, setProjects] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [myBids, setMyBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedProjectForProposals, setSelectedProjectForProposals] = useState(null);
  const [activeTab, setActiveTab] = useState(isCustomer ? 'projects' : 'bids');

  // Simulated Payment Modal State
  const [paymentModalData, setPaymentModalData] = useState(null);
  const [processingPayment, setProcessingPayment] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (isCustomer) {
        const [projRes, contRes] = await Promise.all([
          projectsAPI.getMyProjects(),
          projectsAPI.getContracts(),
        ]);
        setProjects(projRes.results || projRes || []);
        setContracts(contRes.results || contRes || []);
      } else if (isFreelancer) {
        const [bidsRes, contRes] = await Promise.all([
          bidsAPI.getMyBids(),
          projectsAPI.getContracts(),
        ]);
        setMyBids(bidsRes.results || bidsRes || []);
        setContracts(contRes.results || contRes || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load project management data.');
    } finally {
      setLoading(false);
    }
  }, [isCustomer, isFreelancer]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Project status toggle (Customer only)
  const handleStatusChange = async (projectId, newStatus) => {
    try {
      await projectsAPI.update(projectId, { status: newStatus });
      setSuccessMsg(`Project status updated to ${newStatus}.`);
      loadData();
    } catch (err) {
      setError(err.message || 'Failed to update project status.');
    }
  };

  // Withdraw bid (Freelancer only)
  const handleWithdrawBid = async (bidId) => {
    if (!window.confirm('Are you sure you want to withdraw this proposal?')) return;
    try {
      await bidsAPI.withdraw(bidId);
      setSuccessMsg('Proposal withdrawn successfully.');
      loadData();
    } catch (err) {
      setError(err.message || 'Failed to withdraw proposal.');
    }
  };

  // Trigger Simulated Milestone Payment (Customer only)
  const handleSimulatePayment = async () => {
    if (!paymentModalData) return;
    setProcessingPayment(true);
    setError('');
    try {
      await apiFetch('/api/payments/simulate-payment/', {
        method: 'POST',
        body: {
          contract_id: paymentModalData.contractId,
          milestone_id: paymentModalData.milestoneId,
          amount: paymentModalData.amount,
          transaction_type: 'MILESTONE_RELEASE',
          note: `Simulated milestone payment for ${paymentModalData.milestoneTitle}`,
        },
      });
      setSuccessMsg(`Simulated payout of $${paymentModalData.amount} approved and released.`);
      setPaymentModalData(null);
      loadData();
    } catch (err) {
      setError(err.message || 'Failed to process simulated payout.');
    } finally {
      setProcessingPayment(false);
    }
  };

  return (
    <div className="content-wrapper" style={{ padding: 'var(--space-2xl) 0' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xl)', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', marginBottom: 4 }}>
            Project Management & Bidding
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
            {isCustomer
              ? 'Manage project lifecycles, review applicant proposals, compare bids, and oversee milestone deliveries.'
              : 'Track your submitted proposals, review proposal statuses, and coordinate milestone deliverables.'}
          </p>
        </div>

        {isCustomer && (
          <Button variant="accent" onClick={() => setCreateModalOpen(true)}>
            + Post New Project
          </Button>
        )}
      </div>

      {error && <Alert type="error" onClose={() => setError('')}>{error}</Alert>}
      {successMsg && <Alert type="success" onClose={() => setSuccessMsg('')}>{successMsg}</Alert>}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 'var(--space-sm)', borderBottom: '1px solid var(--border-color)', marginBottom: 'var(--space-xl)' }}>
        {isCustomer && (
          <button
            type="button"
            className={`tab-btn ${activeTab === 'projects' ? 'active' : ''}`}
            onClick={() => setActiveTab('projects')}
            style={{
              padding: '10px 18px',
              border: 'none',
              borderBottom: activeTab === 'projects' ? '2px solid var(--primary-500)' : '2px solid transparent',
              background: 'none',
              color: activeTab === 'projects' ? '#fff' : 'var(--text-muted)',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            My Posted Projects ({projects.length})
          </button>
        )}

        {isFreelancer && (
          <button
            type="button"
            className={`tab-btn ${activeTab === 'bids' ? 'active' : ''}`}
            onClick={() => setActiveTab('bids')}
            style={{
              padding: '10px 18px',
              border: 'none',
              borderBottom: activeTab === 'bids' ? '2px solid var(--primary-500)' : '2px solid transparent',
              background: 'none',
              color: activeTab === 'bids' ? '#fff' : 'var(--text-muted)',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            My Submitted Proposals ({myBids.length})
          </button>
        )}

        <button
          type="button"
          className={`tab-btn ${activeTab === 'contracts' ? 'active' : ''}`}
          onClick={() => setActiveTab('contracts')}
          style={{
            padding: '10px 18px',
            border: 'none',
            borderBottom: activeTab === 'contracts' ? '2px solid var(--primary-500)' : '2px solid transparent',
            background: 'none',
            color: activeTab === 'contracts' ? '#fff' : 'var(--text-muted)',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Active Contracts & Milestones ({contracts.length})
        </button>
      </div>

      {loading ? (
        <Loader text="Loading project details..." />
      ) : (
        <>
          {/* TAB 1: Customer Posted Projects */}
          {activeTab === 'projects' && isCustomer && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              {projects.length === 0 ? (
                <Card style={{ textAlign: 'center', padding: 'var(--space-3xl)' }}>
                  <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-md)' }}>
                    You have not published any projects yet.
                  </p>
                  <Button variant="primary" onClick={() => setCreateModalOpen(true)}>
                    Post Your First Project
                  </Button>
                </Card>
              ) : (
                projects.map((proj) => (
                  <Card key={proj.id} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 4 }}>
                          <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#fff' }}>{proj.title}</h3>
                          <Badge variant={proj.status === 'OPEN' ? 'status-open' : 'status-in-progress'}>
                            {proj.status}
                          </Badge>
                          {proj.category_name && (
                            <Badge variant="category">{proj.category_name}</Badge>
                          )}
                        </div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
                          Posted {new Date(proj.created_at).toLocaleDateString()} • Deadline: {proj.deadline} • Experience: {proj.experience_level}
                        </p>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--accent-400)' }}>
                          ${proj.budget}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          {proj.bids_count || 0} Proposals received
                        </div>
                      </div>
                    </div>

                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0 }}>
                      {proj.description}
                    </p>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-md)', paddingTop: 'var(--space-sm)', borderTop: '1px solid var(--border-color)' }}>
                      {/* Lifecycle Controls */}
                      <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                        {proj.status === 'OPEN' && (
                          <Button size="sm" variant="secondary" onClick={() => handleStatusChange(proj.id, 'PAUSED')}>
                            Pause Project
                          </Button>
                        )}
                        {proj.status === 'PAUSED' && (
                          <Button size="sm" variant="primary" onClick={() => handleStatusChange(proj.id, 'OPEN')}>
                            Resume Project
                          </Button>
                        )}
                        {proj.status !== 'CLOSED' && (
                          <Button size="sm" variant="outline" onClick={() => handleStatusChange(proj.id, 'CLOSED')}>
                            Close Project
                          </Button>
                        )}
                      </div>

                      {/* Proposals Button */}
                      <Button
                        size="sm"
                        variant="accent"
                        onClick={() => setSelectedProjectForProposals(proj)}
                      >
                        Review Proposals ({proj.bids_count || 0})
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}

          {/* TAB 2: Freelancer Submitted Bids */}
          {activeTab === 'bids' && isFreelancer && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              {myBids.length === 0 ? (
                <Card style={{ textAlign: 'center', padding: 'var(--space-3xl)' }}>
                  <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-md)' }}>
                    You have not submitted any proposals yet.
                  </p>
                  <Button variant="primary" onClick={() => navigate('/marketplace')}>
                    Browse Marketplace Projects
                  </Button>
                </Card>
              ) : (
                myBids.map((bid) => (
                  <Card key={bid.id} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 4 }}>
                          <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#fff' }}>
                            {bid.project_title || `Project #${bid.project}`}
                          </h3>
                          <Badge variant={
                            bid.status === 'ACCEPTED' ? 'status-completed' :
                            bid.status === 'SHORTLISTED' ? 'status-open' :
                            bid.status === 'REJECTED' ? 'status-closed' : 'status-in-progress'
                          }>
                            {bid.status}
                          </Badge>
                        </div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
                          Submitted: {new Date(bid.created_at).toLocaleDateString()} • Delivery: {bid.delivery_days} days
                        </p>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary-400)' }}>
                          ${bid.bid_amount}
                        </div>
                      </div>
                    </div>

                    <div style={{ background: 'var(--bg-canvas)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', fontSize: '0.9rem' }}>
                      <strong style={{ display: 'block', color: 'var(--text-muted)', marginBottom: 4 }}>Proposal Cover Letter:</strong>
                      <p style={{ color: 'var(--text-secondary)', margin: 0, whiteSpace: 'pre-line' }}>{bid.cover_letter}</p>
                    </div>

                    {bid.status === 'PENDING' && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)' }}>
                        <Button size="sm" variant="danger" onClick={() => handleWithdrawBid(bid.id)}>
                          Withdraw Proposal
                        </Button>
                      </div>
                    )}
                  </Card>
                ))
              )}
            </div>
          )}

          {/* TAB 3: Contracts & Milestones (Both roles) */}
          {activeTab === 'contracts' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
              {contracts.length === 0 ? (
                <Card style={{ textAlign: 'center', padding: 'var(--space-3xl)' }}>
                  <p style={{ color: 'var(--text-muted)' }}>No active or completed contracts found.</p>
                </Card>
              ) : (
                contracts.map((contract) => (
                  <Card key={contract.id} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 4 }}>
                          <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#fff' }}>
                            {contract.project_title || `Contract #${contract.id}`}
                          </h3>
                          <Badge variant={contract.status === 'COMPLETED' ? 'status-completed' : 'status-in-progress'}>
                            {contract.status}
                          </Badge>
                        </div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
                          Client: {contract.customer_name || contract.customer_email} • Freelancer: {contract.freelancer_name || contract.freelancer_email}
                        </p>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-400)' }}>
                          Total: ${contract.total_amount}
                        </span>
                      </div>
                    </div>

                    {/* Milestones Table */}
                    <div style={{ marginTop: 'var(--space-sm)' }}>
                      <h4 style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-xs)' }}>
                        Contract Milestones:
                      </h4>
                      {contract.milestones && contract.milestones.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                          {contract.milestones.map((ms) => (
                            <div
                              key={ms.id}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: 'var(--space-sm) var(--space-md)',
                                background: 'var(--bg-canvas)',
                                borderRadius: 'var(--radius-sm)',
                                flexWrap: 'wrap',
                                gap: 'var(--space-xs)',
                              }}
                            >
                              <div>
                                <span style={{ fontWeight: 600, color: '#fff', marginRight: 'var(--space-sm)' }}>
                                  {ms.title}
                                </span>
                                <Badge variant={
                                  ms.status === 'APPROVED' ? 'status-completed' :
                                  ms.status === 'SUBMITTED' ? 'status-open' : 'status-in-progress'
                                }>
                                  {ms.status}
                                </Badge>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                                <strong style={{ color: 'var(--accent-400)' }}>${ms.amount}</strong>
                                {isCustomer && ms.status !== 'APPROVED' && (
                                  <Button
                                    size="sm"
                                    variant="primary"
                                    onClick={() => setPaymentModalData({
                                      contractId: contract.id,
                                      milestoneId: ms.id,
                                      milestoneTitle: ms.title,
                                      amount: ms.amount,
                                    })}
                                  >
                                    Approve & Release (Simulated)
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No milestones configured.</p>
                      )}
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}
        </>
      )}

      {/* Project Create Modal */}
      {createModalOpen && (
        <ProjectCreateModal
          onClose={() => setCreateModalOpen(false)}
          onSuccess={() => {
            setCreateModalOpen(false);
            setSuccessMsg('Project published to the marketplace!');
            loadData();
          }}
        />
      )}

      {/* Project Proposals Comparison Modal */}
      {selectedProjectForProposals && (
        <ProjectProposalsModal
          project={selectedProjectForProposals}
          onClose={() => setSelectedProjectForProposals(null)}
          onHired={() => {
            setSelectedProjectForProposals(null);
            setSuccessMsg('Freelancer successfully hired for the project!');
            loadData();
          }}
        />
      )}

      {/* Simulated Milestone Payment Modal */}
      {paymentModalData && (
        <Modal
          isOpen
          onClose={() => setPaymentModalData(null)}
          title="Simulated Milestone Payout Authorization"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <Alert type="info">
              <strong>Simulated Payment Notice:</strong> FreelanceHub uses a simulated test ledger. No real credit card or bank account is billed.
            </Alert>
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
              Authorize release of simulated milestone payment:
            </p>
            <div style={{ background: 'var(--bg-canvas)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: 'var(--text-muted)' }}>Milestone:</span>
                <strong style={{ color: '#fff' }}>{paymentModalData.milestoneTitle}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Payout Amount:</span>
                <strong style={{ color: 'var(--accent-400)', fontSize: '1.2rem' }}>${paymentModalData.amount}</strong>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)' }}>
              <Button variant="secondary" onClick={() => setPaymentModalData(null)} disabled={processingPayment}>
                Cancel
              </Button>
              <Button variant="accent" onClick={handleSimulatePayment} loading={processingPayment}>
                Authorize Simulated Payment
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
