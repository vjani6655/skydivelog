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

  const { data: prefs, error: prefsErr } = await q
  console.log('[send-announcement] prefs query rows:', prefs?.length ?? 0, 'error:', prefsErr?.message ?? null, 'userIds:', userIds)

  const tokens = (prefs ?? [])
    .map((p: { push_token: string }) => p.push_token)
    .filter((t: string) => t?.startsWith('ExponentPushToken['))

  console.log('[send-announcement] valid tokens found:', tokens.length)

  if (tokens.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, tokenCount: 0, hasPush: true, announcementId: ann.id })
  }

  // 7. Look up user_ids for notification inbox rows
  const { data: tokenPrefs } = await db
    .from('notification_preferences')
    .select('user_id, push_token')
    .in('push_token', tokens)

  const tokenToUser = new Map<string, string>()
  ;(tokenPrefs ?? []).forEach((p: { user_id: string; push_token: string }) => {
    tokenToUser.set(p.push_token, p.user_id)
  })

  // 8. Insert notification inbox rows
  const inboxRows = tokens
    .filter(t => tokenToUser.has(t))
    .map(t => ({
      user_id: tokenToUser.get(t)!,
      title:   title.trim(),
      body:    body.trim(),
      data:    deepLink?.trim() ? { url: deepLink.trim() } : {},
    }))

  if (inboxRows.length > 0) {
    await db.from('notifications').insert(inboxRows)
  }

  // 9. Send directly to Expo Push API in batches
  const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'
  let sent = 0
  let errors = 0

  for (let i = 0; i < tokens.length; i += EXPO_PUSH_BATCH) {
    const batch = tokens.slice(i, i + EXPO_PUSH_BATCH)
    const messages = batch.map(to => ({
      to,
      title: title.trim(),
      body:  body.trim(),
      sound: 'default',
      data:  deepLink?.trim() ? { url: deepLink.trim() } : {},
    }))
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept':        'application/json',
        },
        body: JSON.stringify(messages),
      })
      if (res.ok) {
        sent += batch.length
      } else {
        const errBody = await res.text().catch(() => '')
        console.error('[send-announcement] expo error:', res.status, errBody)
        errors += batch.length
      }
    } catch (e) {
      console.error('[send-announcement] expo threw:', e)
      errors += batch.length
    }
  }

  console.log('[send-announcement] sent:', sent, 'errors:', errors)
  return NextResponse.json({ ok: true, sent, errors, tokenCount: tokens.length, announcementId: ann.id })
}
