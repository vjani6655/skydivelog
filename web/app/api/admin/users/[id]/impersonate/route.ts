export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  // Use the request origin so this works in local dev and production alike
  const origin = req.headers.get('origin') ?? (process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.jumplogs.com')
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

  const { data: { user: targetUser }, error: userErr } = await db.auth.admin.getUserById(params.id)
  if (userErr || !targetUser?.email) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Generate a one-time magic link for the target user.
  // redirectTo must point to the existing PKCE callback handler so the code
  // gets exchanged for a session cookie. /api/auth/callback is already in
  // Supabase's allowed redirect URLs. ?next= controls where the user lands.
  const { data, error } = await db.auth.admin.generateLink({
    type: 'magiclink',
    email: targetUser.email,
    options: { redirectTo: `${origin}/api/auth/callback?next=/dashboard` },
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ url: data.properties.action_link })
}
