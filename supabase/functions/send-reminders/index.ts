/**
 * send-reminders — scheduled push notification checker
 *
 * Run daily via Supabase cron (pg_cron or Dashboard > Integrations > Cron):
 *   SELECT cron.schedule('daily-reminders', '0 9 * * *',
 *     $$SELECT net.http_post(
 *       url := current_setting('app.supabase_url') || '/functions/v1/send-reminders',
 *       headers := jsonb_build_object(
 *         'Content-Type', 'application/json',
 *         'Authorization', 'Bearer ' || current_setting('app.service_role_key')
 *       ),
 *       body := '{}'::jsonb
 *     )$$
 *   );
 *
 * Checks three reminder types each run:
 *   1. Certificate expiry  — certificates.expires_date within cert_expiry_warning_days
 *   2. Repack due          — gear (rig) whose last_repack_date + 180d is within repack_reminder_days
 *   3. Currency alert      — last jump was more than currency_alert_months * 30 days ago
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SEND_PUSH_URL = `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-push`;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

async function sendPush(to: string, title: string, body: string, data?: Record<string, unknown>) {
  await fetch(SEND_PUSH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SERVICE_KEY}` },
    body: JSON.stringify({ to, title, body, data }),
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Authorization, Content-Type' },
    });
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  if (authHeader !== `Bearer ${SERVICE_KEY}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    SERVICE_KEY,
    { auth: { persistSession: false } },
  );

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD

  let sent = 0;

  // ── 1. Certificate expiry warnings ───────────────────────────────────────────
  const { data: certRows } = await supabase
    .from('notification_preferences')
    .select(`
      user_id, push_token,
      users!inner ( cert_expiry_warning_days ),
      certificates!inner (
        title, expires_date
      )
    `)
    .eq('expiry_warnings', true)
    .not('push_token', 'is', null);

  // NOTE: The join above isn't valid Supabase syntax — use a raw RPC instead
  // Simple approach: pull prefs then query per user (acceptable for small user bases)
  const { data: expiryPrefs } = await supabase
    .from('notification_preferences')
    .select('user_id, push_token, users(cert_expiry_warning_days)')
    .eq('expiry_warnings', true)
    .not('push_token', 'is', null);

  for (const pref of expiryPrefs ?? []) {
    if (!pref.push_token) continue;
    const warningDays: number = (pref.users as any)?.cert_expiry_warning_days ?? 30;
    const cutoff = new Date(today);
    cutoff.setDate(cutoff.getDate() + warningDays);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    const { data: certs } = await supabase
      .from('certificates')
      .select('title, expires_date')
      .eq('user_id', pref.user_id)
      .not('expires_date', 'is', null)
      .lte('expires_date', cutoffStr)
      .gte('expires_date', todayStr); // not already expired

    for (const cert of certs ?? []) {
      const daysLeft = Math.round(
        (new Date(cert.expires_date).getTime() - today.getTime()) / 86_400_000,
      );
      await sendPush(
        pref.push_token,
        'Certificate expiring soon',
        `${cert.title} expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}.`,
        { url: '/(tabs)/certificates' },
      );
      sent++;
    }
  }

  // ── 2. Repack due alerts ──────────────────────────────────────────────────────
  const { data: repackPrefs } = await supabase
    .from('notification_preferences')
    .select('user_id, push_token, users(repack_reminder_days)')
    .eq('repack_reminders', true)
    .not('push_token', 'is', null);

  const REPACK_CYCLE_DAYS = 180; // standard 6-month parachute repack cycle

  for (const pref of repackPrefs ?? []) {
    if (!pref.push_token) continue;
    const warningDays: number = (pref.users as any)?.repack_reminder_days ?? 30;

    const { data: rigs } = await supabase
      .from('gear')
      .select('make_model, last_repack_date')
      .eq('user_id', pref.user_id)
      .eq('type', 'rig')
      .eq('repack_reminder_enabled', true)
      .not('last_repack_date', 'is', null);

    for (const rig of rigs ?? []) {
      const dueDate = new Date(rig.last_repack_date);
      dueDate.setDate(dueDate.getDate() + REPACK_CYCLE_DAYS);
      const dueDateStr = dueDate.toISOString().split('T')[0];

      const windowStart = new Date(today);
      windowStart.setDate(windowStart.getDate() - 1); // small buffer for daily runs

      const windowCutoff = new Date(today);
      windowCutoff.setDate(windowCutoff.getDate() + warningDays);
      const windowCutoffStr = windowCutoff.toISOString().split('T')[0];

      if (dueDateStr >= todayStr && dueDateStr <= windowCutoffStr) {
        const daysLeft = Math.round(
          (dueDate.getTime() - today.getTime()) / 86_400_000,
        );
        await sendPush(
          pref.push_token,
          'Repack due soon',
          `${rig.make_model} is due for repack in ${daysLeft} day${daysLeft === 1 ? '' : 's'}.`,
          { url: '/(tabs)/gear' },
        );
        sent++;
      }
    }
  }

  // ── 3. Currency alerts ────────────────────────────────────────────────────────
  const { data: currencyPrefs } = await supabase
    .from('notification_preferences')
    .select('user_id, push_token, users(currency_alert_months)')
    .eq('currency_alerts', true)
    .not('push_token', 'is', null);

  for (const pref of currencyPrefs ?? []) {
    if (!pref.push_token) continue;
    const alertMonths: number = (pref.users as any)?.currency_alert_months ?? 1;
    const alertDays = alertMonths * 30;

    const thresholdDate = new Date(today);
    thresholdDate.setDate(thresholdDate.getDate() - alertDays);
    const thresholdStr = thresholdDate.toISOString().split('T')[0];

    const { data: lastJump } = await supabase
      .from('jumps')
      .select('date')
      .eq('user_id', pref.user_id)
      .is('deleted_at', null)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!lastJump) continue; // no jumps at all — don't alert

    const lastJumpDate = lastJump.date.split('T')[0];
    if (lastJumpDate <= thresholdStr) {
      const daysSince = Math.round(
        (today.getTime() - new Date(lastJump.date).getTime()) / 86_400_000,
      );
      await sendPush(
        pref.push_token,
        "You haven't jumped recently",
        `It's been ${daysSince} days since your last jump. Time to get back in the air!`,
        { url: '/(tabs)/log' },
      );
      sent++;
    }
  }

  return new Response(JSON.stringify({ ok: true, sent }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
