export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase/admin'
import { KPI, AdminCard, Badge, Avatar } from '@/components/admin/ui'
import UserActionsClient from '@/components/admin/UserActionsClient'
import { type UserActionsProps } from '@/components/admin/UserActionsClient'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, Mail, Eye, MoreHorizontal } from 'lucide-react'

function fmtDate(s: string | null) {
  if (!s) return '—'
  return new Date(s).toLocaleString('en-AU', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })
}
function fmtDateShort(s: string | null) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })
}
function fmtAge(createdAt: string): string {
  const ms = Date.now() - new Date(createdAt).getTime()
  const days = Math.floor(ms / 86400000)
  const years = Math.floor(days / 365)
  const rem = days % 365
  return years > 0 ? `${years}y ${rem}d` : `${days}d`
}

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = createAdminClient()

  const [
    { data: user },
    { data: sub },
    { data: allSubs },
    { data: recentJumps },
    { count: jumpCount },
    { data: ffData },
    { data: recentTickets },
    { count: flaggedCount },
    { count: totalUsers },
    { data: adminNotes },
    { data: authUserData },
    { data: subEvents },
  ] = await Promise.all([
    db.from('users').select('*, home_dropzone_id').eq('id', id).single(),
    db.from('subscriptions').select('*').eq('user_id', id).order('started_at', { ascending: false }).limit(1).maybeSingle(),
    db.from('subscriptions').select('id, status, plan, price_at_signup, started_at, renews_at, refunded_at, refunded_amount, cancelled_at').eq('user_id', id).order('started_at', { ascending: false }),
    db.from('jumps').select(`
      id, jump_number, date, jump_type, created_at,
      dropzone:dropzones(name, region)
    `).eq('user_id', id).is('deleted_at', null).order('date', { ascending: false }).limit(7),
    db.from('jumps').select('*', { count: 'exact', head: true }).eq('user_id', id).is('deleted_at', null),
    db.from('jumps').select('freefall_seconds').eq('user_id', id).is('deleted_at', null),
    db.from('support_tickets').select('id, subject, status, category, created_at').eq('user_id', id).order('created_at', { ascending: false }).limit(3),
    db.from('flagged_entries').select('*', { count: 'exact', head: true })
      .eq('status', 'open')
      .in('jump_id', (await db.from('jumps').select('id').eq('user_id', id).is('deleted_at', null)).data?.map(j => j.id) ?? []),
    db.from('users').select('*', { count: 'exact', head: true }).lte('created_at', (await db.from('users').select('created_at').eq('id', id).single()).data?.created_at ?? ''),
    db.from('audit_log').select('id, reason, created_at').eq('action', 'admin_note').eq('target', `user:${id}`).order('created_at', { ascending: false }),
    db.auth.admin.getUserById(id),
    db.from('subscription_events').select('id, event, metadata, created_at').eq('user_id', id).order('created_at', { ascending: false }),
  ])

  if (!user) notFound()

  const initials = (user.full_name || user.email).split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase()
  const displayId = (totalUsers ?? 0) > 0 ? `#${totalUsers}` : `#—`

  // Freefall total
  const ffTotalSec = ffData?.reduce((s, j) => s + (j.freefall_seconds ?? 0), 0) ?? 0
  const ffHours = Math.floor(ffTotalSec / 3600)
  const ffMins  = Math.floor((ffTotalSec % 3600) / 60)

  // LTV = number of renewals × price
  const renewalCount = sub ? Math.max(0, Math.floor(
    (Date.now() - new Date(sub.started_at).getTime()) / (365 * 86400000)
  )) : 0
  const ltv = sub ? renewalCount * Number(sub.price_at_signup) + Number(sub.price_at_signup) : 0

  const statusKind: Record<string, 'ok' | 'sky' | 'warn' | 'muted' | 'danger'> = {
    active: 'ok', trial: 'sky', overdue: 'warn', cancelled: 'muted', refunded: 'danger',
  }

  // Free trial detection — respects admin-extended trial_ends_at stored in user_metadata
  const customTrialEnd = authUserData?.user?.user_metadata?.trial_ends_at as string | undefined
  const trialEndDate = customTrialEnd
    ? new Date(customTrialEnd)
    : new Date(new Date(user.created_at).getTime() + 14 * 86400000)
  const inTrial = !sub && Date.now() < trialEndDate.getTime()
  const trialExpired = !sub && Date.now() >= trialEndDate.getTime()
  const trialDaysLeft = Math.max(0, Math.ceil((trialEndDate.getTime() - Date.now()) / 86400000))
  const isCancelledInGrace =
    sub?.status === 'cancelled' &&
    !!sub?.renews_at &&
    new Date(sub.renews_at) > new Date()

  // Build activity feed — subscription events first, then jumps and sign-in
  const activityFeed: { icon: string; text: string; sub: string; time: string; color?: string }[] = []

  // Subscription events from the events log
  const eventLabels: Record<string, { icon: string; text: (m: Record<string, unknown>) => string; subText: (m: Record<string, unknown>) => string; color: string }> = {
    subscribed:                { icon: '$', color: 'bg-ok/10 text-ok',      text: (m) => `Subscribed · ${m.plan ?? 'Pro'} · $${m.price}`,           subText: () => 'New subscription' },
    resubscribed_after_refund: { icon: '↻', color: 'bg-sky/10 text-sky',   text: (m) => `Re-subscribed · ${m.plan ?? 'Pro'} · $${m.price}`,         subText: () => 'After previous refund' },
    cancelled:                 { icon: '✕', color: 'bg-danger/10 text-danger', text: () => 'Subscription cancelled',                                subText: () => '' },
    cancelled_immediately:     { icon: '✕', color: 'bg-danger/10 text-danger', text: () => 'Subscription cancelled immediately',                     subText: () => 'Admin revoked' },
    overdue:                   { icon: '!', color: 'bg-warn/10 text-warn',  text: () => 'Payment overdue',                                           subText: () => '' },
    refunded:                  { icon: '↩', color: 'bg-warn/10 text-warn',  text: (m) => `Refunded · $${Number(m.refunded_amount ?? 0).toFixed(2)}`, subText: () => 'Access revoked' },
    subscription_deleted:      { icon: '✕', color: 'bg-danger/10 text-danger', text: () => 'Stripe subscription deleted',                            subText: () => '' },
  }
  subEvents?.forEach(ev => {
    const meta = (ev.metadata ?? {}) as Record<string, unknown>
    const def = eventLabels[ev.event]
    if (def) {
      activityFeed.push({
        icon: def.icon,
        color: def.color,
        text: def.text(meta),
        sub: def.subText(meta),
        time: fmtDateShort(ev.created_at),
      })
    }
  })

  // Recent jumps
  recentJumps?.forEach(j => {
    activityFeed.push({
      icon: '↓',
      text: `Logged jump #${j.jump_number} (${j.jump_type ?? 'Jump'})`,
      sub: (j.dropzone as unknown as { name: string; region: string } | null)?.name ?? '—',
      time: new Date(j.date).toLocaleDateString('en-AU', { day: '2-digit', month: 'short' }) + ' · ' +
            new Date(j.date).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }),
    })
  })
  if (user.last_sign_in_at) {
    activityFeed.push({
      icon: '→',
      text: `Signed in · ${user.last_sign_in_platform ?? 'web'}`,
      sub: '',
      time: new Date(user.last_sign_in_at).toLocaleDateString('en-AU', { day: '2-digit', month: 'short' }) + ' · ' +
            new Date(user.last_sign_in_at).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }),
    })
  }
  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-fg-3 mb-4">
        <Link href="/admin/users" className="text-fg-2 hover:text-fg">Users</Link>
        <ChevronRight size={11} className="text-fg-4" />
        <span className="font-mono text-fg-2">{displayId}</span>
      </div>

      {/* User hero */}
      <div className="flex items-start gap-4 mb-6">
        <Avatar initials={initials} size={64} />
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-fg">{user.full_name || '—'}</h1>
          <div className="font-mono text-[11px] text-fg-3 mt-1 tracking-wide">
            USER {displayId}
            {user.licence_number && ` · ${user.licence_number}`}
            {user.licence_rating && ` · ${user.licence_rating}`}
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {sub && <Badge kind={statusKind[sub.status] ?? 'muted'}>{sub.status.toUpperCase()}</Badge>}
            {sub?.plan && <Badge kind="sky">{sub.plan.toUpperCase()}</Badge>}
            {isCancelledInGrace && sub?.renews_at && <Badge kind="warn">UNTIL {fmtDateShort(sub.renews_at)}</Badge>}
            {inTrial && <Badge kind="sky">TRIAL · {trialDaysLeft}d left</Badge>}
            {trialExpired && <Badge kind="warn">TRIAL EXPIRED</Badge>}
            {user.country && <Badge kind="muted">{user.country}</Badge>}
          </div>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-border rounded-sm text-xs text-fg-2 font-medium">
            <Mail size={12} /> Email user
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-border rounded-sm text-xs text-fg-2 font-medium">
            <Eye size={12} /> View as user
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-border rounded-sm text-xs text-fg-2 font-medium">
            <MoreHorizontal size={12} /> More
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <KPI label="Jumps logged" value={(jumpCount ?? 0).toLocaleString()} sub="lifetime" trend={flaggedCount ? `▲ +${flaggedCount} flagged` : undefined} />
        <KPI label="Freefall" value={`${ffHours}:${String(ffMins).padStart(2, '0')}`} sub="hours" />
        <KPI label="Account age" value={fmtAge(user.created_at)} sub={`signed up ${new Date(user.created_at).toLocaleDateString('en-AU', { month: 'short', year: '2-digit' })}`} />
        <KPI label="LTV" value={`$${ltv}`} sub={`${renewalCount} renewal${renewalCount !== 1 ? 's' : ''}`} accent="#4ADE80" />
      </div>

      <div className="grid grid-cols-[5fr_3fr] gap-3.5">
        {/* Left column */}
        <div className="flex flex-col gap-3.5">
          {/* Account details */}
          <AdminCard title="ACCOUNT DETAILS">
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              {[
                ['EMAIL',           user.email,                                    true],
                ['FULL NAME',       user.full_name || '—',                         false],
                ['DATE OF BIRTH',   user.date_of_birth ?? '—',                     true],
                ['PHONE',           user.phone ?? '—',                             true],
                ['HOME DZ',         '—',                                           false],
                ['COUNTRY',         user.country ? `${user.country}` : '—',        false],
                ['ACCOUNT CREATED', fmtDate(user.created_at),                      true],
                ['LAST SIGN-IN',    fmtDate(user.last_sign_in_at),                 true],
                ['IP (LAST SEEN)',  user.last_ip ?? '—',                           true],
                ['2FA',             user.two_factor_enabled ? 'Enabled · TOTP' : 'Disabled', false],
              ].map(([k, v, mono]) => (
                <div key={k as string}>
                  <div className="font-mono text-[10px] text-fg-3 tracking-widest uppercase">{k as string}</div>
                  <div className={`text-sm mt-0.5 ${mono ? 'font-mono' : ''}`}>{v as string}</div>
                </div>
              ))}
            </div>
          </AdminCard>

          {/* Activity · last 7 days */}
          <AdminCard title="ACTIVITY · LAST 7 DAYS" action={
            <Link href={`/admin/users/${id}/jumps`} className="font-mono text-[10px] text-sky hover:underline">
              View full log →
            </Link>
          }>
            {activityFeed.length ? activityFeed.map((a, i) => (
              <div key={i} className="flex items-center gap-2.5 py-2.5 border-b border-dashed border-border last:border-0">
                <div className={`w-6 h-6 rounded flex items-center justify-center font-mono text-[11px] shrink-0 ${a.color ?? 'bg-surface-2 text-fg-3'}`}>
                  {a.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-fg">{a.text}</div>
                  {a.sub && <div className="font-mono text-[10px] text-fg-3 mt-0.5">{a.sub}</div>}
                </div>
                <span className="font-mono text-[10px] text-fg-3 whitespace-nowrap shrink-0">{a.time}</span>
              </div>
            )) : <div className="text-xs text-fg-3 py-2">No recent activity</div>}
          </AdminCard>

          {/* Support tickets */}
          {recentTickets && recentTickets.length > 0 && (
            <AdminCard title="SUPPORT TICKETS">
              {recentTickets.map(t => (
                <div key={t.id} className="flex items-center gap-2.5 py-2 border-b border-dashed border-border last:border-0">
                  <div className="flex-1">
                    <div className="text-xs font-medium">{t.subject}</div>
                    <div className="font-mono text-[10px] text-fg-3 mt-0.5">{t.category} · {fmtDateShort(t.created_at)}</div>
                  </div>
                  <Badge kind={t.status === 'open' ? 'sky' : t.status === 'waiting' ? 'warn' : 'muted'}>
                    {t.status.toUpperCase()}
                  </Badge>
                </div>
              ))}
            </AdminCard>
          )}
        </div>

        {/* Right column */}
        <UserActionsClient
          userId={id}
          userEmail={user.email}
          sub={sub as UserActionsProps['sub']}
          inTrial={inTrial}
          trialDaysLeft={trialDaysLeft}
          trialEndDateIso={trialEndDate.toISOString()}
          userCreatedAt={user.created_at}
          notes={(adminNotes ?? []) as { id: string; reason: string; created_at: string }[]}
          customTrialEndsAt={customTrialEnd ?? null}
        />

        {/* Subscription history — shown when user has multiple subs (e.g. re-subscribed after refund) */}
        {(allSubs?.length ?? 0) > 1 && (
          <AdminCard title="Subscription history">
            <div className="space-y-2">
              {allSubs!.map((s, i) => (
                <div key={s.id} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                  <div>
                    <div className="text-xs font-medium text-fg">{s.plan ?? 'Pro'} · ${Number(s.price_at_signup).toFixed(2)}</div>
                    <div className="font-mono text-[10px] text-fg-3 mt-0.5">
                      {fmtDateShort(s.started_at)}{s.renews_at ? ` → ${fmtDateShort(s.renews_at)}` : ''}
                    </div>
                    {s.refunded_at && (
                      <div className="font-mono text-[10px] text-warn mt-0.5">
                        Refunded ${Number(s.refunded_amount ?? s.price_at_signup).toFixed(2)} · {fmtDateShort(s.refunded_at)}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {i === 0 && <span className="font-mono text-[9px] text-fg-4 uppercase">latest</span>}
                    <Badge kind={statusKind[s.status] ?? 'muted'}>{s.status.toUpperCase()}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </AdminCard>
        )}
      </div>
    </div>
  )
}
