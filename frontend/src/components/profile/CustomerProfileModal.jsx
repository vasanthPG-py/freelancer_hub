import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Button from '../common/Button';
import Alert from '../common/Alert';
import { profilesAPI } from '../../services/api';

export default function CustomerProfileModal({ isOpen, onClose, profile, onSaved }) {
  const [companyName, setCompanyName] = useState('');
  const [companyBio, setCompanyBio] = useState('');
  const [website, setWebsite] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (profile) {
      setCompanyName(profile.company_name || '');
      setCompanyBio(profile.company_bio || '');
      setWebsite(profile.website || '');
      setLocation(profile.location || '');
      setError('');
    }
  }, [profile, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = {
        company_name: companyName.trim(),
        company_bio: companyBio.trim(),
        website: website.trim(),
        location: location.trim(),
      };

      const updated = await profilesAPI.updateCustomerProfile(payload);
      onSaved(updated);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update company profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Company & Client Profile" maxWidth={560}>
      {error && <Alert type="error">{error}</Alert>}

      <form onSubmit={handleSubmit}>
        <Input
          label="Company / Client Name"
          required
          placeholder="e.g. Apex Innovations Inc."
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
        />

        <Input
          label="Website"
          type="url"
          placeholder="https://company.example.com"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />

        <Input
          label="Headquarters Location"
          placeholder="e.g. Austin, TX or London, UK"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />

        <div className="form-group">
          <label className="form-label">
            <span>Company Overview & Mission</span>
          </label>
          <textarea
            className="form-textarea"
            rows="3"
            placeholder="Tell freelancers about your company culture, technology standards, and projects..."
            value={companyBio}
            onChange={(e) => setCompanyBio(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="accent" type="submit" loading={loading}>
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}
