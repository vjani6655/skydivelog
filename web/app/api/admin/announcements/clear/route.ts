export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

async function getAdminRow() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const db = createAdminClient()
  const { data } = await db
    .from('admins')
    .select('id')
    .eq('email', user.email!)
    .eq('active', true)
    .maybeSingle()
  return data ?? null
}

/** DELETE /api/admin/announcements/clear — wipes all rows from announcements table */
export async function DELETE() {
  const admin = await getAdminRow()
  if (!admin) return new Response('Unauthorized', { status: 401 })

  const db = createAdminClient()
  const { error } = await db.from('announcements').delete().neq('id', '00000000-0000-0000-0000-000000000000')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
