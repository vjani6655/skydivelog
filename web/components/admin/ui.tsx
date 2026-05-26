// Shared admin UI primitives — mirrors the design-system tokens
// All components are intentionally presentational (no hooks) so they can be used in Server Components.

import React from 'react'
import type { ReactNode } from 'react'

// ─── Badge ────────────────────────────────────────────────────────────────────

type BadgeKind = 'ok' | 'sky' | 'warn' | 'danger' | 'muted'

const BADGE_CLS: Record<BadgeKind, string> = {
  ok:     'bg-ok/10 text-ok border border-ok/20',
  sky:    'bg-sky/10 text-sky border border-sky/20',
  warn:   'bg-warn/10 text-warn border border-warn/20',
  danger: 'bg-danger/10 text-danger border border-danger/20',
  muted:  'bg-surface-2 text-fg-3 border border-border',
}

export function Badge({ kind = 'muted', children }: { kind?: BadgeKind; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-[5px] text-[11px] font-mono tracking-widest whitespace-nowrap ${BADGE_CLS[kind]}`}>
      {children}
    </span>
  )
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

export function KPI({
  label, value, sub, trend, accent, tooltip,
}: {
  label: string
  value: string | number
  sub?: string
  trend?: string
  accent?: string
  tooltip?: string
}) {
  const trendColor = !trend ? '' :
    trend.startsWith('+') ? 'text-ok' :
    trend.startsWith('-') && !label.toLowerCase().includes('churn') ? 'text-danger' :
    'text-ok'

  return (
    <div
      className="bg-surface border border-border border-l-2 rounded-md p-4"
      style={{ borderLeftColor: accent ?? '#2F4060' }}
    >
      <div className="font-mono text-[10px] text-fg-3 tracking-widest uppercase mb-1 flex items-center gap-1">
        {label}
        {tooltip && (
          <span
            title={tooltip}
            className="inline-flex items-center justify-center w-3 h-3 rounded-full bg-fg-3/20 text-fg-3 cursor-help text-[8px] leading-none"
          >?</span>
        )}
      </div>
      <div
        className="font-mono text-5xl font-medium leading-none tracking-tight"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </div>
      {sub && <div className="font-mono text-[10px] text-fg-3 mt-1.5">{sub}</div>}
      {trend && <div className={`font-mono text-[10px] mt-1 ${trendColor}`}>{trend}</div>}
    </div>
  )
}

// ─── AdminCard ────────────────────────────────────────────────────────────────

export function AdminCard({
  title, action, children, noPad,
}: {
  title?: string
  action?: ReactNode
  children: ReactNode
  noPad?: boolean
}) {
  return (
    <div className="bg-surface border border-border rounded-md overflow-hidden">
      {(title || action) && (
        <div className={`flex justify-between items-center ${noPad ? 'px-4 py-3' : 'px-4 pt-4 pb-0'}`}>
          {title && (
            <span className="font-mono text-[10px] text-fg-3 tracking-widest uppercase">{title}</span>
          )}
          {action && <div>{action}</div>}
        </div>
      )}
      <div className={noPad ? '' : 'p-4'}>{children}</div>
    </div>
  )
}

// ─── AdminTable ───────────────────────────────────────────────────────────────

export interface ColDef {
  key: string
  label: string
  width?: string
  render?: (v: unknown, row: Record<string, unknown>) => ReactNode
}

export function AdminTable({
  cols, rows,
}: {
  cols: ColDef[]
  rows: Record<string, unknown>[]
}) {
  const tplCols = cols.map(c => c.width ?? '1fr').join(' ')

  return (
    <div className="bg-surface border border-border rounded-md overflow-hidden">
      {/* Header */}
      <div
        className="grid px-4 py-3 border-b border-border gap-3"
        style={{ gridTemplateColumns: tplCols }}
      >
        {cols.map(c => (
          <span key={c.key} className="font-mono text-[10px] text-fg-3 tracking-widest uppercase truncate">
            {c.label}
          </span>
        ))}
      </div>
      {/* Rows */}
      {rows.map((row, ri) => (
        <div
          key={ri}
          className="grid px-4 py-3 gap-3 items-center border-b border-border last:border-b-0 hover:bg-surface-2 transition-colors text-sm"
          style={{ gridTemplateColumns: tplCols }}
        >
          {cols.map(c => (
            <div key={c.key} className="truncate">
              {c.render ? c.render(row[c.key], row) : String(row[c.key] ?? '—')}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

// ─── Progress ─────────────────────────────────────────────────────────────────

export function Progress({
  value, color = '#4A9EFF', height = 4,
}: {
  value: number
  color?: string
  height?: number
}) {
  return (
    <div className="w-full rounded-full overflow-hidden bg-surface-2" style={{ height }}>
      <div
        className="rounded-full h-full"
        style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: color }}
      />
    </div>
  )
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

export function Avatar({
  initials, size = 32, color = '#4A9EFF',
}: {
  initials: string
  size?: number
  color?: string
}) {
  return (
    <div
      className="rounded-full flex items-center justify-center font-mono font-semibold shrink-0"
      style={{
        width: size, height: size,
        background: `linear-gradient(135deg, ${color}, #2A6FB8)`,
        color: '#001426',
        fontSize: size * 0.35,
      }}
    >
      {initials}
    </div>
  )
}

// ─── LineChart (SVG) ──────────────────────────────────────────────────────────

export function LineChart({ data, height = 160 }: { data: { v: number }[]; height?: number }) {
  if (!data.length) return null
  const max = Math.max(...data.map(d => d.v))
  const min = Math.min(...data.map(d => d.v))
  const range = max - min || 1
  const w = 600, h = height
  const pad = 8
  const pts = data.map((d, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2)
    const y = h - pad - ((d.v - min) / range) * (h - pad * 2)
    return `${x},${y}`
  })
  const polyline = pts.join(' ')
  const area = `${pad},${h - pad} ${pts.join(' ')} ${w - pad},${h - pad}`

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4A9EFF" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#4A9EFF" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#lg)" />
      <polyline points={polyline} fill="none" stroke="#4A9EFF" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

// ─── BarChart (SVG) ───────────────────────────────────────────────────────────

export function BarChart({
  data, height = 180,
}: {
  data: { label: string; v: number; highlight?: boolean }[]
  height?: number
}) {
  if (!data.length) return null
  const max = Math.max(...data.map(d => d.v))
  const w = 600, h = height
  const barW = (w / data.length) * 0.55
  const gap = w / data.length

  return (
    <svg viewBox={`0 0 ${w} ${h + 20}`} className="w-full" style={{ height: height + 20 }}>
      {data.map((d, i) => {
        const barH = (d.v / max) * (h - 20)
        const x = i * gap + (gap - barW) / 2
        const y = h - barH
        return (
          <g key={i}>
            <rect
              x={x} y={y} width={barW} height={barH} rx="3"
              fill={d.highlight ? '#4A9EFF' : '#4A9EFF44'}
            />
            <text
              x={x + barW / 2} y={h + 14}
              textAnchor="middle"
              className="fill-fg-3"
              style={{ fontSize: 9, fontFamily: 'JetBrains Mono, monospace', fill: '#5A6B85' }}
            >
              {d.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ─── Section label (mono caps) ────────────────────────────────────────────────

export function Label({ children }: { children: ReactNode }) {
  return (
    <div className="font-mono text-[10px] text-fg-3 tracking-widest uppercase mb-1.5">
      {children}
    </div>
  )
}

// ─── Divider ─────────────────────────────────────────────────────────────────

export function Divider() {
  return <div className="border-t border-dashed border-border my-3" />
}

// ─── AdminPageHeader ─────────────────────────────────────────────────────────

export function AdminPageHeader({
  title, sub, actions,
}: {
  title: string
  sub?: string
  actions?: ReactNode
}) {
  return (
    <div className="flex justify-between items-end mb-5">
      <div>
        {sub && (
          <div className="font-mono text-[10px] text-fg-3 tracking-widest uppercase mb-0.5">{sub}</div>
        )}
        <h1 className="text-4xl font-bold tracking-tight text-fg">{title}</h1>
      </div>
      {actions && <div className="flex gap-2 items-center">{actions}</div>}
    </div>
  )
}
