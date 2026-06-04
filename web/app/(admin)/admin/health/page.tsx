export const dynamic = 'force-dynamic'

import { AdminPageHeader, Badge } from '@/components/admin/ui'
import type { HealthResponse, ServiceHealth } from '@/app/api/admin/health/route'

async function fetchHealth(): Promise<HealthResponse | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL
      ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
    const res = await fetch(`${baseUrl}/api/admin/health`, { cache: 'no-store' })
    return res.json()
  } catch {
    return null
  }
}

function statusBadge(s: ServiceHealth['status']) {
  if (s === 'ok') return <Badge kind="ok">● OK</Badge>
  if (s === 'degraded') return <Badge kind="warn">● DEGRADED</Badge>
  return <Badge kind="danger">● DOWN</Badge>
}

export default async function AdminHealthPage() {
  const health = await fetchHealth()

  return (
    <div>
      <AdminPageHeader
        title="System Health"
        sub={health ? `Last checked ${new Date(health.checkedAt).toLocaleTimeString()}` : 'Unable to reach health endpoint'}
      />

      {!health ? (
        <div className="bg-surface border border-border rounded-md p-8 text-center text-fg-3 text-sm">
          Could not fetch health status.
        </div>
      ) : (
        <>
          {/* Overall status banner */}
          <div className={`rounded-md px-5 py-4 mb-5 border flex items-center gap-3 ${
            health.ok
              ? 'bg-ok/5 border-ok/20'
              : 'bg-danger/5 border-danger/20'
          }`}>
            <span className={`text-2xl ${health.ok ? 'text-ok' : 'text-danger'}`}>
              {health.ok ? '●' : '▲'}
            </span>
            <div>
              <p className={`font-semibold text-sm ${health.ok ? 'text-ok' : 'text-danger'}`}>
                {health.ok ? 'ALL SYSTEMS OPERATIONAL' : 'INCIDENT DETECTED'}
              </p>
              <p className="text-xs text-fg-3 mt-0.5">
                {health.ok
                  ? 'Supabase, Stripe, and Resend are all responding normally.'
                  : `${health.services.filter(s => s.status !== 'ok').map(s => s.name).join(', ')} ${health.services.filter(s => s.status !== 'ok').length === 1 ? 'is' : 'are'} not responding normally.`}
              </p>
            </div>
          </div>

          {/* Per-service rows */}
          <div className="bg-surface border border-border rounded-md overflow-hidden mb-6">
            <div className="grid px-5 py-2 border-b border-border text-[10px] font-mono text-fg-3 tracking-widest uppercase"
              style={{ gridTemplateColumns: '180px 100px 80px 1fr' }}>
              {['Service', 'Status', 'Latency', 'Detail'].map(h => <span key={h}>{h}</span>)}
            </div>
            {health.services.map(s => (
              <div key={s.name}
                className="grid px-5 py-4 items-center border-b border-dashed border-border last:border-0"
                style={{ gridTemplateColumns: '180px 100px 80px 1fr' }}>
                <span className="text-sm font-semibold text-fg">{s.name}</span>
                <span>{statusBadge(s.status)}</span>
                <span className="font-mono text-xs text-fg-3">{s.latencyMs}ms</span>
                <span className={`text-xs ${s.status === 'ok' ? 'text-fg-3' : 'text-danger'}`}>{s.detail}</span>
              </div>
            ))}
          </div>

          {/* What each service does */}
          <div className="bg-surface border border-border rounded-md overflow-hidden">
            <div className="px-5 py-3 border-b border-border">
              <p className="font-mono text-[10px] text-fg-3 tracking-widest uppercase">What we check</p>
            </div>
            {[
              { name: 'Supabase (DB)', what: 'Runs a COUNT query against the users table. If this is down, logins and all data reads/writes will fail.' },
              { name: 'Stripe', what: 'Hits the /v1/balance endpoint. If this is down, new subscriptions and webhook processing will fail.' },
              { name: 'Resend', what: 'Hits the /domains endpoint. If this is down, transactional emails (support confirmations, waitlist) will not send.' },
            ].map(({ name, what }) => (
              <div key={name} className="px-5 py-3 border-b border-dashed border-border last:border-0">
                <p className="text-xs font-semibold text-fg mb-0.5">{name}</p>
                <p className="text-xs text-fg-3">{what}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
