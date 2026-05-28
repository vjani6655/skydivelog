export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { sendEmail, ticketResolvedEmail } from '@/lib/email'

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

  const { data: ticket } = await db
    .from('support_tickets')
    .select('id, name, email, subject, category, status')
    .eq('id', params.id)
    .maybeSingle()
  if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })

  await db.from('support_tickets').update({ status: 'closed' }).eq('id', params.id)

  // Email the user
  if (ticket.email) {
    const template = ticketResolvedEmail({
      name:     ticket.name ?? 'there',
      ticketId: params.id,
      topic:    ticket.category,
    })
    await sendEmail({ to: ticket.email, ...template })
  }

  return NextResponse.json({ ok: true })
}
