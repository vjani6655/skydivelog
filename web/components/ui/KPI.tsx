import React from 'react';

interface TrendProps {
  value:     number;  // positive = up, negative = down
  suffix?:   string;
}

function Trend({ value, suffix = '%' }: TrendProps) {
  const up    = value >= 0;
  const color = up ? 'text-ok' : 'text-danger';
  const arrow = up ? '↑' : '↓';
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-mono font-medium ${color}`}>
      {arrow}{Math.abs(value).toFixed(1)}{suffix}
    </span>
  );
}

interface KPIProps {
  label:      string;
  value:      string | number;
  unit?:      string;
  trend?:     number;
  trendSuffix?: string;
  accent?:    string;  // left border colour — CSS color string
  dense?:     boolean; // admin (dense) vs web (roomy)
  className?: string;
}

export default function KPI({
  label,
  value,
  unit,
  trend,
  trendSuffix,
  accent,
  dense     = false,
  className = '',
}: KPIProps) {
  return (
    <div
      className={[
        'bg-surface border border-border rounded-md',
        dense ? 'p-4' : 'p-7',
        className,
      ].join(' ')}
      style={accent ? { borderLeft: `2px solid ${accent}` } : undefined}
    >
      <p className="font-mono text-overline uppercase tracking-wider text-fg-3 mb-1">
        {label}
      </p>
      <div className="flex items-baseline gap-1.5">
        <span
          className={[
            'font-mono font-medium text-fg',
            dense ? 'text-[26px] leading-tight' : 'text-[30px] leading-tight',
          ].join(' ')}
        >
          {value}
        </span>
        {unit && (
          <span className="text-sm font-sans text-fg-3">{unit}</span>
        )}
      </div>
      {trend !== undefined && (
        <div className="mt-1">
          <Trend value={trend} suffix={trendSuffix} />
        </div>
      )}
    </div>
  );
}
