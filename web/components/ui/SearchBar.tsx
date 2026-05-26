'use client';

import React, { useState } from 'react';

interface SearchBarProps {
  value:          string;
  onValueChange:  (value: string) => void;
  placeholder?:   string;
  className?:     string;
}

export default function SearchBar({
  value,
  onValueChange,
  placeholder = 'Search',
  className   = '',
}: SearchBarProps) {
  const [focused, setFocused] = useState(false);

  return (
    <div
      className={[
        'flex items-center gap-2 h-10 px-3',
        'bg-surface border rounded-md',
        'transition-colors duration-fast',
        focused ? 'border-sky' : 'border-border',
        className,
      ].join(' ')}
    >
      {/* Search icon — inline SVG, no icon lib needed */}
      <svg
        className="h-4 w-4 shrink-0 text-fg-3"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        viewBox="0 0 24 24"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" strokeLinecap="round" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="flex-1 bg-transparent text-fg text-base font-sans placeholder:text-fg-3 outline-none"
      />
    </div>
  );
}
