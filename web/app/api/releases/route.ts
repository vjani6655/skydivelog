import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

type ReleaseChange = { category: string; text: string }

export async function GET(req: NextRequest) {
  const since = Number(req.nextUrl.searchParams.get('since') ?? '0')
  const db = createAdminClient()

  const baseQuery = () => db
    .from('releases')
    .select('id, build_number, version, title, changes, platforms, published_at')
    .eq('is_published', true)
    .not('build_number', 'is', null)   // web-only releases have no build number; skip for mobile

  let { data, error } = since > 0
    ? await baseQuery().gt('build_number', since).order('sort_order', { ascending: true }).order('created_at', { ascending: false })
    : await baseQuery().order('sort_order', { ascending: true }).order('created_at', { ascending: false })

  // sort_order column may not exist yet — retry without it
  if (error) {
    ;({ data, error } = since > 0
      ? await baseQuery().gt('build_number', since).order('created_at', { ascending: false })
      : await baseQuery().order('created_at', { ascending: false }))
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Strip changes with no text so the mobile What's New modal never shows empty items
  const cleaned = (data ?? []).map(r => ({
    ...r,
    changes: ((r.changes ?? []) as ReleaseChange[]).filter(c => c.text?.trim()),
  })).filter(r => r.changes.length > 0)

  return NextResponse.json(cleaned)
}
