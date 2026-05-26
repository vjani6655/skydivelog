import React from 'react';

export type BadgeKind = 'sky' | 'ok' | 'warn' | 'danger' | 'muted';
export type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  kind?:     BadgeKind;
  icon?:     React.ReactNode;
  size?:     BadgeSize;
  children:  React.ReactNode;
  className?: string;
}

const kindClass: Record<BadgeKind, string> = {
  sky:    'bg-sky-bg text-sky',
  ok:     'bg-ok-bg text-ok',
  warn:   'bg-warn-bg text-warn',
  danger: 'bg-danger-bg text-danger',
  muted:  'bg-surface-2 text-fg-2',
};

export default function Badge({
  kind      = 'muted',
  icon,
  size      = 'md',
  children,
  className = '',
}: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1 font-mono uppercase tracking-wide',
        'rounded-[5px] font-medium leading-none',
        size === 'sm' ? 'text-[10px] h-[18px] px-1.5' : 'text-overline h-[22px] px-2',
        kindClass[kind],
        className,
      ].join(' ')}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {typeof children === 'string' ? children.toUpperCase() : children}
    </span>
  );
}
