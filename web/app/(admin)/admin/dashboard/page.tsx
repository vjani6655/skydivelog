export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase/admin'
import { KPI, AdminCard, LineChart, AdminPageHeader } from '@/components/admin/ui'
import { Download, Calendar } from 'lucide-react'
import Link from 'next/link'
import ResetRevenueButton from '@/components/admin/ResetRevenueButton'
import RefreshButton from '@/components/admin/RefreshButton'
import CleanupDropzonesButton from '@/components/admin/CleanupDropzonesButton'
import type { HealthResponse } from '@/app/api/admin/health/route'

async function getHealth(): Promise<HealthResponse | null> {
  try {
    const base = process.env.NEXT_PUBLIC_SITE_URL
      ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
    const res = await fetch(`${base}/api/admin/health`, { cache: 'no-store' })
    return res.json()
  } catch {
    return null
  }
}

function fmt(n: number): string {
  return n >= 1_000_000
    ? (n / 1_000_000).toFixed(1) + 'M'
    : n >= 1_000
    ? n.toLocaleString()
    : String(n)
}

function fmtMoney(n: number) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0 })
}

function timeAgo(s: string | null): string {
  if (!s) return ''
  const diff = Date.now() - new Date(s).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default async function AdminDashboardPage() {
  const db = createAdminClient()

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString()
  const sixtyDaysAgo  = new Date(Date.now() - 60 * 86400000).toISOString()

  const [
    health,
    { count: totalUsers },
    { count: activeSubsCount },
    { count: overdueCount },
    { count: totalJumps },
    { count: totalDZs },
    { count: totalAircraft },
    { count: totalCerts },
    { count: openFlagsCount },
    { count: openTicketsCount },
    { count: bugTicketsCount },
    { data: activeSubs },
    { data: cancelledInPeriod },
    { data: signups30d },
    { data: signupsPrior30d },
    { data: jumpStats },
    { data: recentUsers },
    { data: recentJumps },
    { data: recentPayments },
    { data: recentCancellations },
  ] = await Promise.all([
    getHealth(),
    db.from('users').select('*', { count: 'exact', head: true }),
    db.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    db.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'overdue'),
    db.from('jumps').select('*', { count: 'exact', head: true }).is('deleted_at', null),
    db.from('dropzones').select('*', { count: 'exact', head: true }),
    db.from('aircraft').select('*', { count: 'exact', head: true }),
    db.from('certificates').select('*', { count: 'exact', head: true }),
    db.from('flagged_entries').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    db.from('support_tickets').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    db.from('support_tickets').select('*', { count: 'exact', head: true }).eq('category', 'bug').eq('status', 'open'),
    db.from('subscriptions').select('price_at_signup').eq('status', 'active'),
    db.from('subscriptions').select('price_at_signup').eq('status', 'cancelled').gt('renews_at', new Date().toISOString()).is('refunded_at', null),
    db.from('users').select('created_at').gte('created_at', thirtyDaysAgo),
    db.from('users').select('created_at').gte('created_at', sixtyDaysAgo).lt('created_at', thirtyDaysAgo),
    db.from('jumps').select('freefall_seconds').is('deleted_at', null),
    db.from('users').select('id, email, full_name, created_at').order('created_at', { ascending: false }).limit(3),
    db.from('jumps').select('user_id, jump_number, jump_type, created_at, users(email, full_name)').is('deleted_at', null).order('created_at', { ascending: false }).limit(3),
    db.from('subscriptions').select('price_at_signup, started_at, users(email)').eq('status', 'active').order('started_at', { ascending: false }).limit(3),
    db.from('subscriptions').select('cancelled_at, price_at_signup, users(email, full_name)').eq('status', 'cancelled').not('cancelled_at', 'is', null).order('cancelled_at', { ascending: false }).limit(3),
  ])

  // MRR / ARR — includes cancelled subs still within their paid period (not refunded)
  const billableSubs = [...(activeSubs ?? []), ...(cancelledInPeriod ?? [])]
  const totalAnnual = billableSubs.reduce((s, sub) => s + Number(sub.price_at_signup), 0)
  const mrr = Math.round(totalAnnual / 12)
  const arr = totalAnnual

  // Churn rate
  const churnRate = totalUsers ? ((overdueCount ?? 0) / (totalUsers ?? 1) * 100).toFixed(1) : '0.0'

  // Sign-up chart (30d daily buckets)
  const dayCounts: Record<string, number> = {}
  const now = new Date()
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i)
    dayCounts[d.toISOString().slice(0, 10)] = 0
  }
  signups30d?.forEach(u => {
    const day = (u.created_at as string).slice(0, 10)
    if (day in dayCounts) dayCounts[day]++
  })
  const chartData = Object.values(dayCounts).map(v => ({ v }))

  const prior30 = signupsPrior30d?.length ?? 0
  const current30 = signups30d?.length ?? 0
  const signupDelta = prior30 ? Math.round((current30 - prior30) / prior30 * 100) : 0

  // Freefall hours
  const ffTotal = jumpStats?.reduce((sum, j) => sum + (j.freefall_seconds ?? 0), 0) ?? 0
  const ffHours = Math.floor(ffTotal / 3600)

  // Live activity feed
  const activities: { icon: string; color: string; text: string; sub: string; sub2?: string; time: string; rawMs: number }[] = []
  recentUsers?.forEach(u => {
    activities.push({
      icon: '+', color: 'bg-ok/10 text-ok',
      text: 'New signup', sub: u.email,
      time: timeAgo(u.created_at),
      rawMs: new Date(u.created_at).getTime(),
    })
  })
  recentJumps?.forEach(j => {
    const jumpUser = (Array.isArray(j.users) ? j.users[0] : j.users) as { email: string; full_name: string | null } | null
    const nameEmail = [jumpUser?.full_name, jumpUser?.email].filter(Boolean).join(' · ')
    activities.push({
      icon: 'J', color: 'bg-surface-2 text-fg-2',
      text: `Jump #${j.jump_number} logged`,
      sub: nameEmail,
      sub2: j.jump_type ?? 'Jump',
      time: timeAgo(j.created_at),
      rawMs: new Date(j.created_at).getTime(),
    })
  })
  recentPayments?.forEach(p => {
    const user = (Array.isArray(p.users) ? p.users[0] : p.users) as { email: string } | null
    activities.push({
      icon: '$', color: 'bg-ok/10 text-ok',
      text: `Payment received · $${Number(p.price_at_signup).toFixed(0)}/yr`,
      sub: user?.email ?? '',
      time: timeAgo(p.started_at),
      rawMs: new Date(p.started_at).getTime(),
    })
  })
  recentCancellations?.forEach(c => {
    const user = (Array.isArray(c.users) ? c.users[0] : c.users) as { email: string; full_name: string | null } | null
    const nameEmail = [user?.full_name, user?.email].filter(Boolean).join(' · ')
    activities.push({
      icon: '✕', color: 'bg-danger/10 text-danger',
      text: `Subscription cancelled`,
      sub: nameEmail,
      time: timeAgo(c.cancelled_at as string),
      rawMs: new Date(c.cancelled_at as string).getTime(),
    })
  })
  activities.sort((a, b) => b.rawMs - a.rawMs)

  return (
    <div>
      <AdminPageHeader title="Dashboard" sub="Overview · 24h" actions={
        <div className="flex gap-2">
          <ResetRevenueButton />
          <CleanupDropzonesButton />
          <RefreshButton />
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-border rounded-sm text-xs text-fg-2 font-medium">
            <Calendar size={12} /> Last 30 days
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-sky text-on-sky rounded-sm text-xs font-semibold">
            <Download size={12} /> Export
          </button>
        </div>
      } />

      {/* Top 5 KPIs */}
      <div className="grid grid-cols-5 gap-3 mb-4">
        <KPI label="Total users"
          value={fmt(totalUsers ?? 0)}
          sub={`${(totalUsers ?? 0).toLocaleString()} accounts`}
          trend={`▲ +${fmt(current30)} / 30D`} />
        <KPI label="Active subs"
          value={fmt(activeSubsCount ?? 0)}
          sub={totalUsers ? `${Math.round((activeSubsCount ?? 0) / totalUsers * 100)}%` : '—'} />
        <KPI label="MRR"
          value={fmtMoney(mrr)}
          sub="annual ÷ 12"
          accent="#4A9EFF"
          tooltip="Monthly Recurring Revenue: annual subscription value normalized to a monthly figure (ARR ÷ 12). All plans are billed annually." />
        <KPI label="ARR"
          value={fmtMoney(arr)}
          sub="run-rate"
          tooltip="Annual Recurring Revenue: total value of all active subscriptions over a 12-month period." />
        <KPI label="Churn 30D"
          value={`${churnRate}%`}
          sub="net"
          accent="#FFB74A" />
      </div>

      <div className="grid grid-cols-[2fr_1fr] gap-3.5 mb-3.5">
        {/* Sign-up chart */}
        <AdminCard title="NEW SIGN-UPS · LAST 30 DAYS" action={
          <div className="flex gap-0.5">
            {['7D', '30D', '90D'].map((t, i) => (
              <button key={t} className={`font-mono text-[10px] px-2 py-1 rounded-sm transition-colors ${i === 1 ? 'bg-sky/20 text-sky' : 'text-fg-3 hover:text-fg-2'}`}>{t}</button>
            ))}
          </div>
        }>
          <div className="flex items-baseline gap-3 mb-2">
            <span className="font-mono text-3xl font-medium">{fmt(current30)}</span>
            <span className="text-xs text-ok">{signupDelta >= 0 ? '+' : ''}{signupDelta}% vs. prior 30D</span>
          </div>
          <LineChart data={chartData} height={160} />
        </AdminCard>

        {/* Live activity */}
        <AdminCard title="LIVE ACTIVITY" action={
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-ok" />
            <span className="font-mono text-[10px] text-ok">LIVE</span>
          </span>
        }>
          <div>
            {activities.slice(0, 6).map((a, i) => (
              <div key={i} className="flex items-start gap-2.5 py-2 border-b border-border last:border-0">
                <div className={`w-6 h-6 rounded font-mono text-[11px] font-semibold flex items-center justify-center shrink-0 mt-0.5 ${a.color}`}>
                  {a.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-fg leading-tight">{a.text}</div>
                  <div className="font-mono text-[10px] text-fg-3 truncate mt-0.5">{a.sub}</div>
                  {a.sub2 && <div className="font-mono text-[10px] text-fg-4 truncate">{a.sub2}</div>}
                </div>
                <span className="font-mono text-[10px] text-fg-3 whitespace-nowrap shrink-0">{a.time}</span>
              </div>
            ))}
            {activities.length === 0 && (
              <div className="py-4 text-xs text-fg-3 text-center">No recent activity</div>
            )}
          </div>
        </AdminCard>
      </div>

      <div className="grid grid-cols-3 gap-3.5">
        {/* Platform totals */}
        <AdminCard title="PLATFORM TOTALS">
          {[
            { label: 'Jumps logged',      value: fmt(totalJumps ?? 0),   href: '/admin/platform' },
            { label: 'Hours of freefall', value: fmt(ffHours),            href: '/admin/platform' },
            { label: 'Dropzones tracked', value: fmt(totalDZs ?? 0),      href: '/admin/platform/dropzones' },
            { label: 'Aircraft tracked',  value: fmt(totalAircraft ?? 0), href: '/admin/platform/aircraft' },
            { label: 'Certs registered',  value: fmt(totalCerts ?? 0),    href: '/admin/platform/certs' },
          ].map(({ label, value, href }) => (
            <Link key={label} href={href} className="flex justify-between items-center py-2 border-b border-dashed border-border last:border-0 hover:bg-surface-2 -mx-4 px-4 transition-colors group">
              <span className="text-xs text-fg-2 group-hover:text-fg transition-colors">{label}</span>
              <div className="flex items-center gap-2">
                <div className="font-mono text-sm font-medium">{value}</div>
                <span className="font-mono text-[10px] text-fg-4 group-hover:text-fg-3">→</span>
              </div>
            </Link>
          ))}
        </AdminCard>

        {/* System health */}
        <AdminCard title="SYSTEM HEALTH" action={
          <Link href="/admin/health" className="font-mono text-[10px] text-sky hover:underline">VIEW ALL →</Link>
        }>
          {!health ? (
            <div className="py-4 text-xs text-danger text-center">Health check failed</div>
          ) : health.ok ? (
            <div className="py-6 flex flex-col items-center gap-1.5">
              <span className="font-mono text-[10px] text-ok">● ALL SYSTEMS OPERATIONAL</span>
              <span className="text-xs text-fg-3">Supabase · Stripe · Resend</span>
            </div>
          ) : (
            health.services.map(s => (
              <Link key={s.name} href="/admin/health"
                className="flex justify-between items-center py-2.5 border-b border-dashed border-border last:border-0 hover:bg-surface-2 -mx-4 px-4 transition-colors">
                <span className="text-xs text-fg-2">{s.name}</span>
                <span className={`font-mono text-[10px] font-semibold ${
                  s.status === 'ok' ? 'text-ok' : s.status === 'degraded' ? 'text-warn' : 'text-danger'
                }`}>
                  ● {s.status.toUpperCase()}
                </span>
              </Link>
            ))
          )}
        </AdminCard>

        {/* Queue: needs human */}
        <AdminCard title="QUEUE · NEEDS HUMAN">
          {[
            { label: 'Flagged entries',               value: openFlagsCount ?? 0,  href: '/admin/flagged',               color: 'text-warn' },
            { label: 'Support tickets · open',        value: openTicketsCount ?? 0, href: '/admin/support',              color: 'text-sky' },
            { label: 'User-reported bugs',            value: bugTicketsCount ?? 0, href: '/admin/support',               color: 'text-danger' },
          ].map(({ label, value, href, color }) => (
            <Link key={label} href={href}
              className="flex justify-between items-center py-2.5 border-b border-dashed border-border last:border-0 hover:bg-surface-2 -mx-4 px-4 transition-colors">
              <span className="text-xs text-fg-2">{label}</span>
              <span className={`font-mono text-lg font-semibold ${color}`}>{value}</span>
            </Link>
          ))}
        </AdminCard>
      </div>
    </div>
  )
}
