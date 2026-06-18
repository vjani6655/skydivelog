import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const since = Number(req.nextUrl.searchParams.get('since') ?? '0')
  const db = createAdminClient()

  let query = db
    .from('releases')
    .select('id, build_number, version, title, changes, platforms, published_at')
    .eq('is_published', true)
    .not('build_number', 'is', null)   // web-only releases have no build number; skip for mobile
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (since > 0) query = query.gt('build_number', since)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
