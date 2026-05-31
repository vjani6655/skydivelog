import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const { email } = await req.json().catch(() => ({}))

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return NextResponse.json({ error: 'Valid email required.' }, { status: 400 })
  }

  const db = createAdminClient()
  const { error } = await db
    .from('app_launch_waitlist')
    .upsert({ email: email.toLowerCase().trim() }, { onConflict: 'email', ignoreDuplicates: true })

  if (error) {
    console.error('[waitlist]', error.message)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
