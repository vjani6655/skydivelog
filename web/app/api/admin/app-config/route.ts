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

export async function GET() {
  const admin = await getVerifiedAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await admin.db
    .from('app_config')
    .select('*')
    .eq('id', 'singleton')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: Request) {
  const admin = await getVerifiedAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()

  const { error } = await admin.db
    .from('app_config')
    .update({
      force_upgrade_enabled: Boolean(body.force_upgrade_enabled),
      minimum_version:       String(body.minimum_version ?? '0.0.0').trim(),
      upgrade_title:         String(body.upgrade_title ?? 'Update Required').trim(),
      upgrade_message:       String(body.upgrade_message ?? '').trim(),
      ios_store_url:         body.ios_store_url ? String(body.ios_store_url).trim() : null,
      android_store_url:     body.android_store_url ? String(body.android_store_url).trim() : null,
      voice_log_enabled:     body.voice_log_enabled !== undefined ? Boolean(body.voice_log_enabled) : true,
      updated_at:            new Date().toISOString(),
      updated_by_email:      admin.user.email,
    })
    .eq('id', 'singleton')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
