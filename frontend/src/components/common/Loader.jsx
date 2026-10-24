import React from 'react';

export default function Loader({ message = 'Loading...', fullScreen = false }) {
  if (fullScreen) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'var(--bg-canvas)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          gap: 'var(--space-md)',
        }}
      >
        <div className="spinner" style={{ width: 44, height: 44, borderWidth: 3 }} />
        <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{message}</p>
      </div>
    );
  }

  return (
    <div className="loader-overlay">
      <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
      <p style={{ color: 'var(--text-secondary)' }}>{message}</p>
    </div>
  );
}
