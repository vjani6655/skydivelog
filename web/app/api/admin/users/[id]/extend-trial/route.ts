import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  // Verify caller is an authenticated admin
  const serverSb = await createClient()
  const { data: { user } } = await serverSb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createAdminClient()
  const { data: adminRow } = await db
    .from('admins')
    .select('id')
    .eq('email', user.email!)
    .single()
  if (!adminRow) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const days = Number(body.days)
  if (!days || days < 1 || days > 365) {
    return NextResponse.json({ error: 'days must be between 1 and 365' }, { status: 400 })
  }

  // Get the target user's current auth record
  const { data: authData, error: userErr } = await db.auth.admin.getUserById(params.id)
  if (userErr || !authData.user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // New trial end = max(current trial end, now) + days
  const existingEnd = authData.user.user_metadata?.trial_ends_at
    ? new Date(authData.user.user_metadata.trial_ends_at as string)
    : new Date(new Date(authData.user.created_at).getTime() + 14 * 86400000)
  const base = new Date(Math.max(existingEnd.getTime(), Date.now()))
  base.setDate(base.getDate() + days)
  const newTrialEndsAt = base.toISOString()

  const { error: updateErr } = await db.auth.admin.updateUserById(params.id, {
    user_metadata: {
      ...authData.user.user_metadata,
      trial_ends_at: newTrialEndsAt,
    },
  })
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  // Audit log
  await db.from('audit_log').insert({
    admin_id: adminRow.id,
    action: 'trial_extend',
    target: `user:${params.id}`,
    reason: `Extended trial by ${days} day${days > 1 ? 's' : ''} (new end: ${base.toDateString()})`,
  })

  return NextResponse.json({ trial_ends_at: newTrialEndsAt })
}
