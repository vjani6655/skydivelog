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

export async function GET() {
  if (!await assertAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const db = createAdminClient()
  const { data, error } = await db
    .from('releases')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  if (!await assertAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await req.json()
  const { build_number, version, title, changes, platforms, published_at } = body

  const db = createAdminClient()
  const { data, error } = await db
    .from('releases')
    .insert({
      build_number: build_number ? Number(build_number) : null,
      version:      version || null,
      title:        title || null,
      changes:      changes ?? [],
      platforms:    platforms ?? [],
      published_at: published_at || null,
    })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
