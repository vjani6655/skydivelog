'use client';

import React from 'react';

interface ToggleProps {
  on:       boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

export default function Toggle({ on, onChange, disabled = false }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={[
        'relative inline-flex h-[26px] w-11 shrink-0 items-center rounded-[14px]',
        'transition-colors duration-fast',
        'focus:outline-none focus:ring-[1.5px] focus:ring-sky focus:ring-offset-1 focus:ring-offset-bg',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        on ? 'bg-sky' : 'bg-surface-3',
      ].join(' ')}
    >
      <span
        className={[
          'inline-block h-[22px] w-[22px] rounded-full bg-white shadow',
          'transition-transform duration-fast',
          on ? 'translate-x-[18px]' : 'translate-x-[2px]',
        ].join(' ')}
      />
    </button>
  );
}
