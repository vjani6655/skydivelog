export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase/admin'
import { AdminCard, AdminPageHeader } from '@/components/admin/ui'
import { ChevronRight } from 'lucide-react'
import Link from 'next/link'

export default async function AircraftListPage() {
  const db = createAdminClient()

  const [{ data: allAircraft }, { data: jumpAircraft }] = await Promise.all([
    db.from('aircraft').select('id, type, category').order('type'),
    db.from('jumps').select('aircraft_type').is('deleted_at', null).not('aircraft_type', 'is', null),
  ])

  // Count jumps per aircraft type — normalise to lowercase to merge case variants
  const jumpCountByKey: Record<string, number> = {}
  for (const j of jumpAircraft ?? []) {
    if (j.aircraft_type) {
      const key = j.aircraft_type.toLowerCase().trim()
      jumpCountByKey[key] = (jumpCountByKey[key] ?? 0) + 1
    }
  }

  const rows = (allAircraft ?? [])
    .map(a => ({ ...a, count: jumpCountByKey[a.type.toLowerCase().trim()] ?? 0 }))
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
        {rows.length === 0 && <div className="text-xs text-fg-3 py-2">No aircraft yet</div>}
        {rows.map(a => (
          <div key={a.id} className="flex items-center justify-between py-2.5 border-b border-dashed border-border last:border-0">
            <div>
              <div className="text-sm font-medium text-fg">{a.type}</div>
              <div className="font-mono text-[10px] text-fg-3 mt-0.5">{a.category}</div>
            </div>
            <span className="font-mono text-xs text-fg-3">
              {a.count === 0
                ? <span className="text-warn">0 jumps · not used</span>
                : `${a.count} jump${a.count !== 1 ? 's' : ''}`}
            </span>
          </div>
        ))}
      </AdminCard>
    </div>
  )
}
