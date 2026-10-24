import React from 'react';

export default function Input({
  label,
  id,
  type = 'text',
  error,
  hint,
  required = false,
  className = '',
  ...props
}) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className={`form-group ${className}`.trim()}>
      {label && (
        <label htmlFor={inputId} className="form-label">
          <span>{label} {required && <span style={{ color: 'var(--danger)' }}>*</span>}</span>
        </label>
      )}
      <input
        id={inputId}
        type={type}
        className="form-input"
        required={required}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : undefined}
        {...props}
      />
      {hint && !error && <span className="form-hint">{hint}</span>}
      {error && (
        <span id={`${inputId}-error`} className="form-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
