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

  const { error } = await db
    .from('subscriptions')
    .delete()
    .eq('user_id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Expire the trial too — otherwise a recently-created account falls back into trial
  const yesterday = new Date(Date.now() - 86400000).toISOString()
  await db.auth.admin.updateUserById(params.id, {
    user_metadata: { trial_ends_at: yesterday },
  })

  await db.from('audit_log').insert({
    admin_id: adminRow.id,
    action: 'subscription_reset',
    target: `user:${params.id}`,
    reason: 'Reset for Apple Review / testing',
  })

  await db.from('subscription_events').insert({
    user_id: params.id,
    sub_id: null,
    event: 'admin_reset',
    metadata: {
      actor: 'admin',
      admin_id: adminRow.id,
      admin_email: user.email,
      reason: 'Reset for Apple Review / testing',
    },
  })

  return NextResponse.json({ ok: true })
}
