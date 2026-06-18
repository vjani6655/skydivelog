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

export async function POST(req: NextRequest) {
  if (!await assertAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { orderedIds } = await req.json()
  if (!Array.isArray(orderedIds)) return NextResponse.json({ error: 'orderedIds required' }, { status: 400 })

  const db = createAdminClient()
  await Promise.all(
    orderedIds.map((id: string, idx: number) =>
      db.from('releases').update({ sort_order: idx }).eq('id', id)
    )
  )

  return NextResponse.json({ ok: true })
}
