import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function getVerifiedAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const db = createAdminClient()
  const { data } = await db
    .from('admins')
    .select('role')
    .eq('email', user.email!)
    .eq('active', true)
    .maybeSingle()
  return data ? { user, db } : null
}

/**
 * PATCH /api/admin/users/[id]/voice-log
 * Body: { voice_log_enabled: boolean | null }
 *   - true  → always enabled for this user (even if global flag is off)
 *   - false → always disabled for this user (even if global flag is on)
 *   - null  → inherit from global app_config.voice_log_enabled
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getVerifiedAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await req.json()

  // Accept boolean or null; reject anything else
  const raw = body.voice_log_enabled
  const value: boolean | null =
    raw === null ? null : typeof raw === 'boolean' ? raw : null

  const { error } = await admin.db
    .from('users')
    .update({ voice_log_enabled: value })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, voice_log_enabled: value })
}
