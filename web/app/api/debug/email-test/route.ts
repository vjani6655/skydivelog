/**
 * Debug endpoint — tests the full ticket email flow step by step.
 * REMOVE OR PROTECT BEFORE GOING PUBLIC.
 *
 * GET  /api/debug/email-test?ticketId=<uuid>   — test outbound reply email for a ticket
 * POST /api/debug/email-test                   — simulate an inbound user reply
 *      body: { ticketId: string, message: string }
 */

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ticketReplyEmail, ticketReplyAddress } from '@/lib/email'

export const dynamic = 'force-dynamic'

// Only allow in non-production or when DEBUG_EMAIL_TEST secret matches
function isAllowed(req: Request): boolean {
  const secret = process.env.DEBUG_EMAIL_TEST_SECRET ?? process.env.INBOUND_WEBHOOK_SECRET
  if (!secret) return process.env.NODE_ENV !== 'production'
  const url = new URL(req.url)
  return url.searchParams.get('secret') === secret
}

export async function GET(req: Request) {
  if (!isAllowed(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const url = new URL(req.url)
  const ticketId = url.searchParams.get('ticketId')
  if (!ticketId) {
    return NextResponse.json({ error: 'ticketId query param required' }, { status: 400 })
  }

  const db = createAdminClient()
  const results: Record<string, unknown> = {}

  // 1. Fetch ticket
  const { data: ticket, error: ticketErr } = await db
    .from('support_tickets')
    .select('id, user_id, name, email, subject, category, status')
    .eq('id', ticketId)
    .maybeSingle()

  results.ticket_lookup = ticket ? {
    found: true,
    id: ticket.id,
    status: ticket.status,
    email: ticket.email,
    name: ticket.name,
    user_id: ticket.user_id,
    category: ticket.category,
  } : { found: false, error: ticketErr?.message }

  if (!ticket) return NextResponse.json(results)

  // 2. Resolve email (same logic as reply route)
  let recipientEmail = ticket.email ?? null
  let recipientName  = ticket.name ?? null
  if (!recipientEmail && ticket.user_id) {
    const { data: userRow, error: userErr } = await db
      .from('users')
      .select('email, full_name')
      .eq('id', ticket.user_id)
      .maybeSingle()
    results.user_lookup = { email: userRow?.email, full_name: userRow?.full_name, error: userErr?.message }
    recipientEmail = userRow?.email ?? null
    if (!recipientName) recipientName = userRow?.full_name ?? null
  } else {
    results.user_lookup = 'skipped — ticket.email already set'
  }

  results.resolved_recipient = { email: recipientEmail, name: recipientName }

  if (!recipientEmail) {
    results.email_send = 'SKIPPED — no email address found'
    return NextResponse.json(results)
  }

  // 3. Send test reply email
  const template = ticketReplyEmail({
    name: recipientName ?? 'there',
    replyMessage: '[DEBUG TEST] This is a test reply from the debug endpoint.',
    ticketId,
    topic: ticket.category,
  })

  results.reply_to_address = ticketReplyAddress(ticketId)
  results.email_template = { subject: template.subject, to: recipientEmail }

  // Call Resend directly so we can capture the actual response body
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    results.email_send = 'ERROR: RESEND_API_KEY not set'
  } else {
    const resendBody: Record<string, unknown> = {
      from: 'Jump Logs Support <support@jumplogs.com>',
      to: recipientEmail,
      subject: template.subject,
      html: template.html,
      reply_to: ticketReplyAddress(ticketId),
    }
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(resendBody),
    })
    const resendData = await resendRes.json()
    results.email_send = {
      status: resendRes.status,
      ok: resendRes.ok,
      response: resendData,
    }
  }

  // 4. Check env vars
  results.env_check = {
    RESEND_API_KEY:           process.env.RESEND_API_KEY ? `set (${process.env.RESEND_API_KEY.slice(0, 8)}...)` : 'MISSING',
    INBOUND_EMAIL_DOMAIN:     process.env.INBOUND_EMAIL_DOMAIN ?? 'MISSING',
    RESEND_WEBHOOK_SIGNING_SECRET: process.env.RESEND_WEBHOOK_SIGNING_SECRET ? 'set' : 'MISSING',
    INBOUND_WEBHOOK_SECRET:   process.env.INBOUND_WEBHOOK_SECRET ? 'set' : 'MISSING',
    ADMIN_NOTIFY_EMAIL:       process.env.ADMIN_NOTIFY_EMAIL ?? 'MISSING',
  }

  return NextResponse.json(results, { status: 200 })
}

export async function POST(req: Request) {
  if (!isAllowed(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { ticketId, message } = await req.json()
  if (!ticketId || !message) {
    return NextResponse.json({ error: 'ticketId and message required' }, { status: 400 })
  }

  const db = createAdminClient()
  const results: Record<string, unknown> = {}

  const { data: ticket, error: ticketErr } = await db
    .from('support_tickets')
    .select('id, user_id, name, email, subject, category, status')
    .eq('id', ticketId)
    .maybeSingle()

  if (!ticket) {
    return NextResponse.json({ error: 'Ticket not found', detail: ticketErr?.message }, { status: 404 })
  }
  results.ticket = { id: ticket.id, status: ticket.status, email: ticket.email, name: ticket.name }

  // Insert test message
  const { data: msg, error: insertErr } = await db
    .from('ticket_messages')
    .insert({ ticket_id: ticketId, sender_id: null, message: `[DEBUG INBOUND] ${message}` })
    .select()
    .single()

  results.insert_message = insertErr
    ? { ok: false, error: insertErr.message, hint: insertErr.hint, code: insertErr.code }
    : { ok: true, id: msg?.id }

  // Update status to open
  if (!insertErr) {
    const { error: updateErr } = await db
      .from('support_tickets')
      .update({ status: 'open' })
      .eq('id', ticketId)
    results.update_status = updateErr ? { ok: false, error: updateErr.message } : { ok: true }
  }

  return NextResponse.json(results)
}
