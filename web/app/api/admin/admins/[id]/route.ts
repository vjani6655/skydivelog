export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const VALID_ROLES = ['super-admin', 'admin', 'support', 'finance', 'read-only']

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
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
  if (callerAdmin.role !== 'super-admin') {
    return NextResponse.json({ error: 'Only super-admins can modify admin accounts.' }, { status: 403 })
  }
  // Cannot modify yourself
  if (callerAdmin.id === params.id) {
    return NextResponse.json({ error: 'You cannot modify your own account.' }, { status: 400 })
  }

  let body: { role?: string; active?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const update: Record<string, unknown> = {}
  if (body.role !== undefined) {
    if (!VALID_ROLES.includes(body.role)) {
      return NextResponse.json({ error: 'Invalid role.' }, { status: 400 })
    }
    update.role = body.role
  }
  if (body.active !== undefined) {
    update.active = body.active
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 })
  }

  const { error } = await db.from('admins').update(update).eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
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
  if (callerAdmin.role !== 'super-admin') {
    return NextResponse.json({ error: 'Only super-admins can remove admins.' }, { status: 403 })
  }
  if (callerAdmin.id === params.id) {
    return NextResponse.json({ error: 'You cannot remove yourself.' }, { status: 400 })
  }

  const { error } = await db.from('admins').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
