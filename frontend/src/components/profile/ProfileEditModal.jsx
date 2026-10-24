import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Button from '../common/Button';
import Alert from '../common/Alert';
import Badge from '../common/Badge';
import { profilesAPI } from '../../services/api';

export default function ProfileEditModal({ isOpen, onClose, profile, onSaved }) {
  const [title, setTitle] = useState('');
  const [bio, setBio] = useState('');
  const [hourlyRate, setHourlyRate] = useState('50.00');
  const [experienceLevel, setExperienceLevel] = useState('INTERMEDIATE');
  const [location, setLocation] = useState('');
  const [selectedSkillIds, setSelectedSkillIds] = useState([]);
  const [allSkills, setAllSkills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (profile) {
      setTitle(profile.title || '');
      setBio(profile.bio || '');
      setHourlyRate(profile.hourly_rate || '50.00');
      setExperienceLevel(profile.experience_level || 'INTERMEDIATE');
      setLocation(profile.location || '');
      const currentIds = (profile.skills_data || []).map((s) => s.id);
      setSelectedSkillIds(currentIds);
    }
  }, [profile, isOpen]);

  useEffect(() => {
    if (isOpen) {
      profilesAPI.getSkills().then((res) => {
        setAllSkills(res.results || res || []);
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
    setError('');
    setLoading(true);

    if (!title.trim()) {
      setError('Professional title is required.');
      setLoading(false);
      return;
    }

    try {
      const payload = {
        title: title.trim(),
        bio: bio.trim(),
        hourly_rate: hourlyRate,
        experience_level: experienceLevel,
        location: location.trim(),
        skill_ids: selectedSkillIds,
      };

      const updated = await profilesAPI.updateFreelancerProfile(payload);
      onSaved(updated);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Freelancer Profile" maxWidth={620}>
      {error && <Alert type="error">{error}</Alert>}

      <form onSubmit={handleSubmit}>
        <Input
          label="Professional Title"
          required
          placeholder="e.g. Senior Full-Stack Architect & Python Specialist"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
          <Input
            label="Hourly Rate ($ USD)"
            type="number"
            step="0.50"
            required
            value={hourlyRate}
            onChange={(e) => setHourlyRate(e.target.value)}
          />

          <div className="form-group">
            <label className="form-label">
              <span>Experience Tier</span>
            </label>
            <select
              className="form-select"
              value={experienceLevel}
              onChange={(e) => setExperienceLevel(e.target.value)}
            >
              <option value="ENTRY">Entry Level (0-2 years)</option>
              <option value="INTERMEDIATE">Intermediate (3-5 years)</option>
              <option value="EXPERT">Expert (6+ years)</option>
            </select>
          </div>
        </div>

        <Input
          label="Location"
          placeholder="e.g. Austin, TX or Remote"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />

        <div className="form-group">
          <label className="form-label">
            <span>Professional Summary & Biography</span>
          </label>
          <textarea
            className="form-textarea"
            rows="4"
            placeholder="Highlight your engineering stack, high-impact past projects, and specialties..."
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label" style={{ marginBottom: 'var(--space-xs)' }}>
            <span>Core Technical Skills (Click to toggle)</span>
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '160px', overflowY: 'auto', padding: '6px', background: 'var(--bg-canvas)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            {allSkills.map((skill) => {
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
                    padding: '4px 12px',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
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
            Save Profile
          </Button>
        </div>
      </form>
    </Modal>
  );
}
