export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAnonClient } from '@supabase/supabase-js'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.jumplogs.com'

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

  const { data: target } = await db
    .from('users')
    .select('email')
    .eq('id', params.id)
    .single()
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Use anon client (implicit flow) so Supabase sends a single email using the
  // custom "Reset password" email template, which links to /api/auth/reset-launch
  // rather than the raw Supabase verify URL. This prevents email scanners from
  // pre-consuming the single-use token before the user clicks.
  const anon = createAnonClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, flowType: 'implicit' } },
  )
  const { error } = await anon.auth.resetPasswordForEmail(target.email, {
    redirectTo: `${APP_URL}/reset-password`,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
