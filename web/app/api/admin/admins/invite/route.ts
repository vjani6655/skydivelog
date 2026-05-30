export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const VALID_ROLES = ['super-admin', 'admin', 'support', 'finance', 'read-only']

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const db = createAdminClient()
  const { data: callerAdmin } = await db
    .from('admins')
    .select('id, role')
    .eq('email', user.email!)
    .eq('active', true)
    .maybeSingle()
  if (!callerAdmin) return new Response('Forbidden', { status: 403 })

  // Only super-admin can invite other admins
  if (callerAdmin.role !== 'super-admin') {
    return NextResponse.json({ error: 'Only super-admins can invite new admins.' }, { status: 403 })
  }

  let body: { name: string; email: string; role: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { name, email, role } = body
  if (!name?.trim()) return NextResponse.json({ error: 'Name is required.' }, { status: 400 })
  if (!email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 })
  }
  if (!VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Invalid role.' }, { status: 400 })
  }

  // Check not already an admin
  const { data: existing } = await db
    .from('admins')
    .select('id')
    .eq('email', email.trim().toLowerCase())
    .maybeSingle()
  if (existing) {
    return NextResponse.json({ error: 'An admin with that email already exists.' }, { status: 409 })
  }

  // Insert into admins table first
  const { error: insertError } = await db.from('admins').insert({
    name: name.trim(),
    email: email.trim().toLowerCase(),
    role,
    active: true,
  })
  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  // Send Supabase auth invite so they can set a password
  const { error: inviteError } = await db.auth.admin.inviteUserByEmail(
    email.trim().toLowerCase(),
    { data: { full_name: name.trim() } }
  )
  if (inviteError) {
    // Non-fatal if auth invite fails (e.g. user already has an account) — row is still inserted
    console.error('[admin/invite] auth invite error:', inviteError.message)
  }

  return NextResponse.json({ ok: true })
}
