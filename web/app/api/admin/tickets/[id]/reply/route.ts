export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { sendEmail, ticketReplyEmail } from '@/lib/email'

export async function POST(
  req: Request,
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

  const { message } = await req.json()
  if (!message?.trim()) return NextResponse.json({ error: 'Message required' }, { status: 400 })

  // Get ticket details for email
  const { data: ticket } = await db
    .from('support_tickets')
    .select('id, user_id, name, email, subject, category, status')
    .eq('id', params.id)
    .maybeSingle()
  if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
  if (ticket.status === 'closed') return NextResponse.json({ error: 'Ticket is closed' }, { status: 400 })

  // Save message in thread
  const { data: msg, error } = await db
    .from('ticket_messages')
    .insert({
      ticket_id: params.id,
      sender_id: user.id,
      message:   message.trim(),
    })
    .select('id, ticket_id, sender_id, message, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Mark ticket as waiting (for user to reply)
  await db.from('support_tickets').update({ status: 'waiting' }).eq('id', params.id)

  // Resolve recipient email — ticket.email may be null for mobile-submitted tickets,
  // fall back to the auth user's email from the users table
  let recipientEmail = ticket.email ?? null
  let recipientName  = ticket.name ?? null
  if (!recipientEmail && ticket.user_id) {
    const { data: userRow } = await db
      .from('users')
      .select('email, full_name')
      .eq('id', ticket.user_id)
      .maybeSingle()
    recipientEmail = userRow?.email ?? null
    if (!recipientName) recipientName = userRow?.full_name ?? null
  }

  // Email the user
  if (recipientEmail) {
    const template = ticketReplyEmail({
      name:         recipientName ?? 'there',
      replyMessage: message.trim(),
      ticketId:     params.id,
      topic:        ticket.category,
    })
    await sendEmail({ to: recipientEmail, ...template })
  }

  return NextResponse.json({ ok: true, message: msg })
}
