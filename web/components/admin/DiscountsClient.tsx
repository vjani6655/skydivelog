'use client'

import { useState } from 'react'
import { Plus, Calendar } from 'lucide-react'
import { Badge, KPI } from '@/components/admin/ui'
import { createClient } from '@/lib/supabase/client'

type Coupon = {
  id: string
  code: string
  discount_type: string
  amount: number
  duration: string
  usage_cap: number | null
  usage_count: number
  expires_at: string | null
  use_case: string
  eligibility: string[]
  status: 'active' | 'paused' | 'expired'
}

type ManualDiscount = {
  id: string
  action: string
  target: string
  reason: string
  created_at: string
  admins: { name: string } | null
}

type Props = {
  coupons: Coupon[]
  manualDiscounts: ManualDiscount[]
  redemptions30d: number
  discountGiven30d: number
  manualComps30d: number
}

type CouponFilter = 'All' | 'Active' | 'Paused' | 'Expired'
type DiscountType = 'Percent' | 'Flat amount' | 'Free'

const statusKind: Record<string, 'ok' | 'warn' | 'muted'> = {
  active: 'ok', paused: 'warn', expired: 'muted',
}

function fmtExpiry(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: '2-digit' })
}

function discountLabel(c: Coupon) {
  if (c.discount_type === 'percent') return `${c.amount}% off · ${c.duration}`
  if (c.discount_type === 'flat') return `$${c.amount} off · ${c.duration}`
  if (c.discount_type === 'free') return `Free · ${c.duration}`
  return `Lifetime free`
}

export default function DiscountsClient({ coupons: initial, manualDiscounts, redemptions30d, discountGiven30d, manualComps30d }: Props) {
  const [filter,      setFilter]      = useState<CouponFilter>('All')
  const [coupons,     setCoupons]     = useState<Coupon[]>(initial)
  const [newCode,     setNewCode]     = useState('JULY-LAUNCH')
  const [discType,    setDiscType]    = useState<DiscountType>('Percent')
  const [amount,      setAmount]      = useState(25)
  const [duration,    setDuration]    = useState('1 year')
  const [cap,         setCap]         = useState(500)
  const [expires,     setExpires]     = useState('2026-08-31')
  const [useCase,     setUseCase]     = useState('')
  const [eligibility, setEligibility] = useState<string[]>(['New users'])
  const [creating,    setCreating]    = useState(false)

  const activeCoupons  = coupons.filter(c => c.status === 'active').length
  const pausedCoupons  = coupons.filter(c => c.status === 'paused').length
  const expiredCoupons = coupons.filter(c => c.status === 'expired').length

  const filtered = coupons.filter(c =>
    filter === 'All'     ? true :
    filter === 'Active'  ? c.status === 'active' :
    filter === 'Paused'  ? c.status === 'paused' :
    c.status === 'expired'
  )

  async function handleCreate() {
    if (!newCode.trim()) return
    setCreating(true)
    const sb = createClient()
    const { data, error } = await sb.from('coupons').insert({
      code:          newCode.trim().toUpperCase(),
      discount_type: discType.toLowerCase().replace(' ', '_').replace('flat_amount', 'flat').replace('free', 'free'),
      amount,
      duration,
      usage_cap:  cap || null,
      use_case:   useCase,
      eligibility,
      expires_at: expires ? new Date(expires).toISOString() : null,
      status:     'active',
    }).select().single()
    if (!error && data) {
      setCoupons(prev => [data as Coupon, ...prev])
    }
    setCreating(false)
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-end justify-between mb-5">
        <div>
          <div className="font-mono text-[10px] text-fg-3 tracking-widest uppercase mb-1.5">
            COUPON CODES · MANUAL USER DISCOUNTS
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-fg">Discounts</h1>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <KPI label="Active coupons"
          value={activeCoupons.toString()}
          sub={`${pausedCoupons} paused · ${expiredCoupons} expired`} />
        <KPI label="Redemptions · 30D"
          value={redemptions30d.toLocaleString()}
          sub="total uses"
          accent="#4A9EFF" />
        <KPI label="Discount given · 30D"
          value={`$${discountGiven30d.toLocaleString()}`}
          sub="effective rev loss" />
        <KPI label="Manual comps"
          value={manualComps30d.toString()}
          sub="this month" />
      </div>

      <div className="grid grid-cols-[3fr_2fr] gap-3.5">
        {/* Left */}
        <div>
          {/* Coupons table */}
          <div className="bg-surface border border-border rounded-md overflow-hidden mb-3.5">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="font-mono text-[10px] text-fg-3 tracking-widest uppercase">ACTIVE COUPONS</span>
              <div className="flex items-center gap-1 bg-surface-2 border border-border rounded-md p-0.5">
                {(['All', 'Active', 'Paused', 'Expired'] as CouponFilter[]).map(f => (
                  <button key={f} onClick={() => setFilter(f)}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors
                      ${filter === f ? 'bg-sky/10 text-sky' : 'text-fg-2 hover:text-fg'}`}>
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid px-4 py-2 border-b border-border gap-3 text-[10px] font-mono text-fg-3 tracking-widest uppercase"
              style={{ gridTemplateColumns: '110px 1fr 1fr 60px 60px 90px 80px' }}>
              {['CODE', 'DISCOUNT', 'USE CASE', 'USED', 'CAP', 'EXPIRES', 'STATUS'].map(h => (
                <span key={h}>{h}</span>
              ))}
            </div>
            {filtered.map(c => (
              <div key={c.id}
                className="grid px-4 py-3 gap-3 items-center border-b border-border last:border-0 hover:bg-surface-2 transition-colors"
                style={{ gridTemplateColumns: '110px 1fr 1fr 60px 60px 90px 80px' }}>
                <span className="font-mono text-xs text-sky font-medium cursor-pointer hover:underline">{c.code}</span>
                <span className="text-xs text-fg">{discountLabel(c)}</span>
                <span className="text-xs text-fg-2">{c.use_case || '—'}</span>
                <span className="font-mono text-xs text-fg">{c.usage_count.toLocaleString()}</span>
                <span className="font-mono text-xs text-fg-2">{c.usage_cap ?? '∞'}</span>
                <span className="font-mono text-xs text-fg-2">{fmtExpiry(c.expires_at)}</span>
                <span><Badge kind={statusKind[c.status] ?? 'muted'}>{c.status.toUpperCase()}</Badge></span>
              </div>
            ))}
            {!filtered.length && (
              <div className="px-4 py-6 text-xs text-fg-3">No coupons in this filter. Run the SQL migration in supabase/add_coupons.sql to populate.</div>
            )}
          </div>

          {/* Recent manual discounts */}
          <div className="bg-surface border border-border rounded-md overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="font-mono text-[10px] text-fg-3 tracking-widest uppercase">RECENT MANUAL DISCOUNTS · LAST 30 DAYS</span>
            </div>
            {manualDiscounts.length === 0 && (
              <div className="px-4 py-6 text-xs text-fg-3">No manual discounts recorded in audit log.</div>
            )}
            {manualDiscounts.map((d, i) => (
              <div key={d.id}
                className="grid px-4 py-3 gap-3 items-center border-b border-border last:border-0 hover:bg-surface-2 transition-colors text-sm"
                style={{ gridTemplateColumns: '1.5fr 1.5fr 1fr 40px 80px' }}>
                <span className="text-xs text-fg-2 truncate">{d.action}</span>
                <span className="text-xs text-fg-2 truncate">{d.reason || '—'}</span>
                <span className="text-xs text-fg-2">{d.target}</span>
                <span className="font-mono text-xs text-fg-3">{d.admins?.name?.split(' ').map(w => w[0]).join('') ?? 'SYS'}</span>
                <span className="font-mono text-xs text-fg-2">
                  {new Date(d.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: quick create */}
        <div className="bg-surface border border-border rounded-md p-4 h-fit">
          <div className="font-mono text-[10px] text-fg-3 tracking-widest uppercase mb-4">NEW COUPON · QUICK CREATE</div>

          <div className="mb-3.5">
            <div className="font-mono text-[10px] text-fg-3 uppercase tracking-widest mb-2">CODE</div>
            <input value={newCode} onChange={e => setNewCode(e.target.value.toUpperCase())}
              className="w-full h-9 bg-surface-2 border border-border rounded-md px-3 font-mono text-sm text-fg outline-none focus:border-sky/50" />
          </div>

          <div className="mb-3.5">
            <div className="font-mono text-[10px] text-fg-3 uppercase tracking-widest mb-2">DISCOUNT TYPE</div>
            <div className="flex gap-1.5">
              {(['Percent', 'Flat amount', 'Free'] as DiscountType[]).map(t => (
                <button key={t} onClick={() => setDiscType(t)}
                  className={`px-3 py-1.5 rounded-sm border text-xs font-medium transition-colors
                    ${discType === t ? 'bg-sky/10 text-sky border-sky/30' : 'bg-surface-2 text-fg-2 border-border'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3.5">
            <div>
              <div className="font-mono text-[10px] text-fg-3 uppercase tracking-widest mb-2">AMOUNT</div>
              <input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))}
                className="w-full h-9 bg-surface-2 border border-border rounded-md px-3 font-mono text-sm text-fg outline-none" />
            </div>
            <div>
              <div className="font-mono text-[10px] text-fg-3 uppercase tracking-widest mb-2">DURATION</div>
              <select value={duration} onChange={e => setDuration(e.target.value)}
                className="w-full h-9 bg-surface-2 border border-border rounded-md px-3 text-xs text-fg outline-none">
                {['1 cycle', '1 year', '2 years', 'Forever'].map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3.5">
            <div>
              <div className="font-mono text-[10px] text-fg-3 uppercase tracking-widest mb-2">USAGE CAP</div>
              <input type="number" value={cap} onChange={e => setCap(Number(e.target.value))}
                className="w-full h-9 bg-surface-2 border border-border rounded-md px-3 font-mono text-sm text-fg outline-none" />
            </div>
            <div>
              <div className="font-mono text-[10px] text-fg-3 uppercase tracking-widest mb-2">EXPIRES</div>
              <div className="flex items-center gap-1.5 h-9 bg-surface-2 border border-border rounded-md px-2.5">
                <Calendar size={12} className="text-fg-3 shrink-0" />
                <input type="date" value={expires} onChange={e => setExpires(e.target.value)}
                  className="bg-transparent font-mono text-xs text-fg outline-none flex-1" />
              </div>
            </div>
          </div>

          <div className="mb-3.5">
            <div className="font-mono text-[10px] text-fg-3 uppercase tracking-widest mb-2">USE CASE</div>
            <input value={useCase} onChange={e => setUseCase(e.target.value)}
              placeholder="e.g. Eloy Boogie attendees"
              className="w-full h-9 bg-surface-2 border border-border rounded-md px-3 text-xs text-fg placeholder:text-fg-3 outline-none" />
          </div>

          <div className="mb-4">
            <div className="font-mono text-[10px] text-fg-3 uppercase tracking-widest mb-2">ELIGIBILITY</div>
            <div className="flex gap-1.5 flex-wrap">
              {['New users', 'Renewals', '+ Country', '+ Licence type'].map(e => (
                <button key={e} onClick={() => setEligibility(prev =>
                  prev.includes(e) ? prev.filter(x => x !== e) : [...prev, e]
                )}
                  className={`px-2.5 py-1 rounded-sm border text-xs transition-colors
                    ${eligibility.includes(e) ? 'bg-sky/10 text-sky border-sky/30' : 'bg-surface-2 text-fg-2 border-border'}`}>
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button className="flex-1 py-2 bg-surface-2 border border-border rounded-sm text-xs text-fg-2 hover:bg-surface-3 transition-colors">
              Cancel
            </button>
            <button onClick={handleCreate} disabled={creating || !newCode.trim()}
              className="flex-1 py-2 bg-sky text-on-sky rounded-sm text-xs font-semibold disabled:opacity-50 hover:bg-sky/90 transition-colors">
              {creating ? 'Creating…' : 'Create coupon'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
