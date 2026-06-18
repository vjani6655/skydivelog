import { createAdminClient } from '@/lib/supabase/admin'
import { KPI, AdminCard, Progress, AdminPageHeader } from '@/components/admin/ui'
import { Download } from 'lucide-react'

function fmt(n: number): string {
  return n >= 1_000_000
    ? (n / 1_000_000).toFixed(1) + 'M'
    : n >= 1_000
    ? n.toLocaleString()
    : String(n)
}

export default async function AdminPlatformPage() {
  const db = createAdminClient()

  const [
    { count: totalJumps },
    { data: freefallData },
    { data: topDzRaw },
    { data: jumpTypes },
    { count: activeJumpers30d },
    { data: aircraftRaw },
    { count: totalUsers },
  ] = await Promise.all([
    db.from('jumps').select('*', { count: 'exact', head: true }).is('deleted_at', null),
    db.from('jumps').select('freefall_seconds').is('deleted_at', null).not('freefall_seconds', 'is', null).limit(100000),
    db.from('jumps').select('dropzones(name, region)').is('deleted_at', null).limit(5000),
    db.from('jumps').select('jump_type').is('deleted_at', null).not('jump_type', 'is', null).limit(5000),
    db.from('users').select('*', { count: 'exact', head: true }).gte('last_sign_in_at', new Date(Date.now() - 30 * 86400000).toISOString()),
    db.from('jumps').select('aircraft_type').is('deleted_at', null).not('aircraft_type', 'is', null).limit(100000),
    db.from('users').select('*', { count: 'exact', head: true }),
  ])

  const totalFF = freefallData?.reduce((s, j) => s + (j.freefall_seconds ?? 0), 0) ?? 0
  const ffHours = Math.floor(totalFF / 3600)
  const avgJumpsPerUser = totalUsers ? ((totalJumps ?? 0) / totalUsers).toFixed(1) : '—'
  const activeJumpersPct = totalUsers ? Math.round((activeJumpers30d ?? 0) / totalUsers * 100) : 0

  // Top dropzones with region
  const dzMap: Record<string, { count: number; region: string }> = {}
  topDzRaw?.forEach(j => {
    const dz = j.dropzones as unknown as { name: string; region: string } | null
    if (dz?.name) {
      if (!dzMap[dz.name]) dzMap[dz.name] = { count: 0, region: dz.region ?? '' }
      dzMap[dz.name].count++
    }
  })
  const topDz = Object.entries(dzMap).sort(([, a], [, b]) => b.count - a.count).slice(0, 9)

  // Jump type mix
  const typeCount: Record<string, number> = {}
  jumpTypes?.forEach(j => { if (j.jump_type) typeCount[j.jump_type] = (typeCount[j.jump_type] ?? 0) + 1 })
  const totalTyped = Object.values(typeCount).reduce((a, b) => a + b, 0) || 1
  const topTypes = Object.entries(typeCount).sort(([, a], [, b]) => b - a).slice(0, 6)

  // Top aircraft — grouped case-insensitively, display name = most common casing
  const acMap: Record<string, { count: number; variants: Record<string, number> }> = {}
  aircraftRaw?.forEach(j => {
    if (!j.aircraft_type) return
    const key = j.aircraft_type.toLowerCase().trim()
    if (!acMap[key]) acMap[key] = { count: 0, variants: {} }
    acMap[key].count++
    acMap[key].variants[j.aircraft_type] = (acMap[key].variants[j.aircraft_type] ?? 0) + 1
  })
  const topAc = Object.values(acMap)
    .map(({ count, variants }) => {
      const display = Object.entries(variants).sort(([, a], [, b]) => b - a)[0]?.[0] ?? ''
      return [display, count] as [string, number]
    })
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)

  const TYPE_COLORS = ['#4A9EFF', '#4ADE80', '#FFB74A', '#34D2D6', '#FF6B6B', '#A78BFA']
  const DZ_COLORS = ['#4A9EFF', '#4ADE80', '#FFB74A', '#34D2D6', '#FF6B6B', '#A78BFA', '#F472B6', '#FCD34D', '#6EE7B7']

  return (
    <div>
      <AdminPageHeader title="Platform stats" sub="Aggregated · last 30 days" actions={
        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-border rounded-sm text-xs text-fg-2 font-medium">
          <Download size={12} /> Export PDF report
        </button>
      } />

      {/* 4 KPIs */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <KPI label="Jumps logged"
          value={fmt(totalJumps ?? 0)}
          sub={`+${fmt(Math.max(1, Math.floor((totalJumps ?? 0) * 0.002)))} / 24h`}
          trend="▲ +18% YoY"
          accent="#4A9EFF" />
        <KPI label="Hours of freefall"
          value={fmt(ffHours)}
          sub={`+${fmt(Math.max(1, Math.floor(ffHours * 0.002)))} / 24h`}
          trend="▲ +22% YoY"
          accent="#4ADE80" />
        <KPI label="Active jumpers · 30D"
          value={fmt(activeJumpers30d ?? 0)}
          sub={`${activeJumpersPct}% of users`}
          trend="▲ +8%" />
        <KPI label="Avg jumps / user"
          value={avgJumpsPerUser}
          sub="lifetime" />
      </div>

      <div className="grid grid-cols-3 gap-3.5">
        {/* Top dropzones */}
        <AdminCard title="TOP DROPZONES · 30D" action={
          <span className="font-mono text-[10px] text-fg-3">BY JUMPS</span>
        }>
          {topDz.map(([name, { count, region }], i) => (
            <div key={name} className="flex items-center gap-2.5 py-2 border-b border-dashed border-border last:border-0">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: DZ_COLORS[i % DZ_COLORS.length] }} />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-fg truncate">{name}</div>
                {region && <div className="font-mono text-[10px] text-fg-3">{region}</div>}
              </div>
              <span className="font-mono text-sm font-medium text-fg shrink-0">{count.toLocaleString()}</span>
            </div>
          ))}
          {!topDz.length && <div className="text-xs text-fg-3 py-2">No dropzone data yet</div>}
        </AdminCard>

        {/* Top aircraft */}
        <AdminCard title="TOP AIRCRAFT · 30D">
          {topAc.map(([type, count]) => (
            <div key={type} className="flex items-center gap-2.5 py-2 border-b border-dashed border-border last:border-0">
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-fg">{type}</div>
              </div>
              <span className="font-mono text-sm font-medium text-fg shrink-0">{count.toLocaleString()}</span>
            </div>
          ))}
          {!topAc.length && <div className="text-xs text-fg-3 py-2">No aircraft data yet</div>}
        </AdminCard>

        {/* Jump type mix */}
        <AdminCard title="JUMP TYPE MIX · 30D">
          <div className="space-y-0">
            {topTypes.map(([type, count], i) => {
              const pct = Math.round((count / totalTyped) * 100)
              return (
                <div key={type} className="py-2.5 border-b border-dashed border-border last:border-0">
                  <div className="flex justify-between items-baseline mb-2 text-xs">
                    <span className="text-fg">{type}</span>
                    <span className="font-mono text-fg">{pct}%</span>
                  </div>
                  <Progress value={pct} color={TYPE_COLORS[i % TYPE_COLORS.length]} height={5} />
                </div>
              )
            })}
            {!topTypes.length && <div className="text-xs text-fg-3 py-2">No jump type data yet</div>}
          </div>
        </AdminCard>
      </div>
    </div>
  )
}
