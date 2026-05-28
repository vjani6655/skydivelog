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

  // The JS client's auth.admin.signOut(jwt) expects an access token, not a user ID.
  // Use the Supabase admin REST endpoint directly to sign out all sessions by user ID.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SECRET_KEY!
  const resp = await fetch(
    `${supabaseUrl}/auth/v1/admin/users/${params.id}/logout?scope=global`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
      },
    },
  )
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}) as Record<string, string>)
    return NextResponse.json(
      { error: (body as Record<string, string>).message ?? (body as Record<string, string>).error ?? 'Sign-out failed' },
      { status: resp.status },
    )
  }

  return NextResponse.json({ ok: true })
}
