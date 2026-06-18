export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase/admin'
import { AdminCard, AdminPageHeader } from '@/components/admin/ui'
import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
import CleanupDropzonesButton from '@/components/admin/CleanupDropzonesButton'

export default async function DropzonesListPage() {
  const db = createAdminClient()

  const [{ data: allDZs }, { data: jumpDZs }, { data: homeDZs }] = await Promise.all([
    db.from('dropzones').select('id, name, region').order('name'),
    db.from('jumps').select('dropzone_id').is('deleted_at', null).not('dropzone_id', 'is', null),
    db.from('users').select('home_dropzone_id').not('home_dropzone_id', 'is', null),
  ])

  // Count jumps per dropzone
  const jumpCount: Record<string, number> = {}
  for (const j of jumpDZs ?? []) {
    if (j.dropzone_id) jumpCount[j.dropzone_id] = (jumpCount[j.dropzone_id] ?? 0) + 1
  }

  // Which dropzones are set as a home DZ for at least one user
  const homeDZSet = new Set((homeDZs ?? []).map(u => u.home_dropzone_id).filter(Boolean))

  const rows = (allDZs ?? [])
    .map(dz => ({
      ...dz,
      count: jumpCount[dz.id] ?? 0,
      isHomeDZ: homeDZSet.has(dz.id),
    }))
    .sort((a, b) => b.count - a.count)

  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs text-fg-3 mb-4">
        <Link href="/admin/dashboard" className="text-fg-2 hover:text-fg">Dashboard</Link>
        <ChevronRight size={11} className="text-fg-4" />
        <span className="text-fg-2">Dropzones</span>
      </div>

      <AdminPageHeader title="Dropzones" sub={`${rows.length} total`} actions={<CleanupDropzonesButton />} />

      <AdminCard title={`ALL DROPZONES · ${rows.length}`}>
        {rows.length === 0 && <div className="text-xs text-fg-3 py-2">No dropzones yet</div>}
        {rows.map(dz => (
          <div key={dz.id} className="flex items-center justify-between py-2.5 border-b border-dashed border-border last:border-0">
            <div>
              <div className="text-sm font-medium text-fg">{dz.name}</div>
              {dz.region && <div className="font-mono text-[10px] text-fg-3 mt-0.5">{dz.region}</div>}
            </div>
            <span className="font-mono text-xs text-fg-3">
              {dz.count === 0 && !dz.isHomeDZ
                ? <span className="text-warn">0 jumps · orphaned</span>
                : dz.count === 0 && dz.isHomeDZ
                ? <span className="text-fg-3">0 jumps · home DZ</span>
                : `${dz.count} jump${dz.count !== 1 ? 's' : ''}${dz.isHomeDZ ? ' · home DZ' : ''}`}
            </span>
          </div>
        ))}
      </AdminCard>
    </div>
  )
}
