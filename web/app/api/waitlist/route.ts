import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  const { email } = await req.json().catch(() => ({}))

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return NextResponse.json({ error: 'Valid email required.' }, { status: 400 })
  }

  const normalised = email.toLowerCase().trim()

  const db = createAdminClient()
  const { error } = await db
    .from('app_launch_waitlist')
    .upsert({ email: normalised }, { onConflict: 'email', ignoreDuplicates: true })

  if (error) {
    console.error('[waitlist]', error.message)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }

  // Notify marketing of the new sign-up (fire-and-forget)
  sendEmail({
    to: 'marketing@jumplogs.com',
    from: 'noreply',
    subject: `New waitlist sign-up: ${normalised}`,
    html: `<p><strong>${normalised}</strong> just joined the Jump Logs launch waitlist.</p>`,
  }).catch((err) => console.error('[waitlist] notify email failed:', err))

  return NextResponse.json({ ok: true })
}
