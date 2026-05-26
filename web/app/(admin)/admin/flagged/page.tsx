export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase/admin'
import FlaggedTable from '@/components/admin/FlaggedTable'

export default async function AdminFlaggedPage() {
  const db = createAdminClient()
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString()

  const [
    { data: allEntries },
    { count: openCount },
    { count: resolved30d },
    { count: dismissed30d },
    { count: totalJumps },
  ] = await Promise.all([
    db.from('flagged_entries')
      .select('id, reason, detail, source, severity, status, jumps(jump_number, jump_type, users(full_name))')
      .order('id', { ascending: false })
      .limit(200),
    db.from('flagged_entries').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    db.from('flagged_entries').select('*', { count: 'exact', head: true })
      .eq('status', 'resolved').gte('jumps.created_at', thirtyDaysAgo),
    db.from('flagged_entries').select('*', { count: 'exact', head: true })
      .eq('status', 'dismissed').gte('jumps.created_at', thirtyDaysAgo),
    db.from('jumps').select('*', { count: 'exact', head: true }).is('deleted_at', null),
  ])

  return (
    <FlaggedTable
      entries={(allEntries ?? []) as unknown as Parameters<typeof FlaggedTable>[0]['entries']}
      openCount={openCount ?? 0}
      resolved30d={resolved30d ?? 0}
      dismissed30d={dismissed30d ?? 0}
      totalJumps={totalJumps ?? 0}
    />
  )
}
