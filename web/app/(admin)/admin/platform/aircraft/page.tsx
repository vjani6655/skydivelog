export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase/admin'
import { AdminCard, AdminPageHeader } from '@/components/admin/ui'
import { ChevronRight } from 'lucide-react'
import Link from 'next/link'

export default async function AircraftListPage() {
  const db = createAdminClient()

  const { data: jumpAircraft } = await db
    .from('jumps')
    .select('aircraft_type')
    .is('deleted_at', null)
    .not('aircraft_type', 'is', null)
    .limit(100000)

  // Group case-insensitively, display most common casing
  const acMap: Record<string, { count: number; variants: Record<string, number> }> = {}
  for (const j of jumpAircraft ?? []) {
    if (!j.aircraft_type) continue
    const key = j.aircraft_type.toLowerCase().trim()
    if (!acMap[key]) acMap[key] = { count: 0, variants: {} }
    acMap[key].count++
    acMap[key].variants[j.aircraft_type] = (acMap[key].variants[j.aircraft_type] ?? 0) + 1
  }

  const rows = Object.values(acMap)
    .map(({ count, variants }) => {
      const display = Object.entries(variants).sort(([, a], [, b]) => b - a)[0]?.[0] ?? ''
      return { display, count }
    })
    .sort((a, b) => b.count - a.count)

  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs text-fg-3 mb-4">
        <Link href="/admin/dashboard" className="text-fg-2 hover:text-fg">Dashboard</Link>
        <ChevronRight size={11} className="text-fg-4" />
        <span className="text-fg-2">Aircraft</span>
      </div>

      <AdminPageHeader title="Aircraft" sub={`${rows.length} types`} />

      <AdminCard title={`ALL AIRCRAFT · ${rows.length}`}>
        {rows.length === 0 && <div className="text-xs text-fg-3 py-2">No aircraft logged yet</div>}
        {rows.map(a => (
          <div key={a.display} className="flex items-center justify-between py-2.5 border-b border-dashed border-border last:border-0">
            <div className="text-sm font-medium text-fg">{a.display}</div>
            <span className="font-mono text-xs text-fg-3">
              {a.count} jump{a.count !== 1 ? 's' : ''}
            </span>
          </div>
        ))}
      </AdminCard>
    </div>
  )
}
