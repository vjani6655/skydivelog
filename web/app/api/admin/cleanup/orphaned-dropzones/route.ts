export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const db = createAdminClient()
  const { data: adminRow } = await db
    .from('admins')
    .select('id, role')
    .eq('email', user.email!)
    .eq('active', true)
    .maybeSingle()
  if (!adminRow) return new Response('Forbidden', { status: 403 })
  if (!['super-admin', 'admin'].includes(adminRow.role)) return new Response('Forbidden', { status: 403 })

  // Find dropzones not referenced by any jump or any user's home_dropzone_id
  const { data: allDropzones } = await db.from('dropzones').select('id, name')
  if (!allDropzones?.length) return NextResponse.json({ deleted: 0, names: [] })

  const [{ data: usedInJumps }, { data: usedAsHome }] = await Promise.all([
    db.from('jumps').select('dropzone_id').not('dropzone_id', 'is', null),
    db.from('users').select('home_dropzone_id').not('home_dropzone_id', 'is', null),
  ])

  const usedIds = new Set([
    ...(usedInJumps ?? []).map(j => j.dropzone_id),
    ...(usedAsHome ?? []).map(u => u.home_dropzone_id),
  ])

  const orphans = allDropzones.filter(dz => !usedIds.has(dz.id))
  if (!orphans.length) return NextResponse.json({ deleted: 0, names: [] })

  const orphanIds = orphans.map(dz => dz.id)
  await db.from('dropzones').delete().in('id', orphanIds)

  await db.from('audit_log').insert({
    admin_id: adminRow.id,
    action: 'cleanup',
    target: 'dropzones',
    reason: `Deleted ${orphans.length} orphaned dropzone(s): ${orphans.map(d => d.name).join(', ')}`,
  })

  return NextResponse.json({ deleted: orphans.length, names: orphans.map(d => d.name) })
}
