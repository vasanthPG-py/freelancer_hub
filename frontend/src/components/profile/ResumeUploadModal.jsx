import React, { useState } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Alert from '../common/Alert';
import { profilesAPI } from '../../services/api';

const MAX_RESUME_SIZE = 5 * 1024 * 1024; // 5MB

export default function ResumeUploadModal({ isOpen, onClose, currentResume, currentText, onUploaded }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    setError('');
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > MAX_RESUME_SIZE) {
      setError('File size exceeds the 5MB limit. Please select a smaller document.');
      setSelectedFile(null);
      return;
    }

    const ext = file.name.split('.').pop().toLowerCase();
    if (!['pdf', 'docx', 'txt'].includes(ext)) {
      setError(`Invalid file type .${ext}. Allowed formats: .pdf, .docx, .txt`);
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Please select a file to upload.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await profilesAPI.uploadResume(selectedFile);
      setSuccess('Resume document uploaded and verified successfully!');
      onUploaded(res.resume, res.resume_text);
      setTimeout(() => {
        onClose();
        setSuccess('');
        setSelectedFile(null);
      }, 1500);
    } catch (err) {
      setError(err.data?.error || err.message || 'Failed to upload resume.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Upload Engineering Resume" maxWidth={560}>
      {error && <Alert type="error">{error}</Alert>}
      {success && <Alert type="success">{success}</Alert>}

      {currentResume && (
        <div style={{ background: 'var(--bg-surface-elevated)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-lg)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Current Uploaded File:</span>
              <div style={{ fontWeight: 600, color: 'var(--accent-400)' }}>📄 {currentResume.original_name}</div>
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {(currentResume.file_size / 1024).toFixed(1)} KB
            </span>
          </div>
        </div>
      )}

      <form onSubmit={handleUpload}>
        <div
          style={{
            border: '2px dashed var(--border-medium)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-2xl) var(--space-md)',
            textAlign: 'center',
            marginBottom: 'var(--space-lg)',
            background: 'rgba(255, 255, 255, 0.02)',
            cursor: 'pointer',
          }}
          onClick={() => document.getElementById('resume-file-input').click()}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-sm)' }}>📄</div>
          <div style={{ fontWeight: 600, color: '#fff', marginBottom: 4 }}>
            {selectedFile ? selectedFile.name : 'Click to select or drop resume document'}
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Accepted: PDF, DOCX, TXT (Maximum size: 5MB)
          </p>
          <input
            id="resume-file-input"
            type="file"
            accept=".pdf,.docx,.txt"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>

        {currentText && (
          <div className="form-group" style={{ marginBottom: 'var(--space-lg)' }}>
            <label className="form-label">
              <span>Resume Text Context for AI Assessment</span>
            </label>
            <div style={{ maxHeight: 110, overflowY: 'auto', background: 'var(--bg-canvas)', padding: 'var(--space-sm)', borderRadius: 'var(--radius-md)', fontSize: '0.82rem', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
              {currentText}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)' }}>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" loading={loading} disabled={!selectedFile}>
            Upload Document
          </Button>
        </div>
      </form>
    </Modal>
  );
}
