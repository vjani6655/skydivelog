export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

function fmtDate(s: string | null) {
  if (!s) return '—'
  return new Date(s).toLocaleString('en-AU', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
}

const EVENT_DEFS: Record<string, { icon: string; label: string; color: string }> = {
  // Stripe
  subscribed:                { icon: '$', label: 'Subscribed',                color: 'bg-ok/10 text-ok' },
  resubscribed_after_refund: { icon: '↻', label: 'Re-subscribed',             color: 'bg-sky/10 text-sky' },
  stripe_renewed:            { icon: '↻', label: 'Stripe renewed',            color: 'bg-ok/10 text-ok' },
  stripe_cancelled:          { icon: '✕', label: 'Stripe auto-renewal off',   color: 'bg-danger/10 text-danger' },
  stripe_overdue:            { icon: '!', label: 'Stripe payment overdue',    color: 'bg-warn/10 text-warn' },
  subscription_deleted:      { icon: '✕', label: 'Stripe sub deleted',        color: 'bg-danger/10 text-danger' },
  // Apple IAP
  iap_subscribed:            { icon: '$', label: 'Apple subscribed',          color: 'bg-ok/10 text-ok' },
  iap_renewed:               { icon: '↻', label: 'Apple renewed',             color: 'bg-ok/10 text-ok' },
  iap_overdue:               { icon: '!', label: 'Apple payment overdue',     color: 'bg-warn/10 text-warn' },
  iap_expired:               { icon: '✕', label: 'Apple sub expired',         color: 'bg-danger/10 text-danger' },
  iap_refunded:              { icon: '↩', label: 'Apple refunded',            color: 'bg-warn/10 text-warn' },
  iap_revoked:               { icon: '✕', label: 'Apple family share revoked',color: 'bg-danger/10 text-danger' },
  iap_cancelled:             { icon: '✕', label: 'Apple auto-renewal off',    color: 'bg-danger/10 text-danger' },
  iap_reactivated:           { icon: '↻', label: 'Apple auto-renewal on',     color: 'bg-sky/10 text-sky' },
  iap_revalidated:           { icon: '✓', label: 'Apple receipt revalidated', color: 'bg-sky/10 text-sky' },
  // Admin
  admin_reset:               { icon: '⟳', label: 'Admin reset',               color: 'bg-warn/10 text-warn' },
  cancelled_immediately:     { icon: '✕', label: 'Admin revoked',             color: 'bg-danger/10 text-danger' },
  cancelled:                 { icon: '✕', label: 'Cancelled',                 color: 'bg-danger/10 text-danger' },
  overdue:                   { icon: '!', label: 'Payment overdue',           color: 'bg-warn/10 text-warn' },
  refunded:                  { icon: '↩', label: 'Refunded',                  color: 'bg-warn/10 text-warn' },
}

function actorLabel(meta: Record<string, unknown>): string {
  if (meta.actor === 'admin') return `Admin${meta.admin_email ? ` · ${meta.admin_email}` : ''}`
  if (meta.actor === 'apple') return 'Apple'
  if (meta.actor === 'stripe') return 'Stripe'
  if (meta.actor === 'user') return 'User'
  return '—'
}

function metaSummary(event: string, meta: Record<string, unknown>): string {
  const parts: string[] = []
  if (meta.plan)                  parts.push(`Plan: ${meta.plan}`)
  if (meta.price != null)         parts.push(`$${meta.price}`)
  if (meta.price_at_signup != null) parts.push(`$${meta.price_at_signup}`)
  if (meta.new_status)            parts.push(`Status → ${meta.new_status}`)
  if (meta.renews_at)             parts.push(`Renews: ${new Date(meta.renews_at as string).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })}`)
  if (meta.notification_type)     parts.push(`Apple: ${meta.notification_type}${meta.subtype ? `/${meta.subtype}` : ''}`)
  if (meta.stripe_subscription_id) parts.push(`Stripe sub: ${meta.stripe_subscription_id}`)
  if (meta.original_transaction_id) parts.push(`Txn: ${meta.original_transaction_id}`)
  if (meta.reason)                parts.push(`Reason: ${meta.reason}`)
  if (meta.cancel_at_period_end)  parts.push('Cancel at period end')
  if (meta.refunded_amount != null) parts.push(`Refund: $${Number(meta.refunded_amount).toFixed(2)}`)
  if (meta.source === 'webhook_appAccountToken') parts.push('Created via Apple webhook')
  return parts.join(' · ')
}

export default async function AdminUserActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = createAdminClient()

  const [
    { data: user },
    { data: events },
    { count: totalUsers },
  ] = await Promise.all([
    db.from('users').select('id, full_name, email, licence_number').eq('id', id).single(),
    db.from('subscription_events')
      .select('id, event, metadata, created_at, sub_id')
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .limit(200),
    db.from('users').select('*', { count: 'exact', head: true })
      .lte('created_at', (await db.from('users').select('created_at').eq('id', id).single()).data?.created_at ?? ''),
  ])

  if (!user) notFound()

  const displayId = `#${totalUsers}`

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-fg-3 mb-3">
        <Link href="/admin/users" className="text-fg-2 hover:text-fg">Users</Link>
        <ChevronRight size={11} className="text-fg-4" />
        <Link href={`/admin/users/${id}`} className="font-mono text-fg-2 hover:text-fg">{displayId}</Link>
        <ChevronRight size={11} className="text-fg-4" />
        <span className="text-fg-2">Activity</span>
      </div>

      {/* Header */}
      <div className="flex items-end justify-between mb-5">
        <div>
          <div className="font-mono text-[10px] text-fg-3 tracking-widest uppercase mb-1.5">
            USER {displayId} · {user.licence_number ?? '—'}
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-fg">
            {user.full_name || user.email.split('@')[0]} · activity
          </h1>
        </div>
        <span className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-2 border border-border rounded-sm text-xs font-mono text-fg-3">
          READ-ONLY
        </span>
      </div>

      {/* Event log table */}
      <div className="bg-surface border border-border rounded-md overflow-hidden">
        {/* Header */}
        <div className="grid px-4 py-3 border-b border-border gap-3"
          style={{ gridTemplateColumns: '40px 1fr 1fr 2fr 160px' }}>
          {['', 'EVENT', 'ACTOR', 'DETAILS', 'TIMESTAMP'].map(h => (
            <span key={h} className="font-mono text-[10px] text-fg-3 tracking-widest uppercase">{h}</span>
          ))}
        </div>

        {(events ?? []).map(ev => {
          const meta = (ev.metadata ?? {}) as Record<string, unknown>
          const def = EVENT_DEFS[ev.event] ?? { icon: '·', label: ev.event, color: 'bg-surface-2 text-fg-3' }
          const summary = metaSummary(ev.event, meta)

          return (
            <div key={ev.id}
              className="grid px-4 py-3 gap-3 items-start border-b border-border last:border-0 hover:bg-surface-2 transition-colors"
              style={{ gridTemplateColumns: '40px 1fr 1fr 2fr 160px' }}>
              {/* Icon */}
              <div className={`w-6 h-6 rounded flex items-center justify-center font-mono text-[11px] shrink-0 ${def.color}`}>
                {def.icon}
              </div>
              {/* Event name */}
              <div>
                <div className="text-xs font-medium text-fg">{def.label}</div>
                <div className="font-mono text-[10px] text-fg-4 mt-0.5">{ev.event}</div>
              </div>
              {/* Actor */}
              <div className="text-xs text-fg-2">{actorLabel(meta)}</div>
              {/* Details */}
              <div className="font-mono text-[10px] text-fg-3 leading-relaxed">
                {summary || '—'}
              </div>
              {/* Timestamp */}
              <div className="font-mono text-[10px] text-fg-3 whitespace-nowrap">{fmtDate(ev.created_at)}</div>
            </div>
          )
        })}

        {(!events || events.length === 0) && (
          <div className="px-4 py-10 text-xs text-fg-3 text-center">No activity logged yet</div>
        )}
      </div>

      <div className="mt-3 font-mono text-[11px] text-fg-3">
        {events?.length ?? 0} events
      </div>
    </div>
  )
}
