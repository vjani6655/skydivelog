'use client'

import { useState } from 'react'
import { Shield, Download, CheckCircle } from 'lucide-react'

// ─── Dataset definitions ──────────────────────────────────────────────────────

type DatasetId = 'users' | 'jumps' | 'revenue' | 'audit'
type SubStatus = 'active' | 'trial' | 'overdue' | 'cancelled'

const DATASETS: { id: DatasetId; label: string; desc: string; fields: string[] }[] = [
  {
    id: 'users',
    label: 'Users',
    desc: 'Profiles, subs, jump counts',
    fields: [
      'id', 'email', 'name', 'licence', 'rating', 'dob', 'phone', 'country',
      'created_at', 'last_seen_at', 'last_ip', 'two_factor', 'preferred_units',
      'marketing_opt_in', 'home_dz', 'emergency_contact',
      'subscription_status', 'plan', 'renews_at', 'stripe_id',
      'jump_count', 'ff_seconds',
    ],
  },
  {
    id: 'jumps',
    label: 'Jumps',
    desc: 'All jump records across all users',
    fields: [
      'id', 'user_email', 'jump_number', 'date', 'dropzone',
      'aircraft_type', 'aircraft_rego',
      'exit_altitude_ft', 'pull_altitude_ft', 'deploy_altitude_ft',
      'freefall_seconds', 'canopy_seconds',
      'jump_type', 'jumper_type', 'jump_stage', 'canopy_type',
      'landing_accuracy_value', 'landing_accuracy_unit',
      'notes', 'coordinates_lat', 'coordinates_lng',
      'is_favourite', 'is_draft', 'created_at', 'updated_at',
    ],
  },
  {
    id: 'revenue',
    label: 'Revenue',
    desc: 'Subscriptions, payments, refunds',
    fields: [
      'id', 'user_email', 'stripe_subscription_id', 'stripe_customer_id',
      'status', 'plan', 'price_at_signup',
      'started_at', 'renews_at',
      'payment_method_brand', 'payment_method_last4', 'payment_method_expiry',
      'refunded_at', 'refunded_amount',
    ],
  },
  {
    id: 'audit',
    label: 'Audit log',
    desc: 'Admin action history',
    fields: ['id', 'admin_name', 'admin_email', 'action', 'target', 'reason', 'created_at'],
  },
]

type RecentExport = { filename: string; rows: number; ts: Date; dataset: string }

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminDataPage() {
  const [dataset,    setDataset]    = useState<DatasetId>('users')
  const [fromDate,   setFromDate]   = useState('')
  const [toDate,     setToDate]     = useState('')
  const [subStatus,  setSubStatus]  = useState<SubStatus[]>([])
  const [fields,     setFields]     = useState<string[]>(DATASETS[0].fields)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')
  const [recent,     setRecent]     = useState<RecentExport[]>([])

  const current = DATASETS.find(d => d.id === dataset)!

  function switchDataset(id: DatasetId) {
    setDataset(id)
    setFields(DATASETS.find(d => d.id === id)!.fields)
  }

  const toggleField = (f: string) =>
    setFields(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f])

  const toggleSub = (s: SubStatus) =>
    setSubStatus(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])

  const showSubFilter     = dataset === 'users' || dataset === 'revenue'
  const showCountryFilter = dataset === 'users'

  async function handleDownload() {
    if (!fields.length) return
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/admin/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataset,
          fields,
          filters: {
            fromDate:  fromDate  || undefined,
            toDate:    toDate    || undefined,
            subStatus: subStatus.length ? subStatus : undefined,
          },
        }),
      })

      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error ?? `Export failed (${res.status})`)
        return
      }

      // Trigger download
      const blob = await res.blob()
      const disposition = res.headers.get('Content-Disposition') ?? ''
      const match = disposition.match(/filename="?([^"]+)"?/)
      const filename = match?.[1] ?? `${dataset}_export.csv`

      const url = URL.createObjectURL(blob)
      const a   = document.createElement('a')
      a.href     = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)

      // Estimate rows from file size ÷ ~30 bytes/row (rough)
      const approxRows = Math.max(1, Math.round(blob.size / 40))
      setRecent(prev => [
        { filename, rows: approxRows, ts: new Date(), dataset: current.label },
        ...prev.slice(0, 9),
      ])
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="flex items-end justify-between mb-5">
        <div>
          <div className="font-mono text-[10px] text-fg-3 tracking-widest uppercase mb-1.5">CSV · UTF-8</div>
          <h1 className="text-4xl font-bold tracking-tight text-fg">Data export</h1>
        </div>
      </div>

      {/* Banner */}
      <div className="flex items-start gap-3 p-3.5 mb-5 bg-surface-2 border border-border rounded-md">
        <Shield size={14} className="text-fg-3 shrink-0 mt-0.5" />
        <p className="text-xs text-fg-2 leading-relaxed">
          Files download directly to your browser. All export events are logged in the audit trail.
          Do not share export files externally.
        </p>
      </div>

      <div className="grid grid-cols-[3fr_2fr] gap-3.5">
        {/* Left: form */}
        <div className="flex flex-col gap-3.5">

          {/* Dataset */}
          <div className="bg-surface border border-border rounded-md p-4">
            <div className="font-mono text-[10px] text-fg-3 uppercase tracking-widest mb-3">DATASET</div>
            <div className="grid grid-cols-4 gap-2.5">
              {DATASETS.map(d => (
                <button key={d.id} onClick={() => switchDataset(d.id)}
                  className={`flex flex-col gap-1.5 p-3 rounded-md border text-left transition-colors
                    ${dataset === d.id ? 'border-sky bg-sky/10' : 'border-border bg-surface-2 hover:border-border-strong'}`}>
                  <div className={`text-sm font-semibold ${dataset === d.id ? 'text-sky' : 'text-fg'}`}>{d.label}</div>
                  <div className="font-mono text-[10px] text-fg-3 leading-tight">{d.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div className="bg-surface border border-border rounded-md p-4">
            <div className="font-mono text-[10px] text-fg-3 uppercase tracking-widest mb-3">FILTERS</div>

            {/* Date range */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <div className="font-mono text-[10px] text-fg-3 uppercase tracking-widest mb-1.5">FROM DATE</div>
                <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                  className="w-full h-9 bg-surface-2 border border-border rounded-md px-3 font-mono text-xs text-fg outline-none focus:border-sky" />
              </div>
              <div>
                <div className="font-mono text-[10px] text-fg-3 uppercase tracking-widest mb-1.5">TO DATE</div>
                <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                  className="w-full h-9 bg-surface-2 border border-border rounded-md px-3 font-mono text-xs text-fg outline-none focus:border-sky" />
              </div>
            </div>

            {/* Sub status */}
            {showSubFilter && (
              <div className="mb-4">
                <div className="font-mono text-[10px] text-fg-3 uppercase tracking-widest mb-1.5">
                  SUBSCRIPTION STATUS <span className="normal-case text-fg-3">(blank = all)</span>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {(['active', 'trial', 'overdue', 'cancelled'] as SubStatus[]).map(s => (
                    <button key={s} onClick={() => toggleSub(s)}
                      className={`px-2.5 py-1 rounded-full border text-xs transition-colors capitalize
                        ${subStatus.includes(s) ? 'bg-sky/10 text-sky border-sky/30' : 'bg-surface-2 text-fg-2 border-border hover:border-border-strong'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Country */}
            {showCountryFilter && (
              <div>
                <div className="font-mono text-[10px] text-fg-3 uppercase tracking-widest mb-1.5">COUNTRY <span className="normal-case text-fg-3">(2-letter code, e.g. AU)</span></div>
                <input
                  type="text" maxLength={2} placeholder="Leave blank for all"
                  className="h-9 bg-surface-2 border border-border rounded-md px-3 font-mono text-xs text-fg outline-none focus:border-sky uppercase w-48"
                />
              </div>
            )}
          </div>

          {/* Fields */}
          <div className="bg-surface border border-border rounded-md p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="font-mono text-[10px] text-fg-3 uppercase tracking-widest">
                FIELDS · {fields.length} / {current.fields.length}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setFields(current.fields)} className="font-mono text-[10px] text-sky hover:underline">Select all</button>
                <button onClick={() => setFields([])} className="font-mono text-[10px] text-fg-3 hover:underline">Clear</button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {current.fields.map(f => (
                <label key={f} className="flex items-center gap-2 cursor-pointer group" onClick={() => toggleField(f)}>
                  <span
                    className={`w-3.5 h-3.5 rounded border shrink-0 flex items-center justify-center transition-colors
                      ${fields.includes(f) ? 'bg-sky border-sky' : 'bg-transparent border-border-strong'}`}>
                    {fields.includes(f) && <span className="text-on-sky text-[8px] font-bold">✓</span>}
                  </span>
                  <span className="font-mono text-[11px] text-fg-2 group-hover:text-fg">{f}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Right: preview + recent */}
        <div className="flex flex-col gap-3.5">

          {/* Export preview + action */}
          <div className="bg-surface border border-border rounded-md p-4">
            <div className="font-mono text-[10px] text-fg-3 uppercase tracking-widest mb-3">EXPORT PREVIEW</div>

            {[
              ['Dataset',  current.label],
              ['Columns',  `${fields.length}`],
              ['Format',   'CSV · UTF-8'],
              ['Download', 'Instant · browser'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between py-2 border-b border-dashed border-border last:border-0">
                <span className="text-xs text-fg-2">{k}</span>
                <span className="font-mono text-xs text-fg">{v}</span>
              </div>
            ))}

            {error && (
              <p className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-sm px-3 py-2 mt-3">{error}</p>
            )}

            <button
              onClick={handleDownload}
              disabled={loading || !fields.length}
              className="w-full mt-4 flex items-center justify-center gap-1.5 py-2.5 bg-sky text-on-sky rounded-sm text-xs font-semibold disabled:opacity-50 hover:bg-sky/90 transition-colors"
            >
              <Download size={13} />
              {loading ? 'Building CSV…' : 'Download CSV'}
            </button>

            <div className="font-mono text-[10px] text-fg-3 text-center mt-2">
              Direct download — no email, no queue
            </div>
          </div>

          {/* Recent exports (session only) */}
          <div className="bg-surface border border-border rounded-md p-4">
            <div className="font-mono text-[10px] text-fg-3 uppercase tracking-widest mb-3">RECENT DOWNLOADS</div>
            {recent.length === 0 && (
              <div className="py-4 text-xs text-fg-3 text-center">No downloads this session.</div>
            )}
            {recent.map((r, i) => (
              <div key={i} className="flex items-start gap-2.5 py-2 border-b border-dashed border-border last:border-0">
                <CheckCircle size={13} className="text-ok shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-xs text-fg truncate">{r.filename}</div>
                  <div className="font-mono text-[10px] text-fg-3">{r.dataset}</div>
                </div>
                <span className="font-mono text-[10px] text-fg-3 shrink-0 whitespace-nowrap">
                  {r.ts.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  )
}
