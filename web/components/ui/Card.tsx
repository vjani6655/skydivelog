import React from 'react';

export type CardVariant = 'default' | 'elevated' | 'promo' | 'success' | 'warning' | 'danger';

interface CardProps {
  variant?:     CardVariant;
  padding?:     number | 'none';
  interactive?: boolean;
  onClick?:     () => void;
  children:     React.ReactNode;
  className?:   string;
}

const variantClass: Record<CardVariant, string> = {
  default:  'bg-surface border border-border',
  elevated: 'bg-surface border border-border shadow-card',
  promo:    'bg-card-promo border border-sky shadow-glow',
  success:  'bg-ok-bg border border-ok',
  warning:  'bg-warn-bg border border-warn',
  danger:   'bg-danger-bg border border-danger',
};

export default function Card({
  variant     = 'default',
  padding     = 16,
  interactive = false,
  onClick,
  children,
  className   = '',
}: CardProps) {
  const paddingStyle =
    padding === 'none' ? '' : `p-[${padding}px]`;

  // Use a fixed padding map to keep Tailwind purging happy
  const paddingClass =
    padding === 'none'  ? ''
    : padding === 16    ? 'p-4'
    : padding === 20    ? 'p-5'
    : padding === 24    ? 'p-6'
    : padding === 28    ? 'p-7'
    : `p-[${padding}px]`;

  const base = [
    'rounded-md',
    variantClass[variant],
    paddingClass,
    interactive || onClick ? 'cursor-pointer transition-opacity hover:opacity-90' : '',
    className,
  ].join(' ');

  if (interactive || onClick) {
    return (
      <button type="button" onClick={onClick} className={base}>
        {children}
      </button>
    );
  }

  return <div className={base}>{children}</div>;
}
