import React from 'react';

interface ProgressProps {
  /** 0 – 1 */
  value:      number;
  color?:     string;
  height?:    number;
  className?: string;
}

export default function Progress({
  value,
  color     = '#4ADE80',
  height    = 6,
  className = '',
}: ProgressProps) {
  const pct = `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;

  return (
    <div
      className={`w-full bg-surface-2 overflow-hidden ${className}`}
      style={{ height, borderRadius: height / 2 }}
    >
      <div
        style={{
          width:        pct,
          height:       '100%',
          backgroundColor: color,
          borderRadius: height / 2,
          transition:   'width 240ms ease',
        }}
      />
    </div>
  );
}
