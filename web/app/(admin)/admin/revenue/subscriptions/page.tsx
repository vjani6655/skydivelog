export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase/admin'
import { Badge, AdminPageHeader } from '@/components/admin/ui'
import Link from 'next/link'
import { RefreshCw } from 'lucide-react'

function fmtDate(s: string | null) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default async function AdminSubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>
}) {
  const { status = 'all', q = '' } = await searchParams
  const db = createAdminClient()

  const [
    { data: subs, count: total },
    { count: activeCount },
    { count: trialCount },
    { count: overdueCount },
    { count: cancelledCount },
  ] = await Promise.all([
    db.from('subscriptions')
      .select(`
        id, stripe_subscription_id, status, plan, price_at_signup, started_at, renews_at,
        payment_method_brand, payment_method_last4,
        user:users ( id, full_name, email )
      `, { count: 'exact' })
      .order('started_at', { ascending: false })
      .limit(50),
    db.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    db.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'trial'),
    db.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'overdue'),
    db.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'cancelled'),
  ])

  // Build user display ID mapping
  const userCreatedAtMap: Record<string, string> = {}
  const { count: totalUsers } = await db.from('users').select('*', { count: 'exact', head: true })

  type SubRow = {
    id: string; stripe_subscription_id: string; status: string; price_at_signup: number;
    started_at: string; renews_at: string | null; payment_method_brand: string; payment_method_last4: string;
    user: { id: string; full_name: string; email: string } | null
  }

  const statusKind: Record<string, 'ok' | 'sky' | 'warn' | 'muted' | 'danger'> = {
    active: 'ok', trial: 'sky', overdue: 'warn', cancelled: 'muted',
  }

  const rows = (subs as unknown as SubRow[] ?? []).map((s, i) => ({
    id:      s.id,
    sub:     s.stripe_subscription_id,
    uid:     s.user?.id ?? '',
    userId:  `#${(totalUsers ?? 0) - i}`,
    name:    s.user?.full_name || s.user?.email?.split('@')[0] || '—',
    status:  s.status,
    price:   `$${s.price_at_signup}/yr`,
    started: fmtDate(s.started_at),
    next:    s.status === 'trial'
      ? `Trial ends ${fmtDate(s.renews_at)}`
      : s.renews_at
      ? fmtDate(s.renews_at)
      : '—',
    method:  s.payment_method_brand && s.payment_method_last4
      ? `${s.payment_method_brand} •••• ${s.payment_method_last4}`
      : '—',
  }))

  const FILTER_TABS = [
    { label: 'All',       value: 'all',       count: total ?? 0 },
    { label: 'Active',    value: 'active',    count: activeCount ?? 0 },
    { label: 'Trial',     value: 'trial',     count: trialCount ?? 0 },
    { label: 'Overdue',   value: 'overdue',   count: overdueCount ?? 0 },
    { label: 'Cancelled', value: 'cancelled', count: cancelledCount ?? 0 },
  ]

  const COL_WIDTHS = '160px 80px 1.4fr 110px 90px 110px 130px 1.2fr'

  return (
    <div>
      <AdminPageHeader
        title="Subscriptions"
        sub={`Stripe-backed · ${(activeCount ?? 0).toLocaleString()} active`}
        actions={
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-border rounded-sm text-xs text-fg-2 font-medium">
            <RefreshCw size={12} /> Sync from Stripe
          </button>
        }
      />

      {/* Search + filter tabs */}
      <div className="flex gap-2 items-center mb-3.5 flex-wrap">
        <form method="GET" className="h-9 flex-1 min-w-60 bg-surface border border-border rounded-md flex items-center px-2.5 gap-2">
          <svg className="w-3.5 h-3.5 text-fg-3 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="6" cy="6" r="4"/><path d="m14 14-3.5-3.5"/>
          </svg>
          <input name="q" defaultValue={q}
            placeholder="Search by sub ID, user, email…"
            className="bg-transparent text-xs text-fg placeholder:text-fg-3 outline-none flex-1" />
          <input type="hidden" name="status" value={status} />
        </form>

        <div className="flex items-center gap-1.5 bg-surface border border-border rounded-md p-1">
          {FILTER_TABS.map(t => (
            <Link
              key={t.value}
              href={`/admin/revenue/subscriptions?status=${t.value}${q ? `&q=${q}` : ''}`}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1.5
                ${status === t.value
                  ? 'bg-sky/10 text-sky'
                  : 'text-fg-2 hover:text-fg'}`}
            >
              {t.label}
              <span className="font-mono text-[10px] text-fg-3">{t.count.toLocaleString()}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface border border-border rounded-md overflow-hidden">
        {/* Header */}
        <div className="grid px-4 py-3 border-b border-border gap-3"
          style={{ gridTemplateColumns: COL_WIDTHS }}>
          {['SUB. ID', 'USER', 'NAME', 'STATUS', 'PRICE', 'STARTED', 'NEXT', 'METHOD'].map(h => (
            <span key={h} className="font-mono text-[10px] text-fg-3 tracking-widest uppercase truncate">{h}</span>
          ))}
        </div>

        {/* Rows */}
        {rows.map(row => (
          <Link
            key={row.id}
            href={`/admin/revenue/subscriptions/${row.id}/override`}
            className="grid px-4 py-3 gap-3 items-center border-b border-border last:border-0 hover:bg-surface-2 transition-colors text-sm"
            style={{ gridTemplateColumns: COL_WIDTHS }}
          >
            <span className="font-mono text-[11px] text-fg-3 truncate">{row.sub}</span>
            <span className="font-mono text-xs text-fg-2">{row.userId}</span>
            <span className="font-medium text-fg truncate">{row.name}</span>
            <span><Badge kind={statusKind[row.status] ?? 'muted'}>{row.status.toUpperCase()}</Badge></span>
            <span className="font-mono text-xs">{row.price}</span>
            <span className="font-mono text-xs text-fg-2">{row.started}</span>
            <span className="font-mono text-xs text-fg-2">{row.next}</span>
            <span className="font-mono text-[11px] text-fg-3 truncate">{row.method}</span>
          </Link>
        ))}

        {rows.length === 0 && (
          <div className="px-4 py-8 text-xs text-fg-3 text-center">No subscriptions found</div>
        )}
      </div>

      <div className="mt-3 font-mono text-[11px] text-fg-3">
        Showing {rows.length} of {(total ?? 0).toLocaleString()}
      </div>
    </div>
  )
}
