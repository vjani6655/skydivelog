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
    .select('id')
    .eq('email', user.email!)
    .eq('active', true)
    .maybeSingle()
  if (!adminRow) return new Response('Forbidden', { status: 403 })

  const { error } = await db
    .from('subscriptions')
    .delete()
    .eq('user_id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await db.from('audit_log').insert({
    admin_id: adminRow.id,
    action: 'subscription_reset',
    target: `user:${params.id}`,
    reason: 'Reset for Apple Review / testing',
  })

  return NextResponse.json({ ok: true })
}
