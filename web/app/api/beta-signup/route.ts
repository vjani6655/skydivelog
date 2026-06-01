import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  const { name, email, homeDZ } = await req.json().catch(() => ({}))

  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'Name is required.' }, { status: 400 })
  }
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return NextResponse.json({ error: 'Valid email required.' }, { status: 400 })
  }
  if (!homeDZ || typeof homeDZ !== 'string' || !homeDZ.trim()) {
    return NextResponse.json({ error: 'Home dropzone is required.' }, { status: 400 })
  }

  sendEmail({
    to: 'beta@jumplogs.com',
    from: 'noreply',
    subject: `New iOS beta sign-up: ${name.trim()}`,
    html: `
      <p>A new iOS beta tester has signed up:</p>
      <ul>
        <li><strong>Name:</strong> ${name.trim()}</li>
        <li><strong>Email:</strong> ${email.toLowerCase().trim()}</li>
        <li><strong>Home DZ:</strong> ${homeDZ.trim()}</li>
      </ul>
    `,
  }).catch((err) => console.error('[beta-signup] notify email failed:', err))

  return NextResponse.json({ ok: true })
}
