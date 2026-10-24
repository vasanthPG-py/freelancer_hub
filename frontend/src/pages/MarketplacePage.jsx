import React, { useState, useEffect, useCallback, useRef } from 'react';
import { projectsAPI, bidsAPI, profilesAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useRouter } from '../context/RouterContext';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import Alert from '../components/common/Alert';
import Loader from '../components/common/Loader';
import Modal from '../components/common/Modal';

// ─── Bid Submission Modal ──────────────────────────────────────────────────────
function BidModal({ project, onClose, onSuccess }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    bid_amount: '',
    delivery_days: '',
    cover_letter: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await bidsAPI.submit({
        project: project.id,
        bid_amount: parseFloat(form.bid_amount),
        delivery_days: parseInt(form.delivery_days),
        cover_letter: form.cover_letter,
      });
      onSuccess();
    } catch (err) {
      const errData = err.data || {};
      const msg = Object.values(errData).flat().join(' ') || err.message || 'Failed to submit bid.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={`Submit Proposal — ${project.title}`}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        {error && <Alert type="error" onClose={() => setError('')}>{error}</Alert>}

        {!user?.is_verified && (
          <Alert type="warning">
            You must pass the AI Skill Verification Assessment to submit proposals.
          </Alert>
        )}

        <div style={{ background: 'var(--bg-canvas)', borderRadius: 'var(--radius-md)', padding: 'var(--space-md)', fontSize: '0.9rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ color: 'var(--text-muted)' }}>Client Budget:</span>
            <strong style={{ color: 'var(--accent-400)' }}>${project.budget}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Deadline:</span>
            <span>{project.deadline}</span>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="bid_amount">Your Bid Amount (USD) *</label>
          <input
            id="bid_amount"
            type="number"
            min="1"
            step="0.01"
            className="form-input"
            placeholder={`Budget: $${project.budget}`}
            value={form.bid_amount}
            onChange={(e) => setForm({ ...form, bid_amount: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="delivery_days">Delivery Time (Days) *</label>
          <input
            id="delivery_days"
            type="number"
            min="1"
            max="365"
            className="form-input"
            placeholder="e.g. 30"
            value={form.delivery_days}
            onChange={(e) => setForm({ ...form, delivery_days: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="cover_letter">Cover Letter / Proposal *</label>
          <textarea
            id="cover_letter"
            className="form-input"
            rows={6}
            placeholder="Describe your approach, relevant experience, and why you're the best fit for this project..."
            value={form.cover_letter}
            onChange={(e) => setForm({ ...form, cover_letter: e.target.value })}
            required
            minLength={100}
            style={{ resize: 'vertical', fontFamily: 'inherit' }}
          />
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
            {form.cover_letter.length} chars (minimum 100)
          </div>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'flex-end' }}>
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={submitting || !user?.is_verified}
          >
            {submitting ? 'Submitting...' : 'Submit Proposal'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Project Card ─────────────────────────────────────────────────────────────
function ProjectCard({ project, onBid, onViewDetail, userRole }) {
  const expColors = {
    ENTRY: 'success',
    INTERMEDIATE: 'primary',
    EXPERT: 'warning',
  };

  const daysLeft = project.deadline
    ? Math.max(0, Math.ceil((new Date(project.deadline) - new Date()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <Card style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-sm)' }}>
        <div style={{ flex: 1 }}>
          <h4
            style={{ marginBottom: 4, cursor: 'pointer', lineHeight: 1.3 }}
            onClick={() => onViewDetail(project.id)}
          >
            {project.title}
          </h4>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            {project.category_data?.name || 'General'} •{' '}
            {project.customer_data?.company_name || 'Client'}
          </span>
        </div>
        <Badge variant={expColors[project.experience_level] || 'primary'}>
          {project.experience_level}
        </Badge>
      </div>

      {/* Description */}
      <p style={{
        fontSize: '0.88rem',
        color: 'var(--text-secondary)',
        lineHeight: 1.6,
        display: '-webkit-box',
        WebkitLineClamp: 3,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        flex: 1,
      }}>
        {project.description}
      </p>

      {/* Skills */}
      {project.skills_data && project.skills_data.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {project.skills_data.slice(0, 5).map((skill) => (
            <Badge key={skill.id} variant="primary" style={{ fontSize: '0.72rem' }}>
              {skill.name}
            </Badge>
          ))}
          {project.skills_data.length > 5 && (
            <Badge variant="default" style={{ fontSize: '0.72rem' }}>
              +{project.skills_data.length - 5}
            </Badge>
          )}
        </div>
      )}

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-sm)', paddingTop: 'var(--space-sm)', borderTop: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Budget</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-400)' }}>${project.budget}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Bids</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>{project.bids_count || 0}</div>
          </div>
          {daysLeft !== null && (
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Deadline</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: daysLeft <= 7 ? 'var(--danger)' : 'var(--text-main)' }}>
                {daysLeft}d left
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
          <Button variant="outline" size="sm" onClick={() => onViewDetail(project.id)}>
            Details
          </Button>
          {userRole === 'FREELANCER' && (
            <Button variant="primary" size="sm" onClick={() => onBid(project)}>
              Bid Now
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

// ─── Marketplace Filters ──────────────────────────────────────────────────────
function MarketplaceFilters({ filters, categories, onFilterChange, onReset }) {
  return (
    <Card style={{ marginBottom: 'var(--space-xl)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-md)', alignItems: 'end' }}>
        {/* Search */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Search Projects</label>
          <input
            type="text"
            className="form-input"
            placeholder="Title, description..."
            value={filters.search}
            onChange={(e) => onFilterChange('search', e.target.value)}
          />
        </div>

        {/* Category */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Category</label>
          <select
            className="form-input"
            value={filters.category}
            onChange={(e) => onFilterChange('category', e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        {/* Experience Level */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Experience Level</label>
          <select
            className="form-input"
            value={filters.experience_level}
            onChange={(e) => onFilterChange('experience_level', e.target.value)}
          >
            <option value="">Any Level</option>
            <option value="ENTRY">Entry Level</option>
            <option value="INTERMEDIATE">Intermediate</option>
            <option value="EXPERT">Expert</option>
          </select>
        </div>

        {/* Min Budget */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Min Budget ($)</label>
          <input
            type="number"
            className="form-input"
            placeholder="0"
            value={filters.min_budget}
            onChange={(e) => onFilterChange('min_budget', e.target.value)}
          />
        </div>

        {/* Max Budget */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Max Budget ($)</label>
          <input
            type="number"
            className="form-input"
            placeholder="Any"
            value={filters.max_budget}
            onChange={(e) => onFilterChange('max_budget', e.target.value)}
          />
        </div>

        {/* Sort */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Sort By</label>
          <select
            className="form-input"
            value={filters.ordering}
            onChange={(e) => onFilterChange('ordering', e.target.value)}
          >
            <option value="-created_at">Newest First</option>
            <option value="created_at">Oldest First</option>
            <option value="-budget">Highest Budget</option>
            <option value="budget">Lowest Budget</option>
            <option value="deadline">Deadline (Soonest)</option>
          </select>
        </div>

        {/* Reset */}
        <div style={{ marginBottom: 0 }}>
          <Button variant="secondary" onClick={onReset} style={{ width: '100%' }}>
            Reset Filters
          </Button>
        </div>
      </div>
    </Card>
  );
}

// ─── Project Detail Modal ─────────────────────────────────────────────────────
function ProjectDetailModal({ projectId, onClose, onBid, userRole }) {
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    projectsAPI.get(projectId)
      .then(setProject)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) return (
    <Modal isOpen onClose={onClose} title="Loading Project...">
      <Loader message="Fetching project details..." />
    </Modal>
  );

  if (!project) return (
    <Modal isOpen onClose={onClose} title="Error">
      <p>Project not found.</p>
    </Modal>
  );

  const daysLeft = project.deadline
    ? Math.max(0, Math.ceil((new Date(project.deadline) - new Date()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <Modal isOpen onClose={onClose} title={project.title} maxWidth="760px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
        {/* Meta */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-md)', padding: 'var(--space-md)', background: 'var(--bg-canvas)', borderRadius: 'var(--radius-md)' }}>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Budget</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-400)' }}>${project.budget}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Experience</div>
            <div style={{ fontWeight: 600 }}>{project.experience_level}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Deadline</div>
            <div style={{ fontWeight: 600, color: daysLeft <= 7 ? 'var(--danger)' : 'inherit' }}>
              {project.deadline} ({daysLeft}d left)
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Proposals</div>
            <div style={{ fontWeight: 600 }}>{project.bids_count || 0}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Category</div>
            <div style={{ fontWeight: 600 }}>{project.category_data?.name || '—'}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Posted</div>
            <div style={{ fontWeight: 600 }}>{new Date(project.created_at).toLocaleDateString()}</div>
          </div>
        </div>

        {/* Description */}
        <div>
          <h4 style={{ marginBottom: 'var(--space-sm)', color: 'var(--primary-400)' }}>Project Description</h4>
          <p style={{ lineHeight: 1.8, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
            {project.description}
          </p>
        </div>

        {/* Required Skills */}
        {project.skills_data?.length > 0 && (
          <div>
            <h4 style={{ marginBottom: 'var(--space-sm)', color: 'var(--primary-400)' }}>Required Skills & Technologies</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {project.skills_data.map((skill) => (
                <Badge key={skill.id} variant="primary">{skill.name}</Badge>
              ))}
            </div>
          </div>
        )}

        {/* Client Info */}
        <div style={{ padding: 'var(--space-md)', background: 'var(--bg-canvas)', borderRadius: 'var(--radius-md)' }}>
          <h4 style={{ marginBottom: 'var(--space-xs)', fontSize: '0.95rem' }}>About the Client</h4>
          <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
            <strong>{project.customer_data?.company_name || 'Anonymous Client'}</strong>
            {project.customer_data?.location && ` • ${project.customer_data.location}`}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onClose}>Close</Button>
          {userRole === 'FREELANCER' && project.status === 'OPEN' && (
            <Button variant="primary" onClick={() => { onClose(); onBid(project); }}>
              Submit Proposal
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}

// ─── Main Marketplace Page ────────────────────────────────────────────────────
const DEFAULT_FILTERS = {
  search: '',
  category: '',
  experience_level: '',
  min_budget: '',
  max_budget: '',
  ordering: '-created_at',
};

export default function MarketplacePage() {
  const { user } = useAuth();
  const { navigate } = useRouter();

  const [projects, setProjects] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [pagination, setPagination] = useState({ count: 0, next: null, previous: null, page: 1 });

  const [selectedProject, setSelectedProject] = useState(null); // For bid modal
  const [detailProjectId, setDetailProjectId] = useState(null); // For detail modal

  const debounceRef = useRef(null);

  const fetchProjects = useCallback(async (currentFilters, page = 1) => {
    setLoading(true);
    setError('');
    try {
      const params = { ...currentFilters, page };
      Object.keys(params).forEach((k) => { if (!params[k]) delete params[k]; });

      const data = await projectsAPI.list(params);
      const results = data.results || data;
      setProjects(Array.isArray(results) ? results : []);
      setPagination({
        count: data.count || results.length,
        next: data.next,
        previous: data.previous,
        page,
      });
    } catch (err) {
      setError(err.message || 'Failed to load projects.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch categories once
  useEffect(() => {
    profilesAPI.getCategories().then((data) => {
      setCategories(Array.isArray(data) ? data : data.results || []);
    }).catch(() => {});
  }, []);

  // Fetch projects with debounce on filter change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchProjects(filters);
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [filters, fetchProjects]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleResetFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  const handleBidSuccess = () => {
    setSelectedProject(null);
    setSuccessMessage('Proposal submitted successfully! You can track it in your dashboard.');
    fetchProjects(filters);
  };

  const totalPages = Math.ceil(pagination.count / 12);

  return (
    <div style={{ padding: 'var(--space-2xl) 0' }}>
      <div className="content-wrapper">
        {/* Header */}
        <div style={{ marginBottom: 'var(--space-2xl)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
            <div>
              <Badge variant="primary" style={{ marginBottom: 'var(--space-xs)' }}>LIVE MARKETPLACE</Badge>
              <h2 style={{ marginBottom: 4 }}>Project Marketplace</h2>
              <p style={{ color: 'var(--text-secondary)' }}>
                Browse {pagination.count} verified client projects. Filter by budget, category, and required technologies.
              </p>
            </div>
            {user?.role === 'CUSTOMER' && (
              <Button variant="accent" onClick={() => navigate('/post-project')}>
                + Post New Project
              </Button>
            )}
            {!user && (
              <Button variant="primary" onClick={() => navigate('/auth?tab=register')}>
                Join to Bid
              </Button>
            )}
          </div>
        </div>

        {/* Alerts */}
        {error && <Alert type="error" onClose={() => setError('')} style={{ marginBottom: 'var(--space-lg)' }}>{error}</Alert>}
        {successMessage && <Alert type="success" onClose={() => setSuccessMessage('')} style={{ marginBottom: 'var(--space-lg)' }}>{successMessage}</Alert>}

        {/* Freelancer verification banner */}
        {user?.role === 'FREELANCER' && !user?.is_verified && (
          <Card style={{ borderLeft: '4px solid var(--warning)', marginBottom: 'var(--space-xl)', background: 'rgba(245, 158, 11, 0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
              <div>
                <h4 style={{ color: '#fbbf24', marginBottom: 4 }}>AI Verification Required to Bid</h4>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                  Complete your AI skill assessment to unlock proposal submission and earn the verified badge.
                </p>
              </div>
              <Button variant="primary" size="sm" onClick={() => navigate('/assessment')}>
                Take Assessment Now
              </Button>
            </div>
          </Card>
        )}

        {/* Filters */}
        <MarketplaceFilters
          filters={filters}
          categories={categories}
          onFilterChange={handleFilterChange}
          onReset={handleResetFilters}
        />

        {/* Results count */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {loading ? 'Searching...' : `${pagination.count} project${pagination.count !== 1 ? 's' : ''} found`}
          </p>
          {totalPages > 1 && (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Page {pagination.page} of {totalPages}
            </p>
          )}
        </div>

        {/* Project Grid */}
        {loading ? (
          <Loader message="Loading marketplace projects..." />
        ) : projects.length === 0 ? (
          <Card style={{ textAlign: 'center', padding: 'var(--space-3xl) var(--space-xl)' }}>
            <div style={{ fontSize: '3rem', marginBottom: 'var(--space-md)' }}>🔍</div>
            <h3 style={{ marginBottom: 'var(--space-sm)' }}>No Projects Found</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-lg)' }}>
              No projects match your current filters. Try adjusting your search criteria.
            </p>
            <Button variant="outline" onClick={handleResetFilters}>Clear All Filters</Button>
          </Card>
        ) : (
          <div className="grid grid-cols-2" style={{ gap: 'var(--space-lg)', marginBottom: 'var(--space-xl)' }}>
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                userRole={user?.role}
                onBid={setSelectedProject}
                onViewDetail={setDetailProjectId}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-sm)', marginTop: 'var(--space-xl)' }}>
            <Button
              variant="outline"
              disabled={!pagination.previous}
              onClick={() => fetchProjects(filters, pagination.page - 1)}
            >
              ← Previous
            </Button>
            <span style={{ display: 'flex', alignItems: 'center', padding: '0 var(--space-md)', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              {pagination.page} / {totalPages}
            </span>
            <Button
              variant="outline"
              disabled={!pagination.next}
              onClick={() => fetchProjects(filters, pagination.page + 1)}
            >
              Next →
            </Button>
          </div>
        )}
      </div>

      {/* Bid Submission Modal */}
      {selectedProject && (
        <BidModal
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
          onSuccess={handleBidSuccess}
        />
      )}

      {/* Project Detail Modal */}
      {detailProjectId && (
        <ProjectDetailModal
          projectId={detailProjectId}
          onClose={() => setDetailProjectId(null)}
          onBid={setSelectedProject}
          userRole={user?.role}
        />
      )}
    </div>
  );
}
