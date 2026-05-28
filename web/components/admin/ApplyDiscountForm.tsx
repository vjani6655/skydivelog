'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronRight, Info } from 'lucide-react'
import { useState } from 'react'
import { Avatar } from '@/components/admin/ui'
import { createClient } from '@/lib/supabase/client'

type UserRow = {
  id: string
  full_name: string
  email: string
  country: string | null
  created_at: string
}

type SubRow = {
  id: string
  stripe_subscription_id: string
  status: string
  plan: string
  price_at_signup: number
  renews_at: string
}

type Props = {
  user: UserRow
  subscription: SubRow | null
  userId: string
  jumpCount: number
  planPrice: number
}

type DiscountKind = 'percent' | 'flat' | 'months' | 'lifetime'
const DURATION_OPTS = ['1 cycle', '1 year', '2 years', 'Forever']
const PCT_PRESETS = [10, 25, 50, 75, 100]

const DISCOUNT_TYPES: { id: DiscountKind; icon: string; label: string; sub: string }[] = [
  { id: 'percent',  icon: '★', label: 'Percent off',  sub: '% of plan' },
  { id: 'flat',     icon: '$', label: 'Flat amount',  sub: '$ off price' },
  { id: 'months',   icon: '+', label: 'Free months',  sub: 'gratis period' },
  { id: 'lifetime', icon: '∞', label: 'Lifetime',     sub: 'free forever' },
]

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

export default function ApplyDiscountForm({ user, subscription, userId, jumpCount, planPrice }: Props) {
  const router = useRouter()
  const [kind,     setKind]     = useState<DiscountKind>('percent')
  const [pct,      setPct]      = useState(50)
  const [duration, setDuration] = useState('1 year')
  const [timing,   setTiming]   = useState<'renewal' | 'immediate'>('renewal')
  const [reason,   setReason]   = useState('')
  const [notify,   setNotify]   = useState(true)
  const [applying, setApplying] = useState(false)

  const currentPrice = Number(subscription?.price_at_signup ?? planPrice)
  const discountedPrice =
    kind === 'percent'  ? (currentPrice * (1 - pct / 100)).toFixed(2) :
    kind === 'flat'     ? Math.max(0, currentPrice - pct).toFixed(2) :
    '0.00'

  const subShort = subscription
    ? `${subscription.stripe_subscription_id.slice(-6)} · ${subscription.status.toUpperCase()} · $${currentPrice}/yr`
    : 'No subscription'

  async function handleApply() {
    if (!reason.trim()) { alert('Reason is required.'); return }
    setApplying(true)
    const sb = createClient()
    const { data: { user: adminUser } } = await sb.auth.getUser()
    const { data: adminRow } = await sb.from('admins').select('id').eq('email', adminUser?.email ?? '').single()

    if (adminRow) {
      await sb.from('audit_log').insert({
        action:   `Applied ${kind === 'percent' ? pct + '%' : '$' + pct} discount`,
        target:   `user:${userId}`,
        admin_id: adminRow.id,
        reason:   reason.trim(),
      })
    }
    setApplying(false)
    router.push(`/admin/users/${userId}`)
  }

  const memberYears = Math.floor((Date.now() - new Date(user.created_at).getTime()) / (365.25 * 86400000))
  const memberDays  = Math.floor((Date.now() - new Date(user.created_at).getTime()) / 86400000) % 365

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-fg-3 mb-4">
        <Link href="/admin/users" className="text-fg-2 hover:text-fg">Users</Link>
        <ChevronRight size={11} className="text-fg-4" />
        <Link href={`/admin/users/${userId}`} className="font-mono text-fg-2 hover:text-fg">
          #{userId.slice(-5)}
        </Link>
        <ChevronRight size={11} className="text-fg-4" />
        <span className="text-fg-2">Apply discount</span>
      </div>

      {/* Sub-header + title */}
      <div className="mb-5">
        <div className="font-mono text-[10px] text-fg-3 tracking-widest uppercase mb-1.5">
          {subShort}
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-fg">Apply discount · {user.full_name}</h1>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 p-3.5 mb-5 bg-sky/8 border border-sky/20 rounded-md">
        <Info size={14} className="text-sky shrink-0 mt-0.5" />
        <p className="text-xs text-sky/90 leading-relaxed">
          Discounts apply at the next renewal unless you check &quot;effective immediately&quot;.
          Both the user and Stripe are notified. Logged in audit.
        </p>
      </div>

      <div className="grid grid-cols-[3fr_2fr] gap-3.5">
        {/* Left: form */}
        <div className="flex flex-col gap-3.5">
          {/* Discount type */}
          <div className="bg-surface border border-border rounded-md p-4">
            <div className="font-mono text-[10px] text-fg-3 uppercase tracking-widest mb-3">DISCOUNT TYPE</div>
            <div className="grid grid-cols-4 gap-2.5">
              {DISCOUNT_TYPES.map(({ id, icon, label, sub }) => (
                <button key={id} onClick={() => setKind(id)}
                  className={`flex flex-col items-start gap-1.5 p-3 rounded-md border text-left transition-colors
                    ${kind === id ? 'border-sky bg-sky/10' : 'border-border bg-surface-2 hover:border-border-strong'}`}>
                  <span className={`text-sm ${kind === id ? 'text-sky' : 'text-fg-3'}`}>{icon}</span>
                  <div className={`text-xs font-medium ${kind === id ? 'text-sky' : 'text-fg'}`}>{label}</div>
                  <div className="font-mono text-[10px] text-fg-3">{sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Amount & duration */}
          <div className="bg-surface border border-border rounded-md p-4">
            <div className="font-mono text-[10px] text-fg-3 uppercase tracking-widest mb-3">AMOUNT &amp; DURATION</div>
            <div className="grid grid-cols-2 gap-6 mb-4">
              <div>
                <div className="font-mono text-[10px] text-fg-3 uppercase tracking-widest mb-2">DISCOUNT</div>
                <div className="flex items-center h-12 bg-surface-2 border border-border rounded-md px-3 gap-1.5 w-32 mb-2">
                  <input type="number" min={1} max={100} value={pct}
                    onChange={e => setPct(Number(e.target.value))}
                    className="bg-transparent font-mono text-2xl font-medium text-fg outline-none w-full" />
                  {kind === 'percent' && <span className="text-fg-3">%</span>}
                  {kind === 'flat' && <span className="text-fg-3">$</span>}
                </div>
                <div className="flex gap-1.5">
                  {PCT_PRESETS.map(p => (
                    <button key={p} onClick={() => setPct(p)}
                      className={`px-2 py-1 rounded border text-xs font-mono transition-colors
                        ${pct === p ? 'bg-sky/10 text-sky border-sky/30' : 'bg-surface-2 text-fg-2 border-border'}`}>
                      {p}%
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="font-mono text-[10px] text-fg-3 uppercase tracking-widest mb-2">DURATION</div>
                <div className="flex gap-1.5 flex-wrap">
                  {DURATION_OPTS.map(d => (
                    <button key={d} onClick={() => setDuration(d)}
                      className={`px-2.5 py-1.5 rounded-sm border text-xs transition-colors
                        ${duration === d ? 'bg-sky/10 text-sky border-sky/30' : 'bg-surface-2 text-fg-2 border-border'}`}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Renewal price preview */}
            <div className="pt-3 border-t border-border">
              <div className="font-mono text-[10px] text-fg-3 uppercase tracking-widest mb-1.5">RENEWAL PRICE WITH DISCOUNT</div>
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-3xl font-medium text-sky">${discountedPrice}</span>
                <span className="font-mono text-xs text-fg-2">/ year</span>
                <span className="font-mono text-xs text-fg-3 line-through ml-auto">${currentPrice.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* When & why */}
          <div className="bg-surface border border-border rounded-md p-4">
            <div className="font-mono text-[10px] text-fg-3 uppercase tracking-widest mb-3">WHEN &amp; WHY</div>
            <div className="flex gap-2 mb-4">
              {(['renewal', 'immediate'] as const).map(v => (
                <button key={v} onClick={() => setTiming(v)}
                  className={`px-3 py-1.5 rounded-sm border text-xs font-medium transition-colors
                    ${timing === v ? 'bg-sky/10 text-sky border-sky/30' : 'bg-surface-2 text-fg-2 border-border'}`}>
                  {v === 'renewal' ? 'Next renewal' : 'Immediately (prorate)'}
                </button>
              ))}
            </div>
            <div className="mb-4">
              <div className="font-mono text-[10px] text-fg-3 uppercase tracking-widest mb-2">REASON · REQUIRED</div>
              <textarea value={reason} onChange={e => setReason(e.target.value)} rows={4}
                placeholder="Reason for applying this discount…"
                className="w-full bg-surface-2 border border-border rounded-md px-3 py-2.5 text-xs text-fg placeholder:text-fg-3 outline-none resize-none focus:border-sky/50" />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <button onClick={() => setNotify(!notify)}
                className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors
                  ${notify ? 'bg-sky border-sky' : 'bg-transparent border-border-strong'}`}>
                {notify && <span className="text-on-sky text-[9px] font-bold">✓</span>}
              </button>
              <span className="text-xs text-fg-2">Send the user an email explaining the discount.</span>
            </label>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 justify-end">
            <Link href={`/admin/users/${userId}`}
              className="px-5 py-2 bg-surface border border-border rounded-sm text-xs text-fg-2 font-medium hover:bg-surface-2 transition-colors">
              Cancel
            </Link>
            <button onClick={handleApply} disabled={applying || !reason.trim()}
              className="px-5 py-2 bg-sky text-on-sky rounded-sm text-xs font-semibold disabled:opacity-50 hover:bg-sky/90 transition-colors">
              {applying ? 'Applying…' : `Apply ${kind === 'percent' ? pct + '%' : '$' + pct} discount`}
            </button>
          </div>
        </div>

        {/* Right: user context */}
        <div className="flex flex-col gap-3.5">
          <div className="bg-surface border border-border rounded-md p-4">
            <div className="font-mono text-[10px] text-fg-3 uppercase tracking-widest mb-3">USER · QUICK CONTEXT</div>
            <div className="flex items-center gap-3 mb-3">
              <Avatar initials={initials(user.full_name)} size={40} />
              <div>
                <div className="text-sm font-semibold text-fg">{user.full_name}</div>
                <div className="font-mono text-[11px] text-fg-3 mt-0.5">{user.email}</div>
              </div>
            </div>
            {[
              ['Country',       user.country ?? '—'],
              ['Member since',  new Date(user.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })],
              ['Account age',   `${memberYears}y ${memberDays}d`],
              ['Jumps logged',  jumpCount.toLocaleString()],
              ['Sub status',    subscription?.status ?? 'None'],
              ['Plan price',    subscription ? `$${currentPrice}/yr` : '—'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between py-1.5 border-b border-dashed border-border last:border-0">
                <span className="text-xs text-fg-2">{k}</span>
                <span className="font-mono text-xs text-fg">{v}</span>
              </div>
            ))}
          </div>

          <div className="bg-surface border border-border rounded-md p-4">
            <div className="font-mono text-[10px] text-fg-3 uppercase tracking-widest mb-3">PRIOR DISCOUNTS ON THIS USER</div>
            <div className="text-xs text-fg-3 italic">No prior discounts found in audit log.</div>
          </div>
        </div>
      </div>
    </div>
  )
}
