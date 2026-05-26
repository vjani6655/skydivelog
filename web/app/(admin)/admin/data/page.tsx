'use client'

import { useState } from 'react'
import { Shield, Download } from 'lucide-react'

type Dataset = 'Users' | 'Jumps' | 'Revenue'
type SubStatus = 'Active' | 'Trial' | 'Overdue' | 'Cancelled'
type Country = 'All' | 'AU only' | 'US only' | 'Custom'

const DATASETS: { id: Dataset; cols: number }[] = [
  { id: 'Users',   cols: 21 },
  { id: 'Jumps',   cols: 34 },
  { id: 'Revenue', cols: 14 },
]

const ALL_FIELDS = [
  'id', 'email', 'name', 'licence', 'rating', 'country',
  'created_at', 'last_seen_at', 'subscription_status', 'plan',
  'renews_at', 'stripe_id', 'jump_count', 'ff_seconds',
  'dob', 'home_dz', 'emergency_contact', 'phone',
  'two_factor', 'last_ip', 'preferred_units',
]


export default function AdminDataPage() {
  const [dataset,    setDataset]    = useState<Dataset>('Users')
  const [fromDate,   setFromDate]   = useState('')
  const [toDate,     setToDate]     = useState('')
  const [subStatus,  setSubStatus]  = useState<SubStatus[]>(['Active'])
  const [country,    setCountry]    = useState<Country>('All')
  const [fields,     setFields]     = useState<string[]>(ALL_FIELDS)
  const [queuing,    setQueuing]    = useState(false)
  const [queued,     setQueued]     = useState(false)

  const toggleField = (f: string) =>
    setFields(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f])
  const toggleSub = (s: SubStatus) =>
    setSubStatus(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])

  const estimateSize = '—'

  async function handleQueue() {
    setQueuing(true)
    await new Promise(r => setTimeout(r, 800))
    setQueuing(false)
    setQueued(true)
  }

  return (
    <div>
      <div className="flex items-end justify-between mb-5">
        <div>
          <div className="font-mono text-[10px] text-fg-3 tracking-widest uppercase mb-1.5">CSV · GZIPPED · UTF-8</div>
          <h1 className="text-4xl font-bold tracking-tight text-fg">Data export</h1>
        </div>
      </div>

      {/* Shield banner */}
      <div className="flex items-start gap-3 p-3.5 mb-5 bg-surface-2 border border-border rounded-md">
        <Shield size={14} className="text-fg-3 shrink-0 mt-0.5" />
        <p className="text-xs text-fg-2 leading-relaxed">
          Exports are encrypted in transit, GZIP-compressed, and emailed to your admin address only.
          All export events are logged in the audit trail. Do not share export files externally.
        </p>
      </div>

      <div className="grid grid-cols-[3fr_2fr] gap-3.5">
        {/* Left: form */}
        <div className="flex flex-col gap-3.5">
          {/* Dataset */}
          <div className="bg-surface border border-border rounded-md p-4">
            <div className="font-mono text-[10px] text-fg-3 uppercase tracking-widest mb-3">DATASET</div>
            <div className="grid grid-cols-3 gap-2.5">
              {DATASETS.map(d => (
                <button key={d.id} onClick={() => setDataset(d.id)}
                  className={`flex flex-col gap-1.5 p-3 rounded-md border text-left transition-colors
                    ${dataset === d.id ? 'border-sky bg-sky/10' : 'border-border bg-surface-2 hover:border-border-strong'}`}>
                  <div className={`text-sm font-semibold ${dataset === d.id ? 'text-sky' : 'text-fg'}`}>{d.id}</div>
                  <div className="font-mono text-[10px] text-fg-3">{d.cols} cols</div>
                </button>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div className="bg-surface border border-border rounded-md p-4">
            <div className="font-mono text-[10px] text-fg-3 uppercase tracking-widest mb-3">FILTERS</div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <div className="font-mono text-[10px] text-fg-3 uppercase tracking-widest mb-1.5">FROM DATE</div>
                <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                  className="w-full h-9 bg-surface-2 border border-border rounded-md px-3 font-mono text-xs text-fg outline-none" />
              </div>
              <div>
                <div className="font-mono text-[10px] text-fg-3 uppercase tracking-widest mb-1.5">TO DATE</div>
                <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                  className="w-full h-9 bg-surface-2 border border-border rounded-md px-3 font-mono text-xs text-fg outline-none" />
              </div>
            </div>
            <div className="mb-4">
              <div className="font-mono text-[10px] text-fg-3 uppercase tracking-widest mb-1.5">SUBSCRIPTION STATUS</div>
              <div className="flex gap-1.5">
                {(['Active', 'Trial', 'Overdue', 'Cancelled'] as SubStatus[]).map(s => (
                  <button key={s} onClick={() => toggleSub(s)}
                    className={`px-2.5 py-1 rounded-full border text-xs transition-colors
                      ${subStatus.includes(s) ? 'bg-sky/10 text-sky border-sky/30' : 'bg-surface-2 text-fg-2 border-border'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="font-mono text-[10px] text-fg-3 uppercase tracking-widest mb-1.5">COUNTRY</div>
              <div className="flex gap-1.5">
                {(['All', 'AU only', 'US only', 'Custom'] as Country[]).map(c => (
                  <button key={c} onClick={() => setCountry(c)}
                    className={`px-2.5 py-1 rounded-full border text-xs transition-colors
                      ${country === c ? 'bg-sky/10 text-sky border-sky/30' : 'bg-surface-2 text-fg-2 border-border'}`}>
                    + {c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Fields */}
          <div className="bg-surface border border-border rounded-md p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="font-mono text-[10px] text-fg-3 uppercase tracking-widest">
                FIELDS · {fields.length}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setFields(ALL_FIELDS)} className="font-mono text-[10px] text-sky hover:underline">Select all</button>
                <button onClick={() => setFields([])} className="font-mono text-[10px] text-fg-3 hover:underline">Clear</button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {ALL_FIELDS.map(f => (
                <label key={f} className="flex items-center gap-2 cursor-pointer group">
                  <button onClick={() => toggleField(f)}
                    className={`w-3.5 h-3.5 rounded border shrink-0 flex items-center justify-center transition-colors
                      ${fields.includes(f) ? 'bg-sky border-sky' : 'bg-transparent border-border-strong'}`}>
                    {fields.includes(f) && <span className="text-on-sky text-[8px] font-bold">✓</span>}
                  </button>
                  <span className="font-mono text-[11px] text-fg-2 group-hover:text-fg">{f}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Right: preview + recent */}
        <div className="flex flex-col gap-3.5">
          <div className="bg-surface border border-border rounded-md p-4">
            <div className="font-mono text-[10px] text-fg-3 uppercase tracking-widest mb-3">EXPORT PREVIEW</div>
            {[
              ['Columns', `${fields.length}`],
              ['Size est.', estimateSize],
              ['Format',  'CSV.GZ · UTF-8'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between py-2 border-b border-dashed border-border last:border-0">
                <span className="text-xs text-fg-2">{k}</span>
                <span className="font-mono text-xs text-fg">{v}</span>
              </div>
            ))}

            <div className="mt-4">
              {queued ? (
                <div className="text-center py-3">
                  <div className="text-xs text-ok mb-1 font-medium">Export queued!</div>
                  <div className="font-mono text-[10px] text-fg-3">You&apos;ll receive an email when ready.</div>
                </div>
              ) : (
                <button onClick={handleQueue} disabled={queuing || !fields.length}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-sky text-on-sky rounded-sm text-xs font-semibold disabled:opacity-50 hover:bg-sky/90 transition-colors">
                  <Download size={13} />
                  {queuing ? 'Queuing…' : 'Queue export'}
                </button>
              )}
              <div className="font-mono text-[10px] text-fg-3 text-center mt-2">~23 seconds · EMAILED WHEN READY</div>
            </div>
          </div>

          {/* Recent exports */}
          <div className="bg-surface border border-border rounded-md p-4">
            <div className="font-mono text-[10px] text-fg-3 uppercase tracking-widest mb-3">RECENT EXPORTS</div>
            <div className="flex flex-col gap-0">
              <div className="py-4 text-xs text-fg-3 text-center">No exports yet.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
