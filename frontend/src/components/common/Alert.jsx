import React from 'react';

export default function Alert({
  children,
  type = 'info', // 'success' | 'error' | 'warning' | 'info'
  onClose,
  className = '',
}) {
  return (
    <div className={`alert alert-${type} ${className}`.trim()} role="alert">
      <div style={{ flex: 1 }}>{children}</div>
      {onClose && (
        <button
          onClick={onClose}
          type="button"
          aria-label="Close alert"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'inherit',
            cursor: 'pointer',
            fontSize: '1.1rem',
            lineHeight: 1,
            padding: '2px 6px',
          }}
        >
          &times;
        </button>
      )}
    </div>
  );
}
