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

/** POST /api/admin/revenue/reset — zeroes price_at_signup on all subscriptions */
export async function POST() {
  const admin = await getAdminRow()
  if (!admin) return new Response('Unauthorized', { status: 401 })

  const db = createAdminClient()
  const { error } = await db
    .from('subscriptions')
    .update({ price_at_signup: 0 })
    .neq('price_at_signup', 0)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
