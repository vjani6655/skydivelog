'use client';

import React from 'react';

export type ButtonVariant = 'primary' | 'ghost' | 'sub' | 'danger';
export type ButtonSize    = 'sm' | 'md' | 'lg';

interface ButtonProps {
  variant?:      ButtonVariant;
  size?:         ButtonSize;
  icon?:         React.ReactNode;
  iconPosition?: 'leading' | 'trailing';
  fullWidth?:    boolean;
  disabled?:     boolean;
  loading?:      boolean;
  onClick?:      () => void;
  type?:         'button' | 'submit' | 'reset';
  children:      React.ReactNode;
  className?:    string;
}

const variantClass: Record<ButtonVariant, string> = {
  primary: 'bg-sky text-on-sky hover:opacity-90 focus:ring-sky',
  ghost:   'bg-transparent border border-border-strong text-fg hover:bg-surface-2 focus:ring-sky',
  sub:     'bg-surface border border-border text-fg hover:bg-surface-2 focus:ring-sky',
  danger:  'bg-danger text-on-sky hover:opacity-90 focus:ring-danger',
};

const sizeClass: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm font-medium rounded-sm',
  md: 'h-[38px] px-4 text-base font-semibold rounded-md',
  lg: 'h-[52px] px-5 text-md font-semibold rounded-md',
};

function Spinner() {
  return (
    <svg
      className="animate-spin h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export default function Button({
  variant      = 'primary',
  size         = 'md',
  icon,
  iconPosition = 'leading',
  fullWidth    = false,
  disabled     = false,
  loading      = false,
  onClick,
  type         = 'button',
  children,
  className    = '',
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={[
        'inline-flex items-center justify-center gap-2',
        'transition-opacity duration-fast',
        'focus:outline-none focus:ring-[1.5px] focus:ring-offset-0',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'font-sans',
        variantClass[variant],
        sizeClass[size],
        fullWidth ? 'w-full' : '',
        className,
      ].join(' ')}
    >
      {loading ? (
        <Spinner />
      ) : (
        <>
          {icon && iconPosition === 'leading'  && icon}
          {children}
          {icon && iconPosition === 'trailing' && icon}
        </>
      )}
    </button>
  );
}
