import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const db = createAdminClient()
  const { data } = await db.from('admins').select('id').eq('email', user.email!).eq('active', true).maybeSingle()
  return !!data
}

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!await assertAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await req.json()
  const db = createAdminClient()

  const patch: Record<string, unknown> = {}
  if ('ios_build_number'     in body) patch.ios_build_number     = body.ios_build_number ? Number(body.ios_build_number) : null
  if ('android_build_number' in body) patch.android_build_number = body.android_build_number ? Number(body.android_build_number) : null
  if ('version'      in body) patch.version = body.version
  if ('title'        in body) patch.title = body.title || null
  if ('changes'      in body) patch.changes = body.changes
  if ('platforms'    in body) patch.platforms = body.platforms
  if ('published_at' in body) patch.published_at = body.published_at || null
  if ('is_published' in body) {
    patch.is_published = body.is_published
    // Only auto-set the date when publishing if not explicitly provided
    if (!('published_at' in body)) {
      patch.published_at = body.is_published ? new Date().toISOString() : null
    }
  }

  const { data, error } = await db
    .from('releases')
    .update(patch)
    .eq('id', params.id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!await assertAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const db = createAdminClient()
  const { error } = await db.from('releases').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
