import React, { useState, useEffect, useCallback } from 'react';
import Modal from '../common/Modal';
import Card from '../common/Card';
import Badge from '../common/Badge';
import Button from '../common/Button';
import Alert from '../common/Alert';
import Loader from '../common/Loader';
import { bidsAPI, projectsAPI } from '../../services/api';

export default function ProjectProposalsModal({ isOpen, onClose, project, onHired }) {
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchBids = useCallback(async () => {
    if (!project?.id) return;
    setLoading(true);
    try {
      const data = await bidsAPI.getProjectBids(project.id);
      setBids(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      setError(err.message || 'Failed to load project proposals.');
    } finally {
      setLoading(false);
    }
  }, [project?.id]);

  useEffect(() => {
    if (isOpen) {
      fetchBids();
    }
  }, [isOpen, fetchBids]);

  const handleAction = async (bidId, actionType) => {
    setActionLoading(true);
    setError('');
    try {
      if (actionType === 'SHORTLIST') {
        await bidsAPI.shortlist(bidId);
        setSuccess('Proposal shortlisted.');
      } else if (actionType === 'REJECT') {
        await bidsAPI.reject(bidId);
        setSuccess('Proposal rejected.');
      }
      fetchBids();
    } catch (err) {
      setError(err.message || 'Failed to update proposal status.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleHire = async (bid) => {
    if (!window.confirm(`Confirm hiring ${bid.freelancer_name} for $${bid.bid_amount}? This will create an active contract and fund escrow milestones.`)) {
      return;
    }
    setActionLoading(true);
    setError('');
    try {
      const result = await projectsAPI.hireFreelancer(project.id, bid.id);
      setSuccess(`Hired ${bid.freelancer_name} successfully! Contract created.`);
      if (onHired) onHired(result.contract);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to execute hiring agreement.');
    } finally {
      setActionLoading(false);
    }
  };

  const statusVariant = {
    PENDING: 'warning',
    SHORTLISTED: 'primary',
    ACCEPTED: 'success',
    REJECTED: 'danger',
    WITHDRAWN: 'default',
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Proposals for "${project?.title}"`} maxWidth={820}>
      {error && <Alert type="error" onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert type="success" onClose={() => setSuccess('')}>{success}</Alert>}

      <div style={{ background: 'var(--bg-canvas)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-lg)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
        <div>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Project Budget:</span>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-400)' }}>${project?.budget}</div>
        </div>
        <div>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Status:</span>
          <div><Badge variant="primary">{project?.status}</Badge></div>
        </div>
        <div>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Proposals Received:</span>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>{bids.length}</div>
        </div>
      </div>

      {loading ? (
        <Loader message="Loading proposals..." />
      ) : bids.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-2xl) 0', color: 'var(--text-muted)' }}>
          <p>No proposals submitted for this project yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {bids.map((bid) => (
            <Card key={bid.id} style={{ background: 'var(--bg-surface-elevated)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                    <h4 style={{ margin: 0 }}>{bid.freelancer_name}</h4>
                    {bid.freelancer_is_verified ? (
                      <Badge variant="verified" style={{ fontSize: '0.72rem' }}>AI-Verified</Badge>
                    ) : (
                      <Badge variant="warning" style={{ fontSize: '0.72rem' }}>Unverified</Badge>
                    )}
                  </div>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    {bid.freelancer_title || 'Freelancer'} • Standard Rate: ${bid.freelancer_hourly_rate}/hr
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-400)' }}>
                      ${bid.bid_amount}
                    </div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      in {bid.delivery_days} days
                    </span>
                  </div>
                  <Badge variant={statusVariant[bid.status] || 'primary'}>
                    {bid.status}
                  </Badge>
                </div>
              </div>

              <div style={{ marginBottom: 'var(--space-md)' }}>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 2 }}>Cover Letter:</div>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {bid.cover_letter}
                </p>
              </div>

              {bid.milestones && bid.milestones.length > 0 && (
                <div style={{ marginBottom: 'var(--space-md)', padding: 'var(--space-xs) var(--space-sm)', background: 'var(--bg-canvas)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Proposed Milestones:</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
                    {bid.milestones.map((m, idx) => (
                      <span key={m.id || idx} style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>
                        • {m.title}: <strong>${m.amount}</strong> ({m.delivery_days}d)
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Action buttons (only if project is still OPEN) */}
              {project.status === 'OPEN' && bid.status !== 'ACCEPTED' && bid.status !== 'WITHDRAWN' && (
                <div style={{ display: 'flex', gap: 'var(--space-xs)', justifyContent: 'flex-end', borderTop: '1px solid var(--border-subtle)', paddingTop: 'var(--space-sm)' }}>
                  {bid.status !== 'SHORTLISTED' && (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={actionLoading}
                      onClick={() => handleAction(bid.id, 'SHORTLIST')}
                    >
                      Shortlist
                    </Button>
                  )}
                  {bid.status !== 'REJECTED' && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={actionLoading}
                      onClick={() => handleAction(bid.id, 'REJECT')}
                    >
                      Reject
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="accent"
                    disabled={actionLoading}
                    onClick={() => handleHire(bid)}
                  >
                    Hire Freelancer
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </Modal>
  );
}
