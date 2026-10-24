/**
 * ReviewModal — Star-rating review submission form for completed contracts.
 * Supports overall, communication, quality, and timeliness dimensions.
 * Wired to POST /api/reviews/ endpoint.
 */
import React, { useState } from 'react';
import { reviewsAPI } from '../../services/api';

// ── Star Rating Widget ────────────────────────────────────────────────────────
function StarRating({ label, name, value, onChange, required = false }) {
  const [hovered, setHovered] = useState(0);

  return (
    <div style={{ marginBottom: 'var(--space-lg)' }}>
      <label style={{
        display: 'block',
        fontSize: '0.83rem',
        fontWeight: 600,
        color: 'var(--color-text-secondary)',
        marginBottom: 'var(--space-xs)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}>
        {label}{required && <span style={{ color: 'var(--color-danger)' }}> *</span>}
      </label>
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            aria-label={`${star} star`}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1.6rem',
              padding: '2px',
              color: star <= (hovered || value) ? '#f59e0b' : 'rgba(255,255,255,0.15)',
              transition: 'color 0.12s ease, transform 0.1s ease',
              transform: star <= (hovered || value) ? 'scale(1.15)' : 'scale(1)',
              lineHeight: 1,
            }}
          >
            ★
          </button>
        ))}
        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginLeft: '4px' }}>
          {value ? ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent!'][value] : 'Not rated'}
        </span>
      </div>
    </div>
  );
}

// ── Main Modal ────────────────────────────────────────────────────────────────
export default function ReviewModal({ contract, onClose, onSuccess }) {
  const [overall, setOverall] = useState(0);
  const [communication, setCommunication] = useState(5);
  const [quality, setQuality] = useState(0);
  const [timeliness, setTimeliness] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = overall >= 1 && comment.trim().length >= 10 && !submitting;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError('');
    try {
      await reviewsAPI.createReview({
        contract: contract.id,
        overall_rating: overall,
        communication_rating: communication,
        quality_rating: quality || undefined,
        timeliness_rating: timeliness || undefined,
        comment: comment.trim(),
      });
      onSuccess?.('Review submitted successfully! It will be visible on their profile.');
      onClose();
    } catch (err) {
      const msg = err.message || '';
      if (msg.includes('409') || msg.toLowerCase().includes('already')) {
        setError('You have already submitted a review for this contract.');
      } else {
        setError(err.message || 'Failed to submit review. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.6)',
          zIndex: 3000,
          backdropFilter: 'blur(4px)',
        }}
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Submit review"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 3001,
          width: '520px',
          maxWidth: '95vw',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: 'var(--color-surface-elevated)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-xl)',
          animation: 'fadeSlideDown 0.2s ease',
        }}
      >
        {/* Header */}
        <div style={{
          padding: 'var(--space-xl) var(--space-xl) var(--space-md)',
          borderBottom: '1px solid var(--color-border)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
                ⭐ Write a Review
              </h3>
              {contract?.project_title && (
                <p style={{ margin: 'var(--space-xs) 0 0', fontSize: '0.83rem', color: 'var(--color-text-muted)' }}>
                  Project: <strong style={{ color: 'var(--color-text-secondary)' }}>{contract.project_title}</strong>
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              aria-label="Close review modal"
              style={{
                background: 'transparent', border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)', padding: '4px 10px',
                color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '1rem',
              }}
            >✕</button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: 'var(--space-xl)' }}>
          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 'var(--radius-md)', padding: 'var(--space-sm) var(--space-md)',
              color: 'var(--color-danger)', fontSize: '0.83rem', marginBottom: 'var(--space-lg)',
            }}>
              {error}
            </div>
          )}

          <StarRating label="Overall Rating" name="overall" value={overall} onChange={setOverall} required />
          <StarRating label="Communication" name="communication" value={communication} onChange={setCommunication} required />
          <StarRating label="Quality of Work" name="quality" value={quality} onChange={setQuality} />
          <StarRating label="Timeliness" name="timeliness" value={timeliness} onChange={setTimeliness} />

          <div style={{ marginBottom: 'var(--space-xl)' }}>
            <label htmlFor="review-comment" style={{
              display: 'block',
              fontSize: '0.83rem',
              fontWeight: 600,
              color: 'var(--color-text-secondary)',
              marginBottom: 'var(--space-xs)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              Your Review <span style={{ color: 'var(--color-danger)' }}>*</span>
            </label>
            <textarea
              id="review-comment"
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Share your honest experience working with this person. Be constructive and specific about what went well or what could be improved…"
              rows={5}
              maxLength={2000}
              style={{
                width: '100%',
                background: 'var(--color-surface)',
                border: `1px solid ${comment.length < 10 && comment.length > 0 ? 'var(--color-danger)' : 'var(--color-border)'}`,
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-md)',
                color: 'var(--color-text-primary)',
                fontSize: '0.88rem',
                resize: 'vertical',
                lineHeight: 1.6,
                boxSizing: 'border-box',
              }}
            />
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              marginTop: '4px', fontSize: '0.72rem', color: 'var(--color-text-muted)',
            }}>
              <span>{comment.trim().length < 10 && comment.length > 0 ? 'At least 10 characters required' : ''}</span>
              <span>{comment.length}/2000</span>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-sm) var(--space-xl)',
                color: 'var(--color-text-secondary)',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.9rem',
              }}
            >Cancel</button>
            <button
              type="submit"
              disabled={!canSubmit}
              style={{
                background: canSubmit
                  ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                  : 'rgba(255,255,255,0.1)',
                color: canSubmit ? '#fff' : 'var(--color-text-muted)',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-sm) var(--space-xl)',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: canSubmit ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-xs)',
              }}
            >
              {submitting ? (
                <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span> Submitting…</>
              ) : '⭐ Submit Review'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
