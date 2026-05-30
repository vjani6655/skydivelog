export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const EXPO_PUSH_BATCH = 100

function isUUID(s: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
}

export async function POST(request: Request) {
  // 1. Verify caller is an admin
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const db = createAdminClient()
  const { data: adminRow } = await db
    .from('admins')
    .select('id')
    .eq('email', user.email!)
    .eq('active', true)
    .maybeSingle()
  if (!adminRow) return new Response('Forbidden', { status: 403 })

  // 2. Parse and validate body
  let body_: { title: string; body: string; channels: string[]; segment: string; deepLink?: string; scheduleMode: string; userIds?: string[] }
  try {
    body_ = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { title, body, channels, segment, deepLink, scheduleMode, userIds: explicitUserIds } = body_
  if (!title?.trim() || !body?.trim()) {
    return NextResponse.json({ error: 'title and body are required' }, { status: 400 })
  }

  const channelsNorm = (channels ?? ['push']).map((c: string) =>
    c.toLowerCase().replace(/[\s-]+/g, '_')
  )
  const status = scheduleMode === 'draft' ? 'draft' : 'sent'

  // 3. Insert announcement record
  const { data: ann, error: annErr } = await db
    .from('announcements')
    .insert({
      title:               title.trim(),
      body:                body.trim(),
      channels:            channelsNorm,
      deep_link:           deepLink?.trim() || null,
      // Only persist a real UUID segment_id — built-in string keys ('active' etc.) are not FK rows
      segment_id:          isUUID(segment) ? segment : null,
      segment_key:         segment,
      schedule_mode:       status === 'draft' ? 'draft' : 'now',
      status,
      sent_at:             status === 'sent' ? new Date().toISOString() : null,
      created_by_admin_id: adminRow.id,
    })
    .select('id')
    .single()

  if (annErr) return NextResponse.json({ error: annErr.message }, { status: 500 })

  // 4. Skip push delivery if this is a draft or push channel not selected
  const hasPush = channelsNorm.includes('push')
  if (status === 'draft' || !hasPush) {
    return NextResponse.json({ ok: true, sent: 0, hasPush, announcementId: ann.id })
  }

  // 5. Resolve which user_ids to target based on segment
  const SUBSCRIPTION_SEGMENTS = ['active', 'trial', 'overdue']
  let userIds: string[] | null = null

  if (segment === 'specific' && Array.isArray(explicitUserIds) && explicitUserIds.length > 0) {
    userIds = explicitUserIds
  } else if (SUBSCRIPTION_SEGMENTS.includes(segment)) {
    const { data: subs } = await db
      .from('subscriptions')
      .select('user_id')
      .eq('status', segment)
    userIds = subs?.map((s: { user_id: string }) => s.user_id) ?? []
    if (userIds.length === 0) {
      return NextResponse.json({ ok: true, sent: 0, hasPush: true, announcementId: ann.id })
    }
  }
  // 'all' → no userIds filter; custom UUID segment → send to all for now

  // 6. Fetch push tokens
  // For 'specific' segment, admin has explicitly chosen recipients — bypass the
  // announcements opt-out preference. For broadcast segments ('all', subscriptions),
  // respect it so users who opted out are not disturbed.
  let q = db
    .from('notification_preferences')
    .select('push_token')
    .not('push_token', 'is', null)
  if (segment !== 'specific') q = q.eq('announcements', true)
  if (userIds) q = q.in('user_id', userIds)

  const { data: prefs } = await q
  const tokens = (prefs ?? [])
    .map((p: { push_token: string }) => p.push_token)
    .filter((t: string) => t?.startsWith('ExponentPushToken['))

  if (tokens.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, hasPush: true, announcementId: ann.id })
  }

  // 7. Batch-send via send-push Supabase Edge Function (100 tokens per call)
  // SUPABASE_EDGE_KEY must be the JWT-format service role key (eyJ…) from the
  // Supabase dashboard — the newer sb_secret_* key is not accepted by the
  // Edge Functions gateway which requires a valid JWT.
  const sendPushUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-push`
  const serviceKey = process.env.SUPABASE_EDGE_KEY ?? process.env.SUPABASE_SECRET_KEY!
  let sent = 0
  let errors = 0

  for (let i = 0; i < tokens.length; i += EXPO_PUSH_BATCH) {
    const batch = tokens.slice(i, i + EXPO_PUSH_BATCH)
    try {
      const res = await fetch(sendPushUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          to:    batch,
          title: title.trim(),
          body:  body.trim(),
          data:  deepLink?.trim() ? { url: deepLink.trim() } : {},
        }),
      })
      if (res.ok) sent += batch.length
      else errors += batch.length
    } catch {
      errors += batch.length
    }
  }

  return NextResponse.json({ ok: true, sent, errors, announcementId: ann.id })
}
