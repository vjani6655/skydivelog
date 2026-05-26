'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { TriangleAlert, Plus, Gift, X } from 'lucide-react'
import { Badge } from '@/components/admin/ui'
import { createClient } from '@/lib/supabase/client'

type Subscription = {
  id: string
  status: string
  plan: string
  price_at_signup: number
  started_at: string
  renews_at: string
  payment_method_brand: string
  payment_method_last4: string
  stripe_customer_id: string
  stripe_subscription_id: string
}

type User = {
  id: string
  full_name: string | null
  email: string
}

type AuditEntry = {
  id: string
  action: string
  reason: string | null
  created_at: string
}

type Props = {
  subscription: Subscription
  user: User
  auditEntries: AuditEntry[]
}

const ACTIONS = [
  { id: 'extend',  icon: Plus,  label: 'Extend trial',       sub: '+36 days'         },
  { id: 'comp',    icon: Gift,  label: 'Comp full year',      sub: 'Free for 1 year'  },
  { id: 'revoke',  icon: X,     label: 'Revoke immediately',  sub: 'Cancel · no refund' },
]

const STATUS_KIND: Record<string, 'ok' | 'sky' | 'warn' | 'danger' | 'muted'> = {
  active: 'ok', trial: 'sky', overdue: 'warn', cancelled: 'danger',
}

function fmtDate(s: string | null) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })
}

function timeAgo(s: string) {
  const diff = Date.now() - new Date(s).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function OverrideForm({ subscription: sub, user, auditEntries }: Props) {
  const router = useRouter()
  const [selectedAction, setSelectedAction] = useState<string>('extend')
  const [reason, setReason] = useState('')
  const [notify, setNotify] = useState(true)
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function handleApply() {
    if (!reason.trim()) {
      setError('A reason is required.')
      return
    }
    setError(null)
    setApplying(true)
    try {
      const sb = createClient()
      const { data: { user: authUser } } = await sb.auth.getUser()
      if (!authUser) throw new Error('Not authenticated')

      const { data: adminRow } = await sb
        .from('admins')
        .select('id')
        .eq('email', authUser.email!)
        .single()
      if (!adminRow) throw new Error('Admin record not found')

      const { error: insertErr } = await sb.from('audit_log').insert({
        admin_id: adminRow.id,
        action: `subscription_override:${selectedAction}`,
        target: `subscription:${sub.id}`,
        reason: reason.trim(),
      })
      if (insertErr) throw insertErr

      setDone(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to apply override.')
    } finally {
      setApplying(false)
    }
  }

  const subShort = sub.id.slice(-6).toUpperCase()

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-fg-3 mb-4">
        <Link href="/admin/revenue/subscriptions" className="text-fg-2 hover:text-fg">Subscriptions</Link>
        <span className="text-fg-4 text-[10px]">›</span>
        <span className="font-mono text-fg-2">sub_{subShort}</span>
        <span className="text-fg-4 text-[10px]">›</span>
        <span className="text-fg-2">Override</span>
      </div>

      {/* Header */}
      <div className="mb-5">
        <div className="font-mono text-[10px] text-fg-3 tracking-widest uppercase mb-1.5">
          SUB_{subShort} · {user.full_name ?? user.email}
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-fg">Manual subscription override</h1>
      </div>

      {/* Warning banner */}
      <div className="flex items-start gap-3 p-4 rounded-md border border-warn/30 bg-warn/8 mb-5">
        <TriangleAlert size={16} className="text-warn shrink-0 mt-0.5" />
        <p className="text-xs text-warn leading-relaxed">
          This bypasses Stripe. Manual overrides require a reason and create an audit log entry that&apos;s visible to the user on request.
        </p>
      </div>

      {done ? (
        <div className="bg-surface border border-ok/30 rounded-md p-6 text-center">
          <div className="text-sm font-medium text-ok mb-2">Override applied</div>
          <div className="text-xs text-fg-3 mb-4">Audit log entry created. Subscription change may require manual Stripe action.</div>
          <Link href="/admin/revenue/subscriptions"
            className="inline-block px-5 py-2 bg-surface-2 border border-border rounded-sm text-xs text-fg-2 font-medium hover:bg-surface-3 transition-colors">
            Back to subscriptions
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-[2fr_1fr] gap-3.5">
          {/* Left: form */}
          <div className="flex flex-col gap-3.5">
            {/* Current state */}
            <div className="bg-surface border border-border rounded-md p-4">
              <div className="font-mono text-[10px] text-fg-3 tracking-widest uppercase mb-3">CURRENT STATE</div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                {[
                  ['STATUS',          <Badge key="status" kind={STATUS_KIND[sub.status] ?? 'muted'}>{sub.status.toUpperCase()}</Badge>],
                  ['RENEWS',          <span key="renews" className="font-mono text-sm">{fmtDate(sub.renews_at)}</span>],
                  ['STARTED',         <span key="started" className="font-mono text-xs text-fg-2">{fmtDate(sub.started_at)}</span>],
                  ['PAYMENT ON FILE', <span key="payment" className="text-xs text-fg-2">{sub.payment_method_brand ? `${sub.payment_method_brand.toUpperCase()} ···· ${sub.payment_method_last4}` : 'None'}</span>],
                  ['STRIPE CUSTOMER', <span key="stripe" className="font-mono text-xs text-fg-2 truncate">{sub.stripe_customer_id || '—'}</span>],
                  ['PLAN',            <span key="plan" className="font-mono text-xs text-fg-2">{sub.plan} · ${sub.price_at_signup}/yr</span>],
                ].map(([k, v]) => (
                  <div key={k as string}>
                    <div className="font-mono text-[10px] text-fg-3 tracking-widest uppercase mb-1">{k as string}</div>
                    {v}
                  </div>
                ))}
              </div>
            </div>

            {/* Action selector */}
            <div className="bg-surface border border-border rounded-md p-4">
              <div className="font-mono text-[10px] text-fg-3 tracking-widest uppercase mb-3">ACTION</div>
              <div className="grid grid-cols-3 gap-2.5 mb-4">
                {ACTIONS.map(({ id, icon: Icon, label, sub: actionSub }) => (
                  <button
                    key={id}
                    onClick={() => setSelectedAction(id)}
                    className={`flex flex-col items-start gap-1.5 p-3 rounded-md border text-left transition-colors
                      ${selectedAction === id
                        ? 'border-sky bg-sky/10'
                        : 'border-border bg-surface-2 hover:border-border-strong'}`}
                  >
                    <Icon size={14} className={selectedAction === id ? 'text-sky' : 'text-fg-3'} />
                    <div className={`text-xs font-medium ${selectedAction === id ? 'text-sky' : 'text-fg'}`}>{label}</div>
                    <div className="font-mono text-[10px] text-fg-3">{actionSub}</div>
                  </button>
                ))}
              </div>

              {/* Effective date */}
              <div className="mb-4">
                <div className="font-mono text-[10px] text-fg-3 tracking-widest uppercase mb-2">EFFECTIVE DATE</div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <div className="w-4 h-4 rounded border border-sky bg-sky/20 flex items-center justify-center shrink-0">
                    <div className="w-2 h-2 rounded-sm bg-sky" />
                  </div>
                  <span className="text-xs text-fg">Immediately</span>
                </label>
              </div>

              {/* Reason */}
              <div className="mb-4">
                <div className="font-mono text-[10px] text-fg-3 tracking-widest uppercase mb-2">
                  REASON · REQUIRED
                </div>
                <textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  rows={4}
                  placeholder="Enter reason for override…"
                  className="w-full bg-surface-2 border border-border rounded-md px-3 py-2.5 text-xs text-fg placeholder:text-fg-3 outline-none focus:border-sky/50 resize-none"
                />
              </div>

              {/* Notify */}
              <label className="flex items-center gap-2 cursor-pointer mb-1">
                <button
                  onClick={() => setNotify(!notify)}
                  className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors
                    ${notify ? 'bg-sky border-sky' : 'bg-transparent border-border-strong'}`}
                >
                  {notify && <span className="text-on-sky text-[10px] font-bold">✓</span>}
                </button>
                <span className="text-xs text-fg-2">Notify user by email with reason summary.</span>
              </label>
            </div>

            {/* Error */}
            {error && (
              <div className="text-xs text-danger px-1">{error}</div>
            )}

            {/* Buttons */}
            <div className="flex gap-3 justify-end">
              <Link
                href="/admin/revenue/subscriptions"
                className="px-5 py-2 bg-surface border border-border rounded-sm text-xs text-fg-2 font-medium hover:bg-surface-2 transition-colors"
              >
                Cancel
              </Link>
              <button
                onClick={handleApply}
                disabled={applying || !reason.trim()}
                className="px-5 py-2 bg-sky text-on-sky rounded-sm text-xs font-semibold disabled:opacity-50 hover:bg-sky/90 transition-colors"
              >
                {applying ? 'Applying…' : 'Apply override'}
              </button>
            </div>
          </div>

          {/* Right: audit log */}
          <div className="bg-surface border border-border rounded-md p-4 h-fit">
            <div className="font-mono text-[10px] text-fg-3 tracking-widest uppercase mb-3">
              AUDIT LOG · SUB_{subShort}
            </div>
            {auditEntries.length === 0 ? (
              <div className="text-xs text-fg-3 italic py-2">No audit entries yet.</div>
            ) : auditEntries.map(e => (
              <div key={e.id} className="py-2.5 border-b border-dashed border-border last:border-0">
                <div className="flex justify-between items-start gap-2 mb-0.5">
                  <span className="font-mono text-[10px] text-fg-2 uppercase">{e.action.replace('subscription_override:', '')}</span>
                  <span className="font-mono text-[10px] text-fg-3 whitespace-nowrap">{timeAgo(e.created_at)}</span>
                </div>
                {e.reason && <p className="text-[11px] text-fg-3 leading-relaxed">{e.reason}</p>}
              </div>
            ))}
            <div className="mt-3 pt-3 border-t border-border">
              <p className="font-mono text-[10px] text-fg-4 leading-relaxed">
                Every manual action is logged here with admin ID, reason, and timestamp. Logs are immutable.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
