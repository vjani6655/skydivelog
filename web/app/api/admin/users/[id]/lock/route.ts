export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  _req: Request,
  { params }: { params: { id: string } },
) {
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

  // Ban for ~100 years — effectively permanent lock
  const { error } = await db.auth.admin.updateUserById(params.id, {
    ban_duration: '876000h',
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await db.from('audit_log').insert({
    admin_id: adminRow.id,
    action: 'account_lock',
    target: `user:${params.id}`,
    reason: 'Account locked by admin',
  })

  return NextResponse.json({ ok: true })
}
