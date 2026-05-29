/**
 * send-push — generic Expo Push Notification relay
 *
 * POST body (JSON):
 *   to      string | string[]   Expo push token(s)
 *   title   string
 *   body    string
 *   data?   object              deep-link payload, e.g. { url: '/(tabs)/log/123' }
 *   sound?  'default' | null    defaults to 'default'
 *   badge?  number
 *
 * Called from:
 *   - The mobile app (after jump save, if jump_logged pref is on)
 *   - send-reminders function (for cert/repack/currency alerts)
 *   - Web admin (for announcements)
 *
 * Auth: Bearer <SUPABASE_SERVICE_ROLE_KEY>
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface PushPayload {
  to: string | string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  badge?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (authHeader !== `Bearer ${serviceKey}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  let payload: PushPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  if (!payload.to || !payload.title || !payload.body) {
    return new Response('Missing required fields: to, title, body', { status: 400 });
  }

  // Normalise to array and filter out blank / non-Expo tokens
  const tokens = (Array.isArray(payload.to) ? payload.to : [payload.to])
    .filter((t) => typeof t === 'string' && t.startsWith('ExponentPushToken['));

  if (tokens.length === 0) {
    return new Response(JSON.stringify({ ok: true, skipped: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Look up user IDs for all tokens so we can insert inbox rows before sending
  const db = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    serviceKey,
    { auth: { persistSession: false } },
  );

  const { data: prefs } = await db
    .from('notification_preferences')
    .select('user_id, push_token')
    .in('push_token', tokens);

  const tokenToUser = new Map<string, string>();
  (prefs ?? []).forEach((p: { user_id: string; push_token: string }) => {
    tokenToUser.set(p.push_token, p.user_id);
  });

  // Generate a UUID per token so we can include notification_id in the push
  // payload before we insert — no chicken-and-egg problem.
  const enriched = tokens.map((token) => {
    const userId = tokenToUser.get(token);
    const notifId = userId ? crypto.randomUUID() : undefined;
    return { token, userId, notifId };
  });

  // Insert notification inbox rows first (so the ID is known before push sends)
  const rows = enriched
    .filter((e) => e.userId && e.notifId)
    .map((e) => ({
      id: e.notifId,
      user_id: e.userId,
      title: payload.title,
      body: payload.body,
      // Store extra caller data + the notification's own ID so the app can
      // deep-link directly to this row.
      data: { ...(payload.data ?? {}), notification_id: e.notifId },
    }));

  if (rows.length > 0) {
    await db.from('notifications').insert(rows);
  }

  // Build push messages — include notification_id so tapping deep-links correctly
  const messages = enriched.map(({ token, notifId }) => ({
    to: token,
    title: payload.title,
    body: payload.body,
    data: { ...(payload.data ?? {}), ...(notifId ? { notification_id: notifId } : {}) },
    sound: payload.sound ?? 'default',
    ...(payload.badge !== undefined ? { badge: payload.badge } : {}),
  }));

  const res = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip, deflate',
    },
    body: JSON.stringify(messages),
  });

  const result = await res.json();

  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' },
    status: res.status,
  });
});
