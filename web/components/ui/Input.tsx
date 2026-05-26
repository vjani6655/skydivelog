'use client';

import React, { useState } from 'react';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'className'> {
  label?:     string;
  icon?:      React.ReactNode;
  helper?:    string;
  inputState?: 'default' | 'error' | 'disabled';
}

export default function Input({
  label,
  icon,
  helper,
  inputState = 'default',
  ...props
}: InputProps) {
  const [focused, setFocused] = useState(false);

  const borderColor =
    inputState === 'error' ? 'border-danger'
    : focused              ? 'border-sky'
    : 'border-border';

  const helperColor = inputState === 'error' ? 'text-danger' : 'text-fg-3';

  return (
    <div className={inputState === 'disabled' ? 'opacity-50' : ''}>
      {label && (
        <label className="block font-mono text-overline uppercase tracking-wider text-fg-2 mb-1.5">
          {label}
        </label>
      )}
      <div
        className={[
          'relative flex items-center',
          'h-[52px] bg-surface rounded-md border',
          borderColor,
        ].join(' ')}
      >
        {icon && (
          <span className="absolute left-3.5 text-fg-3 pointer-events-none">
            {icon}
          </span>
        )}
        <input
          {...props}
          disabled={inputState === 'disabled' || props.disabled}
          onFocus={(e) => { setFocused(true);  props.onFocus?.(e); }}
          onBlur={(e)  => { setFocused(false); props.onBlur?.(e);  }}
          className={[
            'flex-1 h-full bg-transparent text-fg text-base font-sans',
            'placeholder:text-fg-3 outline-none',
            icon ? 'pl-10 pr-3.5' : 'px-3.5',
          ].join(' ')}
        />
      </div>
      {helper && (
        <p className={`mt-1 text-xs font-sans ${helperColor}`}>{helper}</p>
      )}
    </div>
  );
}
