import { createHmac, timingSafeEqual } from 'crypto'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail, ticketInboundReplyEmail } from '@/lib/email'

// Resend inbound webhook payload — the body field is NOT included.
// We must call the Resend API to fetch the email content.
// See: https://resend.com/docs/dashboard/receiving/get-email-content

export const dynamic = 'force-dynamic'

/**
 * Verify a Resend / Svix webhook signature using Node's built-in crypto.
 * Svix signs: `${svix-id}.${svix-timestamp}.${rawBody}`
 * Key: base64-decode the part after "whsec_"
 * Signature header: space-separated list of "v1,<base64>" entries
 */
function verifyResendSignature(
  rawBody: string,
  headers: Headers,
  secret: string,
): boolean {
  const msgId = headers.get('svix-id')
  const timestamp = headers.get('svix-timestamp')
  const sigHeader = headers.get('svix-signature')
  if (!msgId || !timestamp || !sigHeader) return false

  // Reject timestamps older than 5 minutes
  const ts = parseInt(timestamp, 10)
  if (isNaN(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return false

  const keyBytes = Buffer.from(secret.replace(/^whsec_/, ''), 'base64')
  const toSign = `${msgId}.${timestamp}.${rawBody}`
  const expected = createHmac('sha256', keyBytes).update(toSign).digest('base64')

  return sigHeader
    .split(' ')
    .some(sig => {
      const b64 = sig.replace(/^v1,/, '')
      try {
        return timingSafeEqual(Buffer.from(b64, 'base64'), Buffer.from(expected, 'base64'))
      } catch {
        return false
      }
    })
}

/** Strip quoted reply content from plain-text email bodies. */
function stripQuotedText(raw: string): string {
  // Normalize line endings
  const normalized = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  // Gmail wraps long "On <date>, <name> wrote:" headers across multiple lines.
  // Collapse those first so the single-line pattern can match.
  const collapsed = normalized.replace(/\nOn (.|\n)*?wrote:\s*\n/m, (match) => {
    // If it looks like a quote header, replace the whole block with a sentinel
    if (/wrote:\s*$/.test(match.trimEnd())) return '\n__QUOTE_START__\n'
    return match
  })

  const lines = collapsed.split('\n')
  const cutPatterns = [
    /^__QUOTE_START__$/,
    /^On .+wrote:\s*$/,
    /^>.*$/,
    /^-{3,}/,
    /^_{3,}/,
    /^From:\s/i,
    /^Sent:\s/i,
  ]
  const cutAt = lines.findIndex(l => cutPatterns.some(p => p.test(l.trim())))
  return (cutAt > 0 ? lines.slice(0, cutAt) : lines).join('\n').trim()
}

/** Parse "Name <email@example.com>" or plain "email@example.com" */
function parseEmail(raw: string): { name: string; email: string } {
  const match = raw.match(/^(.+?)\s*<([^>]+)>/)
  if (match) return { name: match[1].trim(), email: match[2].trim().toLowerCase() }
  return { name: raw.trim(), email: raw.trim().toLowerCase() }
}

/** Fetch the full email content from Resend — the webhook only delivers metadata. */
async function fetchEmailContent(emailId: string) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error('RESEND_API_KEY not set')
  const res = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (!res.ok) throw new Error(`Resend API error ${res.status}: ${await res.text()}`)
  return res.json() as Promise<{
    from: string
    to: string[]
    subject: string
    text: string | null
    html: string | null
  }>
}

export async function POST(req: Request) {
  const rawBody = await req.text()
  console.log('[inbound] webhook hit — body length:', rawBody.length)

  // Log which env vars are present (not their values)
  console.log('[inbound] env check — RESEND_WEBHOOK_SIGNING_SECRET:', !!process.env.RESEND_WEBHOOK_SIGNING_SECRET, '| INBOUND_WEBHOOK_SECRET:', !!process.env.INBOUND_WEBHOOK_SECRET, '| INBOUND_EMAIL_DOMAIN:', process.env.INBOUND_EMAIL_DOMAIN ?? '(not set)', '| RESEND_API_KEY:', !!process.env.RESEND_API_KEY)

  // Verify Resend webhook signature (whsec_ signing secret from Resend dashboard)
  const signingSecret = process.env.RESEND_WEBHOOK_SIGNING_SECRET
  if (signingSecret) {
    const svixId = req.headers.get('svix-id')
    const svixTs = req.headers.get('svix-timestamp')
    const svixSig = req.headers.get('svix-signature')
    console.log('[inbound] svix headers — id:', svixId, '| ts:', svixTs, '| sig present:', !!svixSig)
    const valid = verifyResendSignature(rawBody, req.headers, signingSecret)
    console.log('[inbound] signature valid:', valid)
    if (!valid) {
      console.warn('[inbound] REJECTED — invalid signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
  } else {
    console.log('[inbound] no signing secret — falling back to URL secret check')
    // Fallback: URL secret check
    const url = new URL(req.url)
    const urlSecret = process.env.INBOUND_WEBHOOK_SECRET
    const provided = url.searchParams.get('secret')
    const match = urlSecret ? provided === urlSecret : true
    console.log('[inbound] url secret match:', match, '| secret param present:', !!provided, '| env secret set:', !!urlSecret)
    if (urlSecret && !match) {
      console.warn('[inbound] REJECTED — URL secret mismatch')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  let event: { type: string; data: { email_id: string } }
  try {
    event = JSON.parse(rawBody)
  } catch {
    console.error('[inbound] failed to parse JSON body')
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  console.log('[inbound] event type:', event.type)

  if (event.type !== 'email.received') {
    console.log('[inbound] ignoring non-email event:', event.type)
    return NextResponse.json({ ok: true, ignored: true })
  }

  const emailId = event.data?.email_id
  console.log('[inbound] email_id:', emailId)
  if (!emailId) return NextResponse.json({ error: 'Missing email_id' }, { status: 400 })

  // Fetch actual email content from Resend API
  let emailContent: Awaited<ReturnType<typeof fetchEmailContent>>
  try {
    emailContent = await fetchEmailContent(emailId)
  } catch (err) {
    console.error('[inbound] failed to fetch email content:', err)
    return NextResponse.json({ error: 'Failed to fetch email content' }, { status: 500 })
  }

  const toAddress = emailContent.to?.[0] ?? ''
  const fromRaw = emailContent.from ?? ''
  console.log('[inbound] email — to:', toAddress, '| from:', fromRaw, '| subject:', emailContent.subject)

  // Extract ticket ID from address: ticket+{uuid}@reply.jumplogs.com
  const ticketMatch = toAddress.match(/ticket\+([a-f0-9-]{36})@/i)
  console.log('[inbound] ticket address match:', !!ticketMatch, ticketMatch ? ticketMatch[1] : '(none)')
  if (!ticketMatch) {
    // If someone replied to a noreply address, forward it to the support inbox
    if (/noreply@/i.test(toAddress)) {
      const { name: fromName, email: fromEmail } = parseEmail(fromRaw)
      const rawText = emailContent.text ?? emailContent.html?.replace(/<[^>]+>/g, ' ') ?? ''
      const messageText = stripQuotedText(rawText)
      if (messageText && fromEmail) {
        const subject = emailContent.subject ?? '(no subject)'
        await sendEmail({
          to: process.env.ADMIN_NOTIFY_EMAIL ?? 'noreply@jumplogs.com',
          subject: `[Forwarded reply-to-noreply] ${subject}`,
          from: 'support',
          html: `<p style="font-family:sans-serif;font-size:13px;color:#555">
            A user replied to a noreply address. Forwarded for your attention.
          </p>
          <table style="font-size:13px;margin-bottom:12px">
            <tr><td style="color:#888;padding-right:12px">From</td><td>${fromName ? `${fromName} &lt;${fromEmail}&gt;` : fromEmail}</td></tr>
            <tr><td style="color:#888;padding-right:12px">To</td><td>${toAddress}</td></tr>
            <tr><td style="color:#888;padding-right:12px">Subject</td><td>${subject}</td></tr>
          </table>
          <div style="background:#f5f5f5;border-radius:6px;padding:16px;font-size:13px;white-space:pre-wrap">${messageText}</div>`,
        })
        console.log('[inbound] forwarded noreply reply from', fromEmail)
      }
    }
    return NextResponse.json({ ok: true, ignored: true, reason: 'not a ticket address' })
  }
  const ticketId = ticketMatch[1]

  const { name: fromName, email: fromEmail } = parseEmail(fromRaw)

  const rawText = emailContent.text ?? emailContent.html?.replace(/<[^>]+>/g, ' ') ?? ''
  const replyText = stripQuotedText(rawText)

  if (!replyText) {
    return NextResponse.json({ ok: true, ignored: true, reason: 'empty after stripping quotes' })
  }

  const admin = createAdminClient()

  const { data: ticket, error: ticketErr } = await admin
    .from('support_tickets')
    .select('id, user_id, email, name, subject, category, status')
    .eq('id', ticketId)
    .single()

  if (ticketErr || !ticket) {
    console.error('[inbound] ticket not found:', ticketId)
    return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
  }

  console.log('[inbound] ticket found:', ticketId, '| status:', ticket.status, '| ticket email:', ticket.email, '| sender:', fromEmail)

  // Verify sender matches ticket email
  if (ticket.email && ticket.email.toLowerCase() !== fromEmail) {
    console.warn('[inbound] sender mismatch — ignoring:', fromEmail, 'vs', ticket.email)
    return NextResponse.json({ ok: true, ignored: true, reason: 'sender mismatch' })
  }

  // If ticket is resolved, send auto-reply and do NOT reopen
  if (ticket.status === 'closed') {
    const shortId = ticketId.slice(-6).toUpperCase()
    await sendEmail({
      to: fromEmail,
      subject: `Re: Ticket #${shortId} — ${ticket.category}`,
      html: `
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111">
  <p style="font-size:15px">Hi ${ticket.name ?? fromName},</p>
  <p style="font-size:14px;color:#555">
    Ticket <strong>#${shortId}</strong> has already been marked as resolved, so we weren't able to add your reply to the thread.
  </p>
  <p style="font-size:14px;color:#555">
    If you need further help, please open a new ticket at
    <a href="https://jumplogs.com/contact" style="color:#2563eb">jumplogs.com/contact</a>.
  </p>
  <p style="font-size:12px;color:#999;margin-top:32px">— The Jump Logs team</p>
</div>`,
    })
    return NextResponse.json({ ok: true, action: 'auto_replied_resolved' })
  }

  // Insert message into thread
  const { data: newMsg, error: insertErr } = await admin
    .from('ticket_messages')
    .insert({ ticket_id: ticketId, sender_id: ticket.user_id ?? null, message: replyText })
    .select()
    .single()

  if (insertErr) {
    console.error('[inbound] insert error:', insertErr)
    return NextResponse.json({ error: 'DB insert failed' }, { status: 500 })
  }

  // Reopen ticket so admin sees it needs attention
  await admin.from('support_tickets').update({ status: 'open' }).eq('id', ticketId)

  // Notify admin
  const notif = ticketInboundReplyEmail({
    fromName: ticket.name ?? fromName,
    fromEmail,
    ticketId,
    topic: ticket.category,
    replyText,
  })
  await sendEmail(notif)

  console.log('[inbound] reply added to ticket', ticketId, '— msg id', newMsg?.id)
  return NextResponse.json({ ok: true, messageId: newMsg?.id })
}
