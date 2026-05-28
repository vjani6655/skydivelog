import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  // Verify caller is authenticated
  const serverSb = await createClient()
  const { data: { user } } = await serverSb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Use service-role client so RLS doesn't block the admins / audit_log lookups
  const db = createAdminClient()

  const { data: adminRow, error: adminErr } = await db
    .from('admins')
    .select('id')
    .eq('email', user.email!)
    .single()
  if (adminErr || !adminRow) {
    return NextResponse.json({ error: 'Admin record not found' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const { userId, note } = body as { userId?: string; note?: string }
  if (!userId || !note?.trim()) {
    return NextResponse.json({ error: 'Missing userId or note' }, { status: 400 })
  }

  const { data, error } = await db
    .from('audit_log')
    .insert({
      admin_id: adminRow.id,
      action: 'admin_note',
      target: `user:${userId}`,
      reason: note.trim(),
    })
    .select('id, reason, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
