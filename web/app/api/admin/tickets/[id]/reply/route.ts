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
    .select('id, name, email, subject, category, status')
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

  // Email the user
  if (ticket.email) {
    const template = ticketReplyEmail({
      name:         ticket.name ?? 'there',
      replyMessage: message.trim(),
      ticketId:     params.id,
      topic:        ticket.category,
    })
    await sendEmail({ to: ticket.email, ...template })
  }

  return NextResponse.json({ ok: true, message: msg })
}
