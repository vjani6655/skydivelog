'use client'
import { useState } from 'react'
import { Info, ChevronRight } from 'lucide-react'

const PRESETS = [6, 8, 12, 16, 24, 36, 48]

type Plan = { id: string; label: string; cycle: string; current: number; currency: string }
type HistoryEntry = { from: string; to: string; reason: string; applied_to: string; created_at: string }

export default function PricingEditor({
  plans, history, activeSubs,
}: {
  plans: Plan[]
  history: HistoryEntry[]
  activeSubs: number
}) {
  const plan = plans[0]
  const [price, setPrice] = useState(plan?.current ?? 5)
  const [effective, setEffective] = useState<'immediately' | 'schedule'>('schedule')
  const [scheduleDate, setScheduleDate] = useState('2026-07-01')
  const [trial, setTrial] = useState(14)
  const [grace, setGrace] = useState(7)
  const [reason, setReason] = useState('')

  const currentPrice = plan?.current ?? 5
  const newMRR = Math.round((price / 12) * activeSubs)

  const PAYMENT_METHODS = [
    { id: 'cards', label: 'Cards', active: true },
    { id: 'apple', label: 'Apple Pay', active: true },
    { id: 'google', label: 'Google Pay', active: true },
    { id: 'stripe-link', label: 'Stripe Link', active: true },
    { id: 'bank', label: 'Bank transfer', active: false },
    { id: 'crypto', label: 'Crypto', active: false },
    { id: 'paypal', label: 'PayPal', active: false },
    { id: 'klarna', label: 'Klarna', active: false },
  ]
  const [payments, setPayments] = useState(PAYMENT_METHODS)

  function togglePayment(id: string) {
    setPayments(prev => prev.map(p => p.id === id ? { ...p, active: !p.active } : p))
  }

  const formattedDate = scheduleDate
    ? new Date(scheduleDate).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—'

  return (
    <div>
      {/* Header */}
      <div className="flex items-end justify-between mb-5">
        <div>
          <div className="font-mono text-[10px] text-fg-3 tracking-widest uppercase mb-1.5">
            GLOBAL PRICE · TRIAL · CURRENCY
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-fg">Plans &amp; pricing</h1>
        </div>
        <span className="font-mono text-[10px] text-warn tracking-widest bg-warn/10 border border-warn/25 px-2.5 py-1.5 rounded-sm">
          CHANGES APPLY TO NEW &amp; RENEWING SUBS
        </span>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 p-3.5 mb-4 bg-sky/8 border border-sky/20 rounded-md">
        <Info size={14} className="text-sky shrink-0 mt-0.5" />
        <p className="text-xs text-sky/90 leading-relaxed">
          Pricing changes are audited and reversible. Existing active subscriptions keep their original price until renewal.
          Trial users see the new price when they convert.
        </p>
      </div>

      {/* Current vs staged */}
      <div className="bg-surface border border-border rounded-md p-4 mb-4">
        <div className="font-mono text-[10px] text-fg-3 tracking-widest uppercase mb-3">
          ANNUAL PLAN · ACTIVE
        </div>
        <div className="flex items-center gap-3">
          <div>
            <div className="font-mono text-[10px] text-fg-3 mb-0.5">CURRENT</div>
            <div className="font-mono text-4xl font-medium text-fg">
              ${currentPrice.toFixed(2)}
              <span className="text-sm text-fg-3 ml-1">/ year</span>
            </div>
          </div>
          <ChevronRight size={20} className="text-fg-4 mx-2" />
          <div>
            <div className="font-mono text-[10px] text-fg-3 mb-0.5">NEW · STAGED</div>
            <div className="font-mono text-4xl font-medium text-sky">
              ${price.toFixed(2)}
              <span className="text-sm text-sky/70 ml-1">/ year</span>
            </div>
          </div>
        </div>
        <div className="font-mono text-[11px] text-fg-3 mt-2.5">
          +{Math.round((price - currentPrice) / currentPrice * 100)}% · APPLIES FROM {formattedDate.toUpperCase()} · {activeSubs.toLocaleString()} USERS AFFECTED
        </div>
      </div>

      <div className="grid grid-cols-[3fr_2fr] gap-3.5">
        {/* Left: edit form */}
        <div className="flex flex-col gap-3.5">
          <div className="bg-surface border border-border rounded-md p-4">
            <div className="font-mono text-[10px] text-fg-3 tracking-widest uppercase mb-4">EDIT PRICE</div>

            {/* Currency + billing cycle */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <div className="font-mono text-[10px] text-fg-3 uppercase tracking-widest mb-2">CURRENCY</div>
                <div className="h-9 bg-surface-2 border border-border rounded-md flex items-center px-3 text-xs text-fg">
                  USD · United States Dollar
                </div>
              </div>
              <div>
                <div className="font-mono text-[10px] text-fg-3 uppercase tracking-widest mb-2">BILLING CYCLE</div>
                <div className="flex items-center gap-1.5">
                  <button className="w-7 h-7 rounded border border-border bg-surface-2 text-xs font-mono text-fg-2">M</button>
                  <button className="px-2.5 py-1.5 rounded border border-border bg-surface-2 text-xs text-fg-2">Monthly</button>
                  <button className="px-2.5 py-1.5 rounded border border-border bg-surface-2 text-xs text-fg-2">Lifetime</button>
                </div>
              </div>
            </div>

            {/* Price input */}
            <div className="mb-4">
              <div className="font-mono text-[10px] text-fg-3 uppercase tracking-widest mb-2">PRICE · USD PER YEAR</div>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center h-10 bg-surface-2 border border-border rounded-md px-3 gap-1.5 w-36">
                  <span className="font-mono text-sm text-fg-3">$</span>
                  <input
                    type="number" min={1} max={999} value={price}
                    onChange={e => setPrice(Number(e.target.value))}
                    className="bg-transparent font-mono text-lg font-medium text-fg outline-none w-full"
                  />
                </div>
                <span className="font-mono text-xs text-fg-3">/ year</span>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {PRESETS.map(p => (
                  <button key={p} onClick={() => setPrice(p)}
                    className={`px-2.5 py-1 rounded border font-mono text-xs transition-colors
                      ${price === p ? 'bg-sky/10 text-sky border-sky/30' : 'bg-surface-2 text-fg-2 border-border'}`}>
                    ${p}
                  </button>
                ))}
              </div>
            </div>

            {/* Trial + grace */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <div className="font-mono text-[10px] text-fg-3 uppercase tracking-widest mb-2">TRIAL LENGTH (DAYS)</div>
                <input type="number" min={0} max={90} value={trial}
                  onChange={e => setTrial(Number(e.target.value))}
                  className="w-full h-9 bg-surface-2 border border-border rounded-md px-3 font-mono text-sm text-fg outline-none" />
              </div>
              <div>
                <div className="font-mono text-[10px] text-fg-3 uppercase tracking-widest mb-2">RENEWAL GRACE PERIOD (DAYS)</div>
                <input type="number" min={0} max={30} value={grace}
                  onChange={e => setGrace(Number(e.target.value))}
                  className="w-full h-9 bg-surface-2 border border-border rounded-md px-3 font-mono text-sm text-fg outline-none" />
              </div>
            </div>

            {/* Effective from */}
            <div className="mb-4">
              <div className="font-mono text-[10px] text-fg-3 uppercase tracking-widest mb-2">EFFECTIVE FROM</div>
              <div className="flex gap-2 mb-2">
                {(['immediately', 'schedule'] as const).map(v => (
                  <button key={v} onClick={() => setEffective(v)}
                    className={`px-3 py-1.5 rounded-sm text-xs font-medium transition-colors capitalize
                      ${effective === v ? 'bg-sky/10 text-sky border border-sky/30' : 'bg-surface-2 text-fg-2 border border-border'}`}>
                    {v.charAt(0).toUpperCase() + v.slice(1)}
                  </button>
                ))}
              </div>
              {effective === 'schedule' && (
                <div className="flex items-center gap-2 h-9 bg-surface-2 border border-border rounded-md px-3 mt-2">
                  <span className="text-fg-3 text-xs">📅</span>
                  <input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)}
                    className="bg-transparent font-mono text-sm text-fg outline-none flex-1" />
                </div>
              )}
            </div>

            {/* Reason */}
            <div className="mb-4">
              <div className="font-mono text-[10px] text-fg-3 uppercase tracking-widest mb-2">REASON · FOR AUDIT LOG</div>
              <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
                placeholder="Sustainable pricing review · Q2 board approval · costs up 60% YoY (AWS Sydney). Existing subs grandfathered."
                className="w-full bg-surface-2 border border-border rounded-md px-3 py-2.5 text-xs text-fg placeholder:text-fg-4 outline-none resize-none" />
            </div>
          </div>

          {/* Payment methods */}
          <div className="bg-surface border border-border rounded-md p-4">
            <div className="font-mono text-[10px] text-fg-3 uppercase tracking-widest mb-3">PAYMENT METHODS ACCEPTED</div>
            <div className="grid grid-cols-4 gap-2">
              {payments.map(pm => (
                <button key={pm.id} onClick={() => togglePayment(pm.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-2 rounded-md border text-xs font-medium transition-colors
                    ${pm.active ? 'bg-sky/10 text-sky border-sky/30' : 'bg-surface-2 text-fg-3 border-border'}`}>
                  <span className={`w-3 h-3 rounded-sm border flex items-center justify-center shrink-0
                    ${pm.active ? 'bg-sky border-sky text-on-sky' : 'border-border'}`}>
                    {pm.active && <span className="text-[8px] font-bold">✓</span>}
                  </span>
                  {pm.label}
                </button>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 justify-end">
            <button className="px-4 py-2 bg-surface border border-border rounded-sm text-xs text-fg-2 hover:bg-surface-2 transition-colors">
              Discard
            </button>
            <button className="px-4 py-2 bg-surface-2 border border-border rounded-sm text-xs text-fg-2 hover:bg-surface-3 transition-colors">
              Save as draft
            </button>
            <button
              disabled={!reason || price === currentPrice}
              className="px-4 py-2 bg-sky text-on-sky rounded-sm text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-sky/90 transition-colors">
              Schedule for {formattedDate}
            </button>
          </div>
        </div>

        {/* Right: impact + history */}
        <div className="flex flex-col gap-3.5">
          {/* Impact estimate */}
          <div className="bg-surface border border-border rounded-md p-4">
            <div className="font-mono text-[10px] text-fg-3 uppercase tracking-widest mb-3">IMPACT ESTIMATE</div>
            <div className="mb-1">
              <div className="font-mono text-[10px] text-fg-3">NTW MRR / FORECAST</div>
              <div className="font-mono text-3xl font-medium text-fg mt-0.5">${(newMRR).toLocaleString()}</div>
              <div className="font-mono text-[11px] text-ok mt-0.5">+ ${(newMRR - Math.round((currentPrice / 12) * activeSubs)).toLocaleString()} / {Math.round((price - currentPrice) / currentPrice * 100)}% / +6%</div>
            </div>
            <div className="text-[11px] text-fg-3 mb-3 leading-relaxed">Existing active subscribers keep their current price until renewal.</div>
            {[
              ['Existing subs (grandfathered)', `$${currentPrice}/yr`, `${activeSubs.toLocaleString()}`],
            ].map(([label, value, sub]) => (
              <div key={label} className="flex justify-between py-1.5 border-b border-dashed border-border last:border-0 text-xs">
                <span className="text-fg-2">{label}</span>
                <span className="font-mono text-fg text-right">
                  {value}
                  {sub && <span className="text-fg-3 ml-1">{sub}</span>}
                </span>
              </div>
            ))}
          </div>

          {/* Price history */}
          <div className="bg-surface border border-border rounded-md p-4">
            <div className="font-mono text-[10px] text-fg-3 uppercase tracking-widest mb-3">PRICE HISTORY</div>
            {history.length === 0 ? (
              <div className="py-3 text-xs text-fg-3 italic">No price changes recorded yet.</div>
            ) : history.map((h, i) => (
              <div key={i} className="py-2.5 border-b border-dashed border-border last:border-0">
                <div className="flex justify-between items-baseline">
                  <span className="font-mono text-sm font-medium text-fg">${h.from} → ${h.to}</span>
                  <span className="font-mono text-[10px] text-fg-3">{new Date(h.created_at).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                </div>
                <div className="text-[11px] text-fg-3 mt-0.5">{h.reason}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
