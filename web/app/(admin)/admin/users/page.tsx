export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase/admin'
import { Badge, AdminPageHeader } from '@/components/admin/ui'
import { UserSearchInput } from '@/components/admin/UserSearchInput'
import { Download } from 'lucide-react'
import Link from 'next/link'

function fmtDateShort(s: string | null) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: '2-digit' })
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; sort?: string }>
}) {
  const { status = 'all', q = '', sort = 'seen' } = await searchParams
  const db = createAdminClient()

  const trialCutoff = new Date()
  trialCutoff.setDate(trialCutoff.getDate() - 14)

  // Fetch all subscription rows with started_at — derive per-user effective status from most recent sub
  const { data: allSubs } = await db.from('subscriptions').select('user_id, status, started_at')

  // Per user: keep only the most recently started subscription.
  // When started_at is tied, prefer active > overdue > cancelled as the effective status.
  const statusPriority: Record<string, number> = { active: 0, overdue: 1, cancelled: 2 }
  const bestSubStatus: Record<string, string> = {}
  const bestSubStarted: Record<string, string> = {}
  for (const s of allSubs ?? []) {
    const existing = bestSubStarted[s.user_id]
    const isSameDate = existing && s.started_at === existing
    const isBetter = !existing
      || new Date(s.started_at) > new Date(existing)
      || (isSameDate && (statusPriority[s.status] ?? 99) < (statusPriority[bestSubStatus[s.user_id]] ?? 99))
    if (isBetter) {
      bestSubStatus[s.user_id] = s.status
      bestSubStarted[s.user_id] = s.started_at
    }
  }
  const subscribedUserIds = Object.keys(bestSubStatus)
  const activeIds    = Object.entries(bestSubStatus).filter(([, s]) => s === 'active').map(([id]) => id)
  const overdueIds   = Object.entries(bestSubStatus).filter(([, s]) => s === 'overdue').map(([id]) => id)
  const cancelledIds = Object.entries(bestSubStatus).filter(([, s]) => s === 'cancelled').map(([id]) => id)

  // Counts derived from per-user effective status (not raw subscription row counts)
  const activeCount   = activeIds.length
  const overdueCount  = overdueIds.length
  const cancelledCount = cancelledIds.length

  // Trial count = users without any subscription created within the last 14 days
  let trialCountQuery = db.from('users').select('*', { count: 'exact', head: true }).gte('created_at', trialCutoff.toISOString())
  if (subscribedUserIds.length > 0) trialCountQuery = trialCountQuery.not('id', 'in', `(${subscribedUserIds.join(',')})`)
  const { count: trialCount } = await trialCountQuery

  // Expired count = users without any subscription created more than 14 days ago
  let expiredCountQuery = db.from('users').select('*', { count: 'exact', head: true }).lt('created_at', trialCutoff.toISOString())
  if (subscribedUserIds.length > 0) expiredCountQuery = expiredCountQuery.not('id', 'in', `(${subscribedUserIds.join(',')})`)
  const { count: expiredCount } = await expiredCountQuery

  const { count: totalCount } = await db.from('users').select('*', { count: 'exact', head: true })

  // Determine which user IDs to include based on the active filter tab
  let filterIds: string[] | null = null
  if (status === 'active') {
    filterIds = activeIds
  } else if (status === 'overdue') {
    filterIds = overdueIds
  } else if (status === 'cancelled') {
    filterIds = cancelledIds
  } else if (status === 'trial') {
    // Users without a subscription who signed up within the last 14 days
    let tq = db.from('users').select('id').gte('created_at', trialCutoff.toISOString())
    if (subscribedUserIds.length > 0) tq = tq.not('id', 'in', `(${subscribedUserIds.join(',')})`)
    const { data: tUsers } = await tq
    filterIds = tUsers?.map(u => u.id) ?? []
  } else if (status === 'expired') {
    // Users without any subscription whose trial period has passed (created >14 days ago)
    let eq = db.from('users').select('id').lt('created_at', trialCutoff.toISOString())
    if (subscribedUserIds.length > 0) eq = eq.not('id', 'in', `(${subscribedUserIds.join(',')})`)
    const { data: eUsers } = await eq
    filterIds = eUsers?.map(u => u.id) ?? []
  }

  let usersQuery = db
    .from('users')
    .select(`
      id, email, full_name, licence_number, licence_rating,
      created_at, last_sign_in_at,
      subscriptions ( status, renews_at, price_at_signup, started_at )
    `)
    .order(
      sort === 'seen' ? 'last_sign_in_at' : sort === 'name' ? 'full_name' : 'created_at',
      { ascending: sort === 'name', nullsFirst: false }
    )
    .limit(50)

  if (q) usersQuery = usersQuery.or(`email.ilike.%${q}%,full_name.ilike.%${q}%,licence_number.ilike.%${q}%`)

  // Apply filter tab
  if (filterIds !== null) {
    usersQuery = filterIds.length > 0
      ? usersQuery.in('id', filterIds)
      : usersQuery.in('id', ['00000000-0000-0000-0000-000000000000'])
  }

  const { data: users } = await usersQuery

  // Fetch all user IDs in signup order to derive stable #IDs (same as detail page)
  const { data: allUserMeta } = await db
    .from('users')
    .select('id')
    .order('created_at', { ascending: true })
  const signupRankMap: Record<string, number> = {}
  allUserMeta?.forEach((u, i) => { signupRankMap[u.id] = i + 1 })

  // Fetch auth user_metadata for the current page of users to respect admin-extended trial dates
  const userIds2 = users?.map(u => u.id) ?? []
  const trialEndsAtMap: Record<string, string | undefined> = {}
  if (userIds2.length > 0) {
    await Promise.all(userIds2.map(async (uid) => {
      const { data } = await db.auth.admin.getUserById(uid)
      const ext = data?.user?.user_metadata?.trial_ends_at as string | undefined
      if (ext) trialEndsAtMap[uid] = ext
    }))
  }

  const userIds = users?.map(u => u.id) ?? []
  const { data: jumpCounts } = await db
    .from('jumps')
    .select('user_id')
    .in('user_id', userIds)
    .is('deleted_at', null)

  const jumpMap: Record<string, number> = {}
  jumpCounts?.forEach(j => { jumpMap[j.user_id] = (jumpMap[j.user_id] ?? 0) + 1 })

  type Sub = { status: string; renews_at: string | null; price_at_signup: number; started_at: string }
  const rows = (users ?? []).map((u) => {
    // Pick the most recently started subscription to reflect current status
    const allUserSubs: Sub[] = Array.isArray(u.subscriptions) ? u.subscriptions as Sub[] : (u.subscriptions ? [u.subscriptions as Sub] : [])
    const sub = allUserSubs.sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())[0] ?? null
    const customTrialEnd = trialEndsAtMap[u.id]
    const trialEnd = customTrialEnd
      ? new Date(customTrialEnd)
      : new Date(new Date(u.created_at).getTime() + 14 * 86400000)
    const inTrial = !sub && Date.now() < trialEnd.getTime()
    const trialExpired = !sub && Date.now() >= trialEnd.getTime()
    const trialDaysLeft = Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / 86400000))
    const displayId = signupRankMap[u.id] ?? '?'
    return {
      id:        u.id,
      displayId: `#${displayId}`,
      name:      u.full_name || u.email.split('@')[0],
      email:     u.email,
      licence:   u.licence_number ?? '—',
      status:    inTrial ? 'free-trial' : trialExpired ? 'expired' : (sub?.status ?? 'none'),
      statusLabel: inTrial ? `TRIAL · ${trialDaysLeft}d` : trialExpired ? 'EXPIRED' : (sub?.status ?? 'none').toUpperCase(),
      jumps:     jumpMap[u.id] ?? 0,
      renew:     sub?.renews_at
        ? fmtDateShort(sub.renews_at)
        : inTrial
        ? fmtDateShort(trialEnd.toISOString())
        : '—',
      seen:      fmtDateShort(u.last_sign_in_at),
    }
  })

  const FILTER_TABS = [
    { label: 'All',       value: 'all',       count: totalCount ?? 0 },
    { label: 'Active',    value: 'active',    count: activeCount ?? 0 },
    { label: 'Trial',     value: 'trial',     count: trialCount ?? 0 },
    { label: 'Expired',   value: 'expired',   count: expiredCount ?? 0 },
    { label: 'Overdue',   value: 'overdue',   count: overdueCount ?? 0 },
    { label: 'Cancelled', value: 'cancelled', count: cancelledCount ?? 0 },
  ]

  const kindMap: Record<string, 'ok' | 'sky' | 'warn' | 'danger' | 'muted'> = {
    active: 'ok', trial: 'sky', 'free-trial': 'sky', overdue: 'warn', expired: 'warn', cancelled: 'muted', none: 'muted',
  }

  const COL_WIDTHS = '80px 1.4fr 1.8fr 120px 110px 70px 130px 80px'

  return (
    <div>
      <AdminPageHeader
        title="Users"
        sub={`${(totalCount ?? 0).toLocaleString()} total · ${(activeCount ?? 0).toLocaleString()} active`}
        actions={
          <a
            href={`/api/admin/export/users?status=${status}${q ? `&q=${q}` : ''}&sort=${sort}`}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-border rounded-sm text-xs text-fg-2 font-medium hover:bg-surface-2 transition-colors"
          >
            <Download size={12} /> Export CSV
          </a>
        }
      />

      {/* Search + filters */}
      <div className="flex gap-2 items-center mb-3.5 flex-wrap">
        <UserSearchInput defaultValue={q} />

        {/* Filter tabs */}
        <div className="flex items-center gap-1.5 bg-surface border border-border rounded-md p-1">
          {FILTER_TABS.map(t => (
            <Link
              key={t.value}
              href={`/admin/users?status=${t.value}${q ? `&q=${q}` : ''}`}
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

        {/* Sort */}
        <div className="flex items-center gap-1 px-2 py-1 bg-surface border border-border rounded-md text-xs">
          <span className="font-mono text-[10px] text-fg-3 mr-1">SORT</span>
          {[
            { key: 'seen',    label: 'Last seen' },
            { key: 'joined',  label: 'Joined' },
            { key: 'name',    label: 'Name' },
          ].map(o => (
            <Link key={o.key}
              href={`/admin/users?status=${status}&sort=${o.key}${q ? `&q=${q}` : ''}`}
              className={`px-2 py-0.5 rounded transition-colors ${
                sort === o.key ? 'bg-sky/10 text-sky' : 'text-fg-3 hover:text-fg'
              }`}
            >{o.label}</Link>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface border border-border rounded-md overflow-hidden">
        {/* Header */}
        <div className="grid px-4 py-3 border-b border-border gap-3"
          style={{ gridTemplateColumns: COL_WIDTHS }}>
          {['ID', 'NAME', 'EMAIL', 'LICENCE', 'STATUS', 'JUMPS', 'SUB. RENEWS', 'LAST SEEN'].map(h => (
            <span key={h} className="font-mono text-[10px] text-fg-3 tracking-widest uppercase truncate">{h}</span>
          ))}
        </div>
        {/* Rows */}
        {rows.map(row => (
          <Link
            key={row.id}
            href={`/admin/users/${row.id}`}
            className="grid px-4 py-3 gap-3 items-center border-b border-border last:border-0 hover:bg-surface-2 transition-colors text-sm"
            style={{ gridTemplateColumns: COL_WIDTHS }}
          >
            <span className="font-mono text-xs text-fg-3">{row.displayId}</span>
            <span className="font-medium text-fg truncate">{row.name}</span>
            <span className="font-mono text-xs text-fg-2 truncate">{row.email}</span>
            <span className="font-mono text-xs text-fg-2">{row.licence}</span>
            <span><Badge kind={kindMap[row.status] ?? 'muted'}>{row.statusLabel}</Badge></span>
            <span className="font-mono text-sm">{row.jumps.toLocaleString()}</span>
            <span className="font-mono text-xs text-fg-2">{row.renew}</span>
            <span className="font-mono text-xs text-fg-3">{row.seen}</span>
          </Link>
        ))}
      </div>

      <div className="flex justify-between items-center mt-3.5 text-xs text-fg-3">
        <span className="font-mono">Showing 1 – {rows.length} of {(totalCount ?? 0).toLocaleString()}</span>
        <div className="flex items-center gap-1">
          <button className="w-7 h-7 rounded border border-border bg-surface flex items-center justify-center text-fg-3">‹</button>
          <button className="w-7 h-7 rounded border border-sky/30 bg-sky/10 text-sky text-xs font-mono">1</button>
          <button className="w-7 h-7 rounded border border-border bg-surface flex items-center justify-center text-xs font-mono text-fg-2">2</button>
          <button className="w-7 h-7 rounded border border-border bg-surface flex items-center justify-center text-xs font-mono text-fg-2">3</button>
          <span className="w-7 h-7 flex items-center justify-center text-fg-3">…</span>
          <button className="w-7 h-7 rounded border border-border bg-surface flex items-center justify-center text-xs font-mono text-fg-2">›</button>
        </div>
      </div>
    </div>
  )
}
