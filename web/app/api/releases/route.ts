import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

type ReleaseChange = { category: string; text: string }

export async function GET(req: NextRequest) {
  const since    = Number(req.nextUrl.searchParams.get('since') ?? '0')
  const platform = req.nextUrl.searchParams.get('platform') // 'ios' | 'android' | null
  const db = createAdminClient()

  const buildCol = platform === 'android' ? 'android_build_number' : 'ios_build_number'

  const baseQuery = () => db
    .from('releases')
    .select('id, ios_build_number, android_build_number, version, title, changes, platforms, published_at')
    .eq('is_published', true)
    .not(buildCol, 'is', null)  // only return releases that have a build number for this platform

  let { data, error } = since > 0
    ? await baseQuery().gt(buildCol, since).order('sort_order', { ascending: true }).order('created_at', { ascending: false })
    : await baseQuery().order('sort_order', { ascending: true }).order('created_at', { ascending: false })

  // sort_order column may not exist yet — retry without it
  if (error) {
    ;({ data, error } = since > 0
      ? await baseQuery().gt(buildCol, since).order('created_at', { ascending: false })
      : await baseQuery().order('created_at', { ascending: false }))
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Strip changes with no text and resolve build_number to the platform-appropriate value
  const cleaned = (data ?? []).map(r => ({
    ...r,
    build_number: platform === 'android' ? r.android_build_number : r.ios_build_number,
    changes: ((r.changes ?? []) as ReleaseChange[]).filter(c => c.text?.trim()),
  })).filter(r => r.changes.length > 0)

  return NextResponse.json(cleaned)
}
