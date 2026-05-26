import React from 'react';

interface FieldProps {
  label:   string;
  value:   React.ReactNode;
  mono?:   boolean;
  sub?:    string;
  action?: React.ReactNode;
}

export default function Field({ label, value, mono = false, sub, action }: FieldProps) {
  return (
    <div className="flex items-center justify-between py-3.5 border-b border-border">
      <div className="flex-1 min-w-0">
        <p className="font-mono text-overline uppercase tracking-wider text-fg-3">
          {label}
        </p>
        <p
          className={[
            'mt-0.5 text-fg',
            mono ? 'font-mono text-num-sm' : 'text-base font-sans',
          ].join(' ')}
        >
          {value}
        </p>
        {sub && (
          <p className="mt-0.5 text-xs font-sans text-fg-3">{sub}</p>
        )}
      </div>
      {action && <div className="ml-3 shrink-0">{action}</div>}
    </div>
  );
}
