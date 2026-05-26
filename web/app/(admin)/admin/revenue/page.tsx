export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase/admin'
import { KPI, AdminCard, Progress, LineChart, AdminPageHeader } from '@/components/admin/ui'
import { Calendar, Download } from 'lucide-react'

function fmtMoney(n: number) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0 })
}

export default async function AdminRevenuePage() {
  const db = createAdminClient()

  const now = new Date()
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const in30d = new Date(Date.now() + 30 * 86400000).toISOString()
  const in60d = new Date(Date.now() + 60 * 86400000).toISOString()
  const in90d = new Date(Date.now() + 90 * 86400000).toISOString()

  const [
    { data: activeSubs },
    { data: newSubs30d },
    { count: overdueCount },
    { count: cancelledCount },
    { data: allUsers },
    { data: renewing30d },
    { data: renewing31_60d },
    { data: renewing61_90d },
  ] = await Promise.all([
    db.from('subscriptions').select('price_at_signup, started_at, status').eq('status', 'active'),
    db.from('subscriptions').select('price_at_signup, started_at').gte('started_at', thirtyDaysAgo),
    db.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'overdue'),
    db.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'cancelled'),
    db.from('users').select('country'),
    db.from('subscriptions').select('price_at_signup').eq('status', 'active').lte('renews_at', in30d),
    db.from('subscriptions').select('price_at_signup').eq('status', 'active').gt('renews_at', in30d).lte('renews_at', in60d),
    db.from('subscriptions').select('price_at_signup').eq('status', 'active').gt('renews_at', in60d).lte('renews_at', in90d),
  ])

  // MRR / ARR
  const totalAnnual = activeSubs?.reduce((s, sub) => s + Number(sub.price_at_signup), 0) ?? 0
  const mrr = Math.round(totalAnnual / 12)
  const arr = totalAnnual

  // Net new (30D)
  const netNew30d = newSubs30d?.reduce((s, sub) => s + Number(sub.price_at_signup) / 12, 0) ?? 0

  // MRR growth this calendar month
  const mrrGrowthThisMonth = activeSubs
    ?.filter(s => s.started_at >= thisMonthStart)
    .reduce((s, sub) => s + Number(sub.price_at_signup) / 12, 0) ?? 0

  // Churn rate
  const totalSubs = (activeSubs?.length ?? 0) + (overdueCount ?? 0) + (cancelledCount ?? 0)
  const churnRate = totalSubs ? ((cancelledCount ?? 0) / totalSubs * 100).toFixed(1) : '0.0'

  // Renewal forecast (next 90 days) — real renews_at windows
  const forecast30dAmt  = renewing30d?.reduce((s, sub)   => s + Number(sub.price_at_signup), 0) ?? 0
  const forecast31_60dAmt = renewing31_60d?.reduce((s, sub) => s + Number(sub.price_at_signup), 0) ?? 0
  const forecast61_90dAmt = renewing61_90d?.reduce((s, sub) => s + Number(sub.price_at_signup), 0) ?? 0
  const renewalForecast = forecast30dAmt + forecast31_60dAmt + forecast61_90dAmt

  // MRR chart (12 months)
  const months: Record<string, number> = {}
  const monthLabels: string[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = d.toLocaleString('en-AU', { month: 'short' })
    months[key] = 0
    monthLabels.push(key)
  }
  activeSubs?.forEach(sub => {
    const d = new Date(sub.started_at)
    if ((now.getTime() - d.getTime()) <= 365 * 86400000) {
      const key = d.toLocaleString('en-AU', { month: 'short' })
      if (key in months) months[key] += Number(sub.price_at_signup) / 12
    }
  })
  const chartData = Object.values(months).map(v => ({ v: Math.round(v) }))

  // Geography top 5
  const countryCounts: Record<string, number> = {}
  allUsers?.forEach(u => {
    if (u.country) {
      countryCounts[u.country] = (countryCounts[u.country] ?? 0) + 1
    }
  })
  const totalWithCountry = Object.values(countryCounts).reduce((s, n) => s + n, 0)
  const geoTop5 = Object.entries(countryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([country, count]) => ({
      country,
      count,
      pct: totalWithCountry ? Math.round(count / totalWithCountry * 100) : 0,
    }))

  // Revenue breakdown (30D) — only what the DB can support
  const newSubs30dAmt = Math.round(netNew30d)
  const existingMrr30d = Math.max(0, mrr - newSubs30dAmt)
  const netRevenue = existingMrr30d + newSubs30dAmt
  const breakdownTotal = netRevenue || 1
  const existingMrrPct = Math.round(existingMrr30d / breakdownTotal * 100)
  const newSubsPct = Math.round(newSubs30dAmt / breakdownTotal * 100)

  // Payment failures — total from overdue; no DB breakdown by reason
  const failCount = overdueCount ?? 0
  const failPct = totalSubs ? (failCount / totalSubs * 100).toFixed(1) : '0.0'

  return (
    <div>
      <AdminPageHeader title="Revenue" sub="Lifetime · USD" actions={
        <div className="flex gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-border rounded-sm text-xs text-fg-2">
            <Calendar size={12} /> Last 12 months
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-sky text-on-sky rounded-sm text-xs font-semibold">
            <Download size={12} /> Export to Stripe
          </button>
        </div>
      } />

      {/* Top 5 KPIs */}
      <div className="grid grid-cols-5 gap-3 mb-4">
        <KPI label="MRR"              value={fmtMoney(mrr)}         sub="annual / 12"  accent="#4A9EFF" />
        <KPI label="ARR"              value={fmtMoney(arr)}         sub="run-rate" />
        <KPI label="Net new (30D)"    value={`+${fmtMoney(Math.round(netNew30d))}`} sub={`${newSubs30d?.length ?? 0} paid`} accent="#4ADE80" />
        <KPI label="Churn rate"       value={`${churnRate}%`}       sub="30d net"      accent="#FFB74A" />
        <KPI label="Renewal forecast" value={fmtMoney(renewalForecast)} sub="next 90 days" />
      </div>

      <div className="grid grid-cols-[2fr_1fr] gap-3.5 mb-3.5">
        {/* MRR chart */}
        <AdminCard title="MRR · 12 MONTHS" action={
          <div className="flex items-center gap-3">
            {[{ color: '#4A9EFF', label: 'MRR' }, { color: '#4ADE80', label: 'Renewals' }, { color: '#FF6B6B', label: 'Churn' }].map(l => (
              <span key={l.label} className="flex items-center gap-1 font-mono text-[10px] text-fg-3">
                <span className="w-2 h-2 rounded-full" style={{ background: l.color }} />
                {l.label}
              </span>
            ))}
          </div>
        }>
          <div className="flex items-baseline gap-3 mb-3">
            <span className="font-mono text-3xl font-medium">{fmtMoney(mrr)}</span>
            {mrrGrowthThisMonth > 0 && (
              <span className="text-xs text-ok">+{fmtMoney(Math.round(mrrGrowthThisMonth))} this month</span>
            )}
          </div>
          <LineChart data={chartData} height={180} />
          <div className="flex justify-between mt-2">
            {monthLabels.filter((_, i) => i % 2 === 0).map(l => (
              <span key={l} className="font-mono text-[10px] text-fg-3">{l}</span>
            ))}
          </div>
        </AdminCard>

        {/* Revenue breakdown */}
        <AdminCard title="REVENUE BREAKDOWN · 30D">
          <div className="mb-4">
            <div className="font-mono text-2xl font-medium">{fmtMoney(netRevenue)}</div>
            <div className="font-mono text-[10px] text-fg-3 mt-0.5">NET REVENUE</div>
          </div>
          {[
            { label: 'Existing subscriptions', amount: existingMrr30d, color: '#4A9EFF', pct: existingMrrPct },
            { label: 'New subscriptions',      amount: newSubs30dAmt,  color: '#4ADE80', pct: newSubsPct },
            { label: 'Refunds',                amount: 0,              color: '#FFB74A', pct: 0 },
            { label: 'Failed retries',         amount: 0,              color: '#FF6B6B', pct: 0 },
          ].map(({ label, amount, color, pct }) => (
            <div key={label} className="py-2 border-b border-dashed border-border last:border-0">
              <div className="flex justify-between mb-1.5 text-xs">
                <span className="text-fg-2">{label}</span>
                <span className="font-mono">{fmtMoney(amount)}</span>
              </div>
              <Progress value={pct} color={color} height={4} />
            </div>
          ))}
        </AdminCard>
      </div>

      <div className="grid grid-cols-3 gap-3.5">
        {/* Geography · Top 5 */}
        <AdminCard title="GEOGRAPHY · TOP 5">
          {geoTop5.length > 0 ? geoTop5.map(({ country, count, pct }) => (
            <div key={country} className="py-2 border-b border-dashed border-border last:border-0">
              <div className="flex justify-between mb-1.5 text-xs">
                <span className="text-fg">{country}</span>
                <span className="font-mono text-fg-2">{count.toLocaleString()} · {pct}%</span>
              </div>
              <Progress value={pct} color="#4A9EFF" height={3} />
            </div>
          )) : (
            <div className="text-xs text-fg-3 py-4 text-center">No country data yet</div>
          )}
        </AdminCard>

        {/* Renewal forecast */}
        <AdminCard title="RENEWAL FORECAST · 90D">
          {[
            { window: 'Next 30 days', amount: forecast30dAmt,    accounts: renewing30d?.length ?? 0,    conf: 'high' },
            { window: '31 — 60 days', amount: forecast31_60dAmt, accounts: renewing31_60d?.length ?? 0, conf: 'high' },
            { window: '61 — 90 days', amount: forecast61_90dAmt, accounts: renewing61_90d?.length ?? 0, conf: 'mid'  },
          ].map(({ window, amount, accounts, conf }) => (
            <div key={window} className="py-2.5 border-b border-dashed border-border last:border-0">
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-fg-2">{window}</span>
                <span className="font-mono text-sm font-medium">{fmtMoney(amount)}</span>
              </div>
              <div className="flex justify-between items-center mt-0.5">
                <span className="font-mono text-[10px] text-fg-3">{accounts.toLocaleString()} accounts</span>
                <span className="font-mono text-[10px]" style={{ color: conf === 'high' ? '#4ADE80' : '#FFB74A' }}>
                  CONF {conf.toUpperCase()}
                </span>
              </div>
            </div>
          ))}
        </AdminCard>

        {/* Payment failures */}
        <AdminCard title="PAYMENT FAILURES · 30D">
          <div className="mb-3">
            <div className="font-mono text-4xl font-semibold text-warn">{failCount}</div>
            <div className="font-mono text-[10px] text-fg-3 mt-0.5">{failPct}% OF ATTEMPTS</div>
          </div>
          {failCount === 0 ? (
            <div className="text-xs text-fg-3 py-2 text-center">No payment failures</div>
          ) : (
            <div className="flex justify-between py-2">
              <span className="text-xs text-fg-2">Overdue subscriptions</span>
              <span className="font-mono text-xs text-fg">{failCount}</span>
            </div>
          )}
        </AdminCard>
      </div>
    </div>
  )
}
