/**
 * instructor-sign — cross-user jump signing relay
 *
 * All operations are gated by knowing the jump UUID (unguessable) plus a
 * 5-minute time token that matches the one encoded in the QR code. This lets
 * an instructor use their OWN device/account to read and sign a student's jump
 * without any RLS grants on the jumps table.
 *
 * POST body (JSON):
 *   action  'get' | 'sign'
 *   jumpId  string    UUID of the jump
 *   t       number    time token = Math.floor(Date.now() / (5*60*1000))
 *
 * For action = 'sign', additionally:
 *   signature_data        string   SVG path string
 *   signer_name           string
 *   signer_licence_number string
 *   outcome               'pass' | 'repeat' | null
 *   notes                 string | null
 *
 * Auth: any valid Bearer (anon key or user JWT) — the time token is the
 *       real authorisation for this endpoint.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPIRES_IN = 5 * 60; // seconds — must match qr.tsx
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: CORS });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400, headers: CORS });
  }

  const { action, jumpId, t } = body as {
    action: string;
    jumpId: string;
    t: number;
  };

  if (!action || !jumpId || t == null) {
    return new Response('Missing fields: action, jumpId, t', { status: 400, headers: CORS });
  }

  // ── Token validation ────────────────────────────────────────────────────────
  // Accept the current window OR the immediately preceding one (handles the
  // edge case where QR was generated just before a window boundary).
  const now = Math.floor(Date.now() / (EXPIRES_IN * 1000));
  if (t !== now && t !== now - 1) {
    return new Response(
      JSON.stringify({ error: 'QR code has expired. Ask the jumper to refresh it.' }),
      { status: 403, headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  }

  // ── Service-role DB client (bypasses RLS) ───────────────────────────────────
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  // ── GET jump data ───────────────────────────────────────────────────────────
  if (action === 'get') {
    const { data, error } = await db
      .from('jumps')
      .select('*, dropzones(name, region, latitude, longitude)')
      .eq('id', jumpId)
      .single();

    if (error || !data) {
      return new Response(
        JSON.stringify({ error: 'Jump not found.' }),
        { status: 404, headers: { ...CORS, 'Content-Type': 'application/json' } },
      );
    }

    // Also fetch edits
    const { data: edits } = await db
      .from('jump_edits')
      .select('*')
      .eq('jump_id', jumpId)
      .order('edited_at', { ascending: false });

    return new Response(
      JSON.stringify({ jump: data, edits: edits ?? [] }),
      { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  }

  // ── SIGN ─────────────────────────────────────────────────────────────────────
  if (action === 'sign') {
    const {
      signature_data,
      signer_name,
      signer_licence_number,
      outcome,
      notes,
    } = body as {
      signature_data: string;
      signer_name: string;
      signer_licence_number: string;
      outcome: string | null;
      notes: string | null;
    };

    if (!signature_data || !signer_name) {
      return new Response('Missing signature_data or signer_name', { status: 400, headers: CORS });
    }

    // Look up the jump to get the owner's user_id (for the push notification)
    const { data: jumpRow } = await db
      .from('jumps')
      .select('user_id, jump_number')
      .eq('id', jumpId)
      .single();

    if (!jumpRow) {
      return new Response(JSON.stringify({ error: 'Jump not found.' }), {
        status: 404, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // Insert signature
    const { error: sigError } = await db.from('signatures').insert({
      jump_id: jumpId,
      signature_data,
      signer_name: signer_name.trim(),
      signer_licence_number: (signer_licence_number ?? '').trim(),
      signer_licence_rating: null,
      signer_user_id: null,
      outcome: outcome ?? null,
      notes: notes ?? null,
    });

    if (sigError) {
      return new Response(
        JSON.stringify({ error: sigError.message }),
        { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
      );
    }

    // Clear draft flag
    await db.from('jumps').update({ is_draft: false }).eq('id', jumpId);

    // Send push notification to jump owner (best-effort)
    try {
      const { data: pref } = await db
        .from('notification_preferences')
        .select('push_token')
        .eq('user_id', jumpRow.user_id)
        .maybeSingle();

      if (pref?.push_token) {
        const notifId = crypto.randomUUID();
        await db.from('notifications').insert({
          id: notifId,
          user_id: jumpRow.user_id,
          title: `Jump #${jumpRow.jump_number} signed ✅`,
          body: `Signed by ${signer_name.trim()}`,
          data: { url: `/(tabs)/log/${jumpId}`, notification_id: notifId },
        });

        await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: pref.push_token,
            title: `Jump #${jumpRow.jump_number} signed ✅`,
            body: `Signed by ${signer_name.trim()}`,
            data: { url: `/(tabs)/log/${jumpId}`, notification_id: notifId },
            sound: 'default',
          }),
        });
      }
    } catch { /* non-critical */ }

    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  }

  return new Response('Unknown action', { status: 400, headers: CORS });
});
