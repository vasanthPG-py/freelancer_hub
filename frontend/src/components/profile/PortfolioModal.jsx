import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Button from '../common/Button';
import Alert from '../common/Alert';
import { profilesAPI } from '../../services/api';

export default function PortfolioModal({ isOpen, onClose, onCreated }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectUrl, setProjectUrl] = useState('');
  const [selectedSkillIds, setSelectedSkillIds] = useState([]);
  const [availableSkills, setAvailableSkills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setDescription('');
      setProjectUrl('');
      setSelectedSkillIds([]);
      setError('');
      profilesAPI.getSkills().then((res) => {
        setAvailableSkills(res.results || res || []);
      }).catch(() => {});
    }
  }, [isOpen]);

  const toggleSkill = (id) => {
    setSelectedSkillIds((prev) =>
      prev.includes(id) ? prev.filter((sId) => sId !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError('Please provide a project title and description.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        project_url: projectUrl.trim(),
        skill_ids: selectedSkillIds,
      };

      const newItem = await profilesAPI.createPortfolio(payload);
      onCreated(newItem);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to add portfolio item.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Showcase Project" maxWidth={580}>
      {error && <Alert type="error">{error}</Alert>}

      <form onSubmit={handleSubmit}>
        <Input
          label="Project Title"
          required
          placeholder="e.g. Real-Time Distributed Telemetry Engine"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <Input
          label="Live Demo or GitHub URL (Optional)"
          type="url"
          placeholder="https://github.com/your-username/project"
          value={projectUrl}
          onChange={(e) => setProjectUrl(e.target.value)}
        />

        <div className="form-group">
          <label className="form-label">
            <span>Project Architecture & Accomplishments</span>
          </label>
          <textarea
            className="form-textarea"
            rows="3"
            required
            placeholder="Explain the problem solved, tech stack, scalability, and measurable results..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label" style={{ marginBottom: 'var(--space-xs)' }}>
            <span>Associated Technologies (Click to attach)</span>
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '120px', overflowY: 'auto', padding: '6px', background: 'var(--bg-canvas)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            {availableSkills.map((skill) => {
              const isSelected = selectedSkillIds.includes(skill.id);
              return (
                <button
                  key={skill.id}
                  type="button"
                  onClick={() => toggleSkill(skill.id)}
                  style={{
                    background: isSelected ? 'var(--primary-gradient)' : 'var(--bg-surface-elevated)',
                    color: isSelected ? '#fff' : 'var(--text-secondary)',
                    border: isSelected ? '1px solid var(--primary-400)' : '1px solid var(--border-medium)',
                    borderRadius: 'var(--radius-full)',
                    padding: '3px 10px',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                  }}
                >
                  {isSelected ? `✓ ${skill.name}` : `+ ${skill.name}`}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" loading={loading}>
            Publish Project
          </Button>
        </div>
      </form>
    </Modal>
  );
}
