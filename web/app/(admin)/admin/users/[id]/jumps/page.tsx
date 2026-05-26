export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase/admin'
import { KPI, Badge } from '@/components/admin/ui'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, Download } from 'lucide-react'

function fmtDateShort(s: string | null) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: '2-digit' })
}
function fmtMSS(s: number | null): string {
  if (!s) return '—'
  const m = Math.floor(s / 60); const sec = s % 60
  return `${m}:${String(sec).padStart(2, '0')}`
}
function fmtAlt(ft: number | null): string {
  if (!ft) return '—'
  return ft.toLocaleString()
}

export default async function AdminUserJumpsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = createAdminClient()

  const [
    { data: user },
    { data: jumps, count: totalJumps },
    { count: totalUsers },
  ] = await Promise.all([
    db.from('users').select('id, full_name, email, licence_number').eq('id', id).single(),
    db.from('jumps')
      .select(`
        id, jump_number, date, jump_type,
        exit_altitude_ft, freefall_seconds, canopy_seconds,
        dropzone:dropzones(name),
        aircraft_type, aircraft_rego
      `, { count: 'exact' })
      .eq('user_id', id)
      .is('deleted_at', null)
      .order('jump_number', { ascending: false })
      .limit(50),
    db.from('users').select('*', { count: 'exact', head: true }).lte('created_at', (await db.from('users').select('created_at').eq('id', id).single()).data?.created_at ?? ''),
  ])

  if (!user) notFound()

  const displayId = `#${totalUsers}`
  const jumpIds = jumps?.map(j => j.id) ?? []

  // Fetch signatures and flagged entries for these jumps
  const [{ data: signatures }, { data: flaggedEntries }] = await Promise.all([
    jumpIds.length ? db.from('signatures').select('jump_id').in('jump_id', jumpIds) : Promise.resolve({ data: [] }),
    jumpIds.length ? db.from('flagged_entries').select('jump_id').in('jump_id', jumpIds).eq('status', 'open') : Promise.resolve({ data: [] }),
  ])

  const signedSet = new Set((signatures ?? []).map(s => s.jump_id))
  const flaggedSet = new Set((flaggedEntries ?? []).map(f => f.jump_id))

  const signedCount = (jumps ?? []).filter(j => signedSet.has(j.id)).length
  const flaggedCount = (jumps ?? []).filter(j => flaggedSet.has(j.id)).length
  const pendingCount = (totalJumps ?? 0) - signedCount

  const COL_WIDTHS = '70px 100px 110px 120px 1.6fr 90px 70px 70px 80px'

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-fg-3 mb-3">
        <Link href="/admin/users" className="text-fg-2 hover:text-fg">Users</Link>
        <ChevronRight size={11} className="text-fg-4" />
        <Link href={`/admin/users/${id}`} className="font-mono text-fg-2 hover:text-fg">{displayId}</Link>
        <ChevronRight size={11} className="text-fg-4" />
        <span className="text-fg-2">Jumps</span>
      </div>

      {/* Header */}
      <div className="flex items-end justify-between mb-5">
        <div>
          <div className="font-mono text-[10px] text-fg-3 tracking-widest uppercase mb-1.5">
            USER {displayId} · {user.licence_number ?? '—'}
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-fg">
            {user.full_name || user.email.split('@')[0]} · jumps
          </h1>
        </div>
        <div className="flex gap-2">
          <span className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-2 border border-border rounded-sm text-xs font-mono text-fg-3">
            READ-ONLY
          </span>
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-border rounded-sm text-xs text-fg-2 font-medium">
            <Download size={12} /> Export
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-5 gap-3 mb-4">
        <KPI label="Total jumps" value={(totalJumps ?? 0).toLocaleString()} />
        <KPI label="Signed"
          value={signedCount.toLocaleString()}
          sub={totalJumps ? `${Math.round(signedCount / totalJumps * 100)}%` : '—'}
          accent="#4ADE80" />
        <KPI label="Pending" value={pendingCount.toLocaleString()} />
        <KPI label="Flagged"
          value={flaggedCount.toLocaleString()}
          accent={flaggedCount > 0 ? '#FFB74A' : undefined} />
        <KPI label="Disputed" value="0" />
      </div>

      {/* Jump table */}
      <div className="bg-surface border border-border rounded-md overflow-hidden">
        {/* Header */}
        <div className="grid px-4 py-3 border-b border-border gap-3"
          style={{ gridTemplateColumns: COL_WIDTHS }}>
          {['#', 'DATE', 'TYPE', 'DZ', 'AIRCRAFT', 'EXIT', 'FF', 'CANOPY', 'STATUS'].map(h => (
            <span key={h} className="font-mono text-[10px] text-fg-3 tracking-widest uppercase">{h}</span>
          ))}
        </div>

        {/* Rows */}
        {(jumps ?? []).map(j => {
          const isSigned  = signedSet.has(j.id)
          const isFlagged = flaggedSet.has(j.id)
          const dz = j.dropzone as unknown as { name: string } | null

          return (
            <div key={j.id}
              className="grid px-4 py-3 gap-3 items-center border-b border-border last:border-0 hover:bg-surface-2 transition-colors text-sm"
              style={{ gridTemplateColumns: COL_WIDTHS }}>
              <span className="font-mono text-xs text-fg-2">#{j.jump_number}</span>
              <span className="font-mono text-xs text-fg-2">{fmtDateShort(j.date)}</span>
              <span className="text-xs font-medium text-fg">{j.jump_type ?? '—'}</span>
              <span className="text-xs text-fg-2 truncate">{dz?.name ?? '—'}</span>
              <span className="font-mono text-xs text-fg-2 truncate">
                {j.aircraft_type ? `${j.aircraft_type}${j.aircraft_rego ? ` · ${j.aircraft_rego}` : ''}` : '—'}
              </span>
              <span className="font-mono text-xs text-fg-2">{fmtAlt(j.exit_altitude_ft)}</span>
              <span className="font-mono text-xs text-fg-2">{fmtMSS(j.freefall_seconds)}</span>
              <span className="font-mono text-xs text-fg-2">{fmtMSS(j.canopy_seconds)}</span>
              <span>
                {isFlagged
                  ? <Badge kind="warn">FLAG</Badge>
                  : isSigned
                  ? <span className="text-ok text-sm">✓</span>
                  : <span className="text-fg-3 text-sm">~</span>
                }
              </span>
            </div>
          )
        })}

        {(!jumps || jumps.length === 0) && (
          <div className="px-4 py-8 text-xs text-fg-3 text-center">No jumps logged yet</div>
        )}
      </div>

      <div className="mt-3 font-mono text-[11px] text-fg-3">
        Showing {jumps?.length ?? 0} of {(totalJumps ?? 0).toLocaleString()} jumps
      </div>
    </div>
  )
}
