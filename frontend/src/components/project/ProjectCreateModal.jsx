import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Button from '../common/Button';
import Alert from '../common/Alert';
import Badge from '../common/Badge';
import { projectsAPI, profilesAPI } from '../../services/api';

export default function ProjectCreateModal({ isOpen, onClose, onCreated }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [budget, setBudget] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('INTERMEDIATE');
  const [deadline, setDeadline] = useState('');
  const [selectedSkillIds, setSelectedSkillIds] = useState([]);

  const [categories, setCategories] = useState([]);
  const [allSkills, setAllSkills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      profilesAPI.getCategories().then((data) => {
        const catList = Array.isArray(data) ? data : data.results || [];
        setCategories(catList);
        if (catList.length > 0 && !categoryId) {
          setCategoryId(catList[0].id);
        }
      }).catch(() => {});

      profilesAPI.getSkills().then((data) => {
        setAllSkills(Array.isArray(data) ? data : data.results || []);
      }).catch(() => {});

      // Default deadline to 30 days from now
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 30);
      setDeadline(defaultDate.toISOString().split('T')[0]);
    }
  }, [isOpen]);

  const toggleSkill = (id) => {
    setSelectedSkillIds((prev) =>
      prev.includes(id) ? prev.filter((sId) => sId !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!title.trim() || !description.trim() || !budget || !deadline) {
      setError('Please fill in all required fields.');
      setLoading(false);
      return;
    }

    if (parseFloat(budget) <= 0) {
      setError('Budget must be greater than zero.');
      setLoading(false);
      return;
    }

    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        category: categoryId ? parseInt(categoryId) : null,
        budget: parseFloat(budget).toFixed(2),
        experience_level: experienceLevel,
        deadline,
        skill_ids: selectedSkillIds,
      };

      const newProject = await projectsAPI.create(payload);
      onCreated(newProject);
      onClose();
      // Reset form
      setTitle('');
      setDescription('');
      setBudget('');
      setSelectedSkillIds([]);
    } catch (err) {
      const errData = err.data || {};
      const msg = Object.values(errData).flat().join(' ') || err.message || 'Failed to create project.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const minDate = new Date().toISOString().split('T')[0];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Post a New Project Listing" maxWidth={680}>
      {error && <Alert type="error">{error}</Alert>}

      <form onSubmit={handleSubmit}>
        <Input
          label="Project Title"
          required
          placeholder="e.g. Build High-Throughput REST API with Django & PostgreSQL"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <div className="form-group">
          <label className="form-label">Project Description *</label>
          <textarea
            className="form-input"
            rows={5}
            required
            placeholder="Detailed description of technical deliverables, architecture, requirements, and constraints..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ resize: 'vertical' }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
          <div className="form-group">
            <label className="form-label">Category *</label>
            <select
              className="form-input"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Experience Level *</label>
            <select
              className="form-input"
              value={experienceLevel}
              onChange={(e) => setExperienceLevel(e.target.value)}
            >
              <option value="ENTRY">Entry Level (0-2 yrs)</option>
              <option value="INTERMEDIATE">Intermediate (3-5 yrs)</option>
              <option value="EXPERT">Expert (6+ yrs)</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
          <Input
            label="Total Project Budget ($ USD)"
            type="number"
            step="10.00"
            min="1"
            required
            placeholder="e.g. 5000.00"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
          />

          <Input
            label="Project Deadline"
            type="date"
            min={minDate}
            required
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Required Technologies & Skills</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: 130, overflowY: 'auto', padding: 'var(--space-xs)' }}>
            {allSkills.map((sk) => {
              const active = selectedSkillIds.includes(sk.id);
              return (
                <button
                  type="button"
                  key={sk.id}
                  onClick={() => toggleSkill(sk.id)}
                  style={{
                    background: active ? 'var(--primary-600)' : 'var(--bg-surface-elevated)',
                    color: active ? '#fff' : 'var(--text-secondary)',
                    border: `1px solid ${active ? 'var(--primary-400)' : 'var(--border-subtle)'}`,
                    borderRadius: 'var(--radius-full)',
                    padding: '4px 12px',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                  }}
                >
                  {active ? `✓ ${sk.name}` : `+ ${sk.name}`}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'flex-end', marginTop: 'var(--space-lg)' }}>
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'Publishing Project...' : 'Publish to Marketplace'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
