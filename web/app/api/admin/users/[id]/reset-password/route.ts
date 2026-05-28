export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.jumplogs.com'

export async function POST(
  _req: Request,
  { params }: { params: { id: string } },
) {
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

  const { data: target } = await db
    .from('users')
    .select('email')
    .eq('id', params.id)
    .single()
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Use admin.generateLink to get the exact GoTrue action_link (no reconstruction).
  // This avoids any token-hash format uncertainty and works with implicit flow.
  const { data: linkData, error: linkErr } = await db.auth.admin.generateLink({
    type: 'recovery',
    email: target.email,
    options: { redirectTo: `${APP_URL}/reset-password` },
  })
  if (linkErr || !linkData?.properties?.action_link) {
    return NextResponse.json(
      { error: linkErr?.message ?? 'Failed to generate reset link' },
      { status: 500 },
    )
  }

  // Base64-encode the action link for our scanner-safe intermediate page.
  // The email links to /api/auth/reset-launch which shows a button.
  // Scanners see the button page but can't execute the JS that decodes
  // and navigates to the Supabase verify URL.
  const encoded = Buffer.from(linkData.properties.action_link).toString('base64')
  const launchUrl = `${APP_URL}/api/auth/reset-launch?c=${encodeURIComponent(encoded)}`

  // Send via Resend API directly (bypasses Supabase SMTP + template system)
  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: 'JumpLogs <noreply@jumplogs.com>',
      to: [target.email],
      subject: 'Reset your JumpLogs password',
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#fff">
          <p style="margin:0 0 16px;color:#111;font-size:15px">Hi,</p>
          <p style="margin:0 0 24px;color:#555;font-size:14px;line-height:1.6">
            We received a request to reset your JumpLogs password.
            Click the button below to choose a new one.
          </p>
          <a href="${launchUrl}"
             style="display:inline-block;background:#0ea5e9;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
            Reset Password
          </a>
          <p style="margin:24px 0 0;color:#999;font-size:12px;line-height:1.5">
            If you didn&rsquo;t request this, you can safely ignore this email.
            This link expires in 60 minutes.
          </p>
        </div>
      `,
    }),
  })

  if (!resendRes.ok) {
    const body = await resendRes.json().catch(() => ({}))
    console.error('Resend error', resendRes.status, body)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
