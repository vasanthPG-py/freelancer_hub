import React from 'react';

export default function Card({
  children,
  hoverable = false,
  className = '',
  ...props
}) {
  const classes = `card ${hoverable ? 'card-hover' : ''} ${className}`.trim();
  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
}
