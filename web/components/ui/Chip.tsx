'use client';

import React from 'react';

interface ChipProps {
  active?:    boolean;
  leading?:   React.ReactNode;
  trailing?:  React.ReactNode;
  onClick?:   () => void;
  children:   React.ReactNode;
  className?: string;
}

export default function Chip({
  active    = false,
  leading,
  trailing,
  onClick,
  children,
  className = '',
}: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'inline-flex items-center gap-1.5 h-[30px] px-3',
        'rounded-pill border text-sm font-sans font-medium',
        'transition-colors duration-fast focus:outline-none focus:ring-[1.5px] focus:ring-sky',
        active
          ? 'bg-sky-bg border-sky text-sky'
          : 'bg-surface border-border text-fg-2 hover:bg-surface-2',
        className,
      ].join(' ')}
    >
      {leading}
      {children}
      {trailing}
    </button>
  );
}
