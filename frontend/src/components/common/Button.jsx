import React from 'react';

export default function Button({
  children,
  type = 'button',
  variant = 'primary', // 'primary' | 'secondary' | 'outline' | 'accent' | 'danger'
  size = 'md',        // 'sm' | 'md' | 'lg'
  block = false,
  loading = false,
  disabled = false,
  className = '',
  onClick,
  ...props
}) {
  const sizeClass = size === 'sm' ? 'btn-sm' : size === 'lg' ? 'btn-lg' : '';
  const blockClass = block ? 'btn-block' : '';
  const variantClass = `btn-${variant}`;
  const classes = `btn ${variantClass} ${sizeClass} ${blockClass} ${className}`.trim();

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading ? (
        <>
          <span className="spinner" style={{ width: 18, height: 18 }} />
          <span>Processing...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
