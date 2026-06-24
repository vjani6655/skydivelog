// Email sending: Resend (existing) + Zoho SMTP via nodemailer (new).
// Resend handles transactional/support emails; Zoho handles account-deletion exports.
// Requires RESEND_API_KEY, ZOHO_SMTP_USER, ZOHO_SMTP_PASSWORD in .env.local

import nodemailer from 'nodemailer'

const zohoTransporter = nodemailer.createTransport({
  host: 'smtp.zoho.com.au',
  port: 465,
  secure: true,
  auth: {
    user: process.env.ZOHO_SMTP_USER,
    pass: process.env.ZOHO_SMTP_PASSWORD,
  },
})

export interface ZohoAttachment {
  filename: string
  content:  Buffer
  contentType: string
}

export async function sendEmailViaZoho({
  to,
  subject,
  html,
  bcc,
  attachments,
}: {
  to:           string
  subject:      string
  html:         string
  bcc?:         string
  attachments?: ZohoAttachment[]
}): Promise<void> {
  if (!process.env.ZOHO_SMTP_USER || !process.env.ZOHO_SMTP_PASSWORD) {
    console.warn('[email-zoho] ZOHO_SMTP_USER/PASSWORD not set — skipping')
    return
  }
  await zohoTransporter.sendMail({
    from:        'JumpLogs No-Reply <noreply@jumplogs.com>',
    to,
    bcc,
    subject,
    html,
    attachments,
  })
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

const FROM_SUPPORT   = 'JumpLogs Support <support@app.jumplogs.com>'
const FROM_NOREPLY   = 'JumpLogs No-Reply <noreply@app.jumplogs.com>'
const ADMIN_EMAIL    = process.env.ADMIN_NOTIFY_EMAIL    ?? 'support@app.jumplogs.com'
const INBOUND_DOMAIN = process.env.INBOUND_EMAIL_DOMAIN  ?? 'app.jumplogs.com'

/** Per-ticket reply-to address — encodes the ticket ID so inbound replies route back automatically. */
export function ticketReplyAddress(ticketId: string) {
  return `ticket+${ticketId}@${INBOUND_DOMAIN}`
}

interface SendOptions {
  to: string
  subject: string
  html: string
  replyTo?: string
  from?: 'support' | 'noreply'
}

export async function sendEmail({ to, subject, html, replyTo, from = 'support' }: SendOptions) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('[email] RESEND_API_KEY not set — skipping email send')
    return
  }
  const fromAddress = from === 'noreply' ? FROM_NOREPLY : FROM_SUPPORT
  const body: Record<string, unknown> = { from: fromAddress, to, subject, html }
  if (replyTo) body.reply_to = replyTo
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.text()
    console.error('[email] send failed:', err)
  }
}

// ── Email templates ────────────────────────────────────────────────────────────

export function ticketConfirmationEmail({
  name,
  topic,
  message,
  ticketId,
}: {
  name: string
  topic: string
  message: string
  ticketId: string
}) {
  const shortId = ticketId.slice(-6).toUpperCase()
  const safeName = escapeHtml(name)
  const safeTopic = escapeHtml(topic)
  const safeMessage = escapeHtml(message)
  return {
    subject: `We got your message — Ticket #${shortId}`,
    replyTo: ticketReplyAddress(ticketId),
    html: `
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111">
  <p style="font-size:15px">Hi ${safeName},</p>
  <p style="font-size:14px;color:#555">
    Thanks for reaching out. We've received your message and will get back to you within 5 working days.
  </p>
  <div style="background:#f5f5f5;border-radius:6px;padding:16px 20px;margin:20px 0">
    <p style="margin:0 0 6px 0;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#888">Ticket #${shortId} · ${safeTopic}</p>
    <p style="margin:0;font-size:13px;color:#333;white-space:pre-wrap">${safeMessage}</p>
  </div>
  <p style="font-size:13px;color:#555">
    You can reply directly to this email to add more details — your reply will appear in the ticket thread.
  </p>
  <p style="font-size:12px;color:#999;margin-top:32px">— The Jump Logs team</p>
</div>`,
  }
}

export function ticketAdminNotificationEmail({
  name,
  email,
  topic,
  message,
  ticketId,
}: {
  name: string
  email: string
  topic: string
  message: string
  ticketId: string
}) {
  const shortId = ticketId.slice(-6).toUpperCase()
  const safeName = escapeHtml(name)
  const safeEmail = escapeHtml(email)
  const safeTopic = escapeHtml(topic)
  const safeMessage = escapeHtml(message)
  return {
    to: ADMIN_EMAIL,
    subject: `[${topic}] New ticket #${shortId} from ${name}`,
    replyTo: ticketReplyAddress(ticketId),
    html: `
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111">
  <p style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#888">New support ticket</p>
  <h2 style="margin:4px 0 16px;font-size:18px">Ticket #${shortId} · ${safeTopic}</h2>
  <table style="font-size:13px;border-collapse:collapse;margin-bottom:16px">
    <tr><td style="padding:3px 12px 3px 0;color:#888">From</td><td>${safeName}</td></tr>
    <tr><td style="padding:3px 12px 3px 0;color:#888">Email</td><td>${safeEmail}</td></tr>
    <tr><td style="padding:3px 12px 3px 0;color:#888">Topic</td><td>${safeTopic}</td></tr>
  </table>
  <div style="background:#f5f5f5;border-radius:6px;padding:16px 20px">
    <p style="margin:0;font-size:13px;color:#333;white-space:pre-wrap">${safeMessage}</p>
  </div>
  <p style="margin-top:20px">
    <a href="https://jumplogs.com/admin/support" style="font-size:13px;color:#2563eb">View in admin →</a>
  </p>
</div>`,
  }
}

export function ticketReplyEmail({
  name,
  replyMessage,
  ticketId,
  topic,
}: {
  name: string
  replyMessage: string
  ticketId: string
  topic: string
}) {
  const shortId = ticketId.slice(-6).toUpperCase()
  const safeName = escapeHtml(name)
  const safeReply = escapeHtml(replyMessage)
  return {
    subject: `Re: Your ticket #${shortId} — ${topic}`,
    replyTo: ticketReplyAddress(ticketId),
    html: `
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111">
  <p style="font-size:15px">Hi ${safeName},</p>
  <p style="font-size:14px;color:#555">We've replied to your support ticket:</p>
  <div style="background:#eff6ff;border-left:3px solid #2563eb;border-radius:0 6px 6px 0;padding:16px 20px;margin:20px 0">
    <p style="margin:0 0 6px 0;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#2563eb">Jump Logs Support · Ticket #${shortId}</p>
    <p style="margin:0;font-size:13px;color:#333;white-space:pre-wrap">${safeReply}</p>
  </div>
  <p style="font-size:13px;color:#555">Reply directly to this email to continue the conversation — your reply will appear in the ticket thread.</p>
  <p style="font-size:12px;color:#999;margin-top:32px">— The Jump Logs team</p>
</div>`,
  }
}

export function ticketResolvedEmail({
  name,
  ticketId,
  topic,
}: {
  name: string
  ticketId: string
  topic: string
}) {
  const shortId = ticketId.slice(-6).toUpperCase()
  const safeName = escapeHtml(name)
  return {
    subject: `Ticket #${shortId} resolved — ${topic}`,
    html: `
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111">
  <p style="font-size:15px">Hi ${safeName},</p>
  <p style="font-size:14px;color:#555">
    Your support ticket <strong>#${shortId}</strong> has been marked as resolved.
  </p>
  <p style="font-size:14px;color:#555">
    This conversation has been marked as resolved. You can always open another ticket from our contact page at
    <a href="https://jumplogs.com/contact" style="color:#2563eb">jumplogs.com/contact</a>.
  </p>
  <p style="font-size:12px;color:#999;margin-top:32px">— The Jump Logs team</p>
</div>`,
  }
}

/** Sent to admin when a user replies to a ticket via email. */
export function ticketInboundReplyEmail({
  fromName,
  fromEmail,
  ticketId,
  topic,
  replyText,
}: {
  fromName: string
  fromEmail: string
  ticketId: string
  topic: string
  replyText: string
}) {
  const shortId = ticketId.slice(-6).toUpperCase()
  const safeFromName = escapeHtml(fromName)
  const safeFromEmail = escapeHtml(fromEmail)
  const safeTopic = escapeHtml(topic)
  const safeReplyText = escapeHtml(replyText)
  return {
    to: ADMIN_EMAIL,
    subject: `[Reply] Ticket #${shortId} — ${topic}`,
    replyTo: fromEmail,
    html: `
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111">
  <p style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#888">User replied via email</p>
  <h2 style="margin:4px 0 4px;font-size:18px">Ticket #${shortId} · ${safeTopic}</h2>
  <p style="font-size:12px;color:#888;margin:0 0 16px">From ${safeFromName} &lt;${safeFromEmail}&gt;</p>
  <div style="background:#f5f5f5;border-radius:6px;padding:16px 20px;margin:0 0 20px">
    <p style="margin:0;font-size:13px;color:#333;white-space:pre-wrap">${safeReplyText}</p>
  </div>
  <a href="https://jumplogs.com/admin/support" style="font-size:13px;color:#2563eb">View &amp; reply in admin →</a>
</div>`,
  }
}
