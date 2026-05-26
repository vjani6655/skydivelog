import React from 'react';

interface TagProps {
  color:      string;
  removable?: boolean;
  size?:      'sm' | 'md';
  onRemove?:  () => void;
  children:   React.ReactNode;
}

export default function Tag({
  color,
  removable = false,
  size      = 'md',
  onRemove,
  children,
}: TagProps) {
  const dotSize   = size === 'sm' ? 4 : 5;
  const fontSize  = size === 'sm' ? '11px' : '12px';
  const paddingV  = size === 'sm' ? '3px' : '4px';

  return (
    <span
      className="inline-flex items-center rounded-full border gap-1.5 font-sans"
      style={{
        backgroundColor: color + '1a', // 10% opacity
        borderColor:     color + '33', // 20% opacity
        paddingTop:      paddingV,
        paddingBottom:   paddingV,
        paddingLeft:     '10px',
        paddingRight:    '10px',
        fontSize,
        color,
      }}
    >
      <span
        className="rounded-full shrink-0"
        style={{ width: dotSize, height: dotSize, backgroundColor: color }}
      />
      {children}
      {removable && (
        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 hover:opacity-70"
          style={{ color }}
          aria-label="Remove tag"
        >
          ×
        </button>
      )}
    </span>
  );
}
