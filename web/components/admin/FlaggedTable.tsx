'use client'

import { useState } from 'react'
import { Badge, KPI } from '@/components/admin/ui'

type FlaggedEntry = {
  id: string
  reason: string
  detail: string
  source: 'algorithm' | 'manual'
  severity: 'high' | 'mid' | 'low'
  status: 'open' | 'resolved' | 'dismissed'
  jumps: {
    jump_number: number | null
    jump_type: string | null
    users: { full_name: string } | null
  } | null
}

type Props = {
  entries: FlaggedEntry[]
  openCount: number
  resolved30d: number
  dismissed30d: number
  totalJumps: number
}

type FilterOption = 'All open' | 'High severity' | 'Algorithm' | 'Manual' | 'Resolved'

const SEV_KIND: Record<string, 'danger' | 'warn' | 'muted'> = {
  high: 'danger', mid: 'warn', low: 'muted',
}

function sourceBadge(src: string) {
  return src === 'algorithm'
    ? <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-[4px] bg-sky/15 text-sky">ALGORITHM</span>
    : <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-[4px] bg-surface-3 text-fg-2">MANUAL</span>
}

export default function FlaggedTable({ entries, openCount, resolved30d, dismissed30d, totalJumps }: Props) {
  const flagRate = totalJumps > 0 ? ((openCount / totalJumps) * 100).toFixed(2) + '%' : '—'
  const [filter, setFilter] = useState<FilterOption>('All open')

  const displayed = entries.filter(f => {
    if (filter === 'High severity') return f.severity === 'high' && f.status === 'open'
    if (filter === 'Algorithm')    return f.source === 'algorithm' && f.status === 'open'
    if (filter === 'Manual')       return f.source === 'manual' && f.status === 'open'
    if (filter === 'Resolved')     return f.status === 'resolved' || f.status === 'dismissed'
    return f.status === 'open'
  })

  return (
    <div>
      <div className="flex items-end justify-between mb-5">
        <div>
          <div className="font-mono text-[10px] text-fg-3 tracking-widest uppercase mb-1.5">
            AUTO-FLAGGED · REVIEW QUEUE
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-fg">Flagged entries</h1>
        </div>
        <Badge kind="warn">{openCount} OPEN</Badge>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-4">
        <KPI label="Open" value={openCount.toString()} sub="needs review" accent="#FFB74A" />
        <KPI label="Resolved · 30D" value={resolved30d.toString()} sub="92% upheld" />
        <KPI label="Dismissed · 30D" value={dismissed30d.toString()} sub="false positives" />
        <KPI label="Flag rate" value={flagRate} sub="of all jumps" />
      </div>

      <div className="flex gap-2 mb-3.5">
        {(['All open', 'High severity', 'Algorithm', 'Manual', 'Resolved'] as FilterOption[]).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-colors
              ${filter === f ? 'bg-sky/10 text-sky border-sky/30' : 'bg-surface border-border text-fg-2 hover:text-fg'}`}>
            {f}
          </button>
        ))}
      </div>

      <div className="bg-surface border border-border rounded-md overflow-hidden">
        <div className="grid px-4 py-2 border-b border-border gap-3 text-[10px] font-mono text-fg-3 tracking-widest uppercase"
          style={{ gridTemplateColumns: '72px 72px 100px 100px 160px 64px 150px 110px 72px' }}>
          {['FLAG', 'USER', 'NAME', 'TYPE', 'REASON', 'JUMP #', 'DETAIL', 'SOURCE', 'SEV.'].map(h => (
            <span key={h}>{h}</span>
          ))}
        </div>
        {displayed.map((f) => (
          <div key={f.id}
            className="grid px-4 py-3 gap-3 items-center border-b border-border last:border-0 hover:bg-surface-2 transition-colors"
            style={{ gridTemplateColumns: '72px 72px 100px 100px 160px 64px 150px 110px 72px' }}>
            <span className="font-mono text-xs text-fg font-semibold">F-{f.id.slice(-4).toUpperCase()}</span>
            <span className="font-mono text-xs text-fg-3">#—</span>
            <span className="text-xs text-fg">{f.jumps?.users?.full_name?.split(' ').map((w, i) => i === 1 ? w[0] + '.' : w).join(' ') ?? '—'}</span>
            <span className="text-xs text-fg-2">{f.jumps?.jump_type ?? '—'}</span>
            <span className="text-xs text-fg-2">{f.reason}</span>
            <span className="font-mono text-xs text-fg-2">#{f.jumps?.jump_number ?? '—'}</span>
            <span className="text-xs text-fg-2 truncate">{f.detail}</span>
            <span>{sourceBadge(f.source)}</span>
            <span><Badge kind={SEV_KIND[f.severity] ?? 'muted'}>{f.severity.toUpperCase()}</Badge></span>
          </div>
        ))}
        {!displayed.length && (
          <div className="px-4 py-6 text-xs text-fg-3">No flagged entries match this filter.</div>
        )}
      </div>
    </div>
  )
}
