import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { sendEmail, ticketConfirmationEmail, ticketAdminNotificationEmail } from '@/lib/email'

// Map display topic → DB category enum value
const TOPIC_TO_CATEGORY: Record<string, string> = {
  'Support':         'support',
  'Billing':         'billing',
  'Feature request': 'feature',
  'Bug':             'bug',
  'Press':           'press',
}

export async function POST(req: Request) {
  try {
    const { name, email, topic, message } = await req.json()

    if (!name?.trim() || !email?.trim() || !topic?.trim() || !message?.trim()) {
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 })
    }

    const category = TOPIC_TO_CATEGORY[topic] ?? 'support'
    const subject = `${topic} enquiry from ${name}`

    const db = createAdminClient()

    // Link to logged-in user if they're authenticated
    let userId: string | null = null
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      userId = user?.id ?? null
    } catch { /* anonymous — fine */ }

    const { data: ticket, error } = await db
      .from('support_tickets')
      .insert({
        user_id:  userId,
        name:     name.trim(),
        email:    email.trim().toLowerCase(),
        subject,
        category,
        message:  message.trim(),
        status:   'open',
        severity: 'normal',
        source:   'web',
      })
      .select('id')
      .single()

    if (error) {
      console.error('[contact] insert error:', error.message)
      return NextResponse.json({ error: 'Could not save your ticket.' }, { status: 500 })
    }

    const ticketId = ticket.id

    // Send confirmation email to user + admin notification (fire and forget)
    const confirmation = ticketConfirmationEmail({ name, topic, message, ticketId })
    const adminNotif   = ticketAdminNotificationEmail({ name, email, topic, message, ticketId })
    await Promise.all([
      sendEmail({ to: email, ...confirmation }),
      sendEmail(adminNotif),
    ])

    return NextResponse.json({ success: true, ticketId })
  } catch {
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}

