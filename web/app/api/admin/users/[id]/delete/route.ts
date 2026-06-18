export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'

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
    .select('id, role')
    .eq('email', user.email!)
    .eq('active', true)
    .maybeSingle()
  if (!adminRow) return new Response('Forbidden', { status: 403 })
  if (adminRow.role !== 'super-admin') return new Response('Forbidden', { status: 403 })

  // Fetch user info before deletion (unavailable after)
  const { data: targetAuth } = await db.auth.admin.getUserById(params.id)
  const targetEmail = targetAuth?.user?.email ?? params.id

  // Fetch subscription for Stripe cleanup
  const { data: sub } = await db
    .from('subscriptions')
    .select('stripe_subscription_id, stripe_customer_id, source')
    .eq('user_id', params.id)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Cancel active Stripe subscription and delete customer so no future charges fire
  if (sub?.source !== 'apple') {
    if (sub?.stripe_subscription_id) {
      try {
        await stripe.subscriptions.cancel(sub.stripe_subscription_id)
      } catch { /* already cancelled or not found — ignore */ }
    }
    if (sub?.stripe_customer_id) {
      try {
        await stripe.customers.del(sub.stripe_customer_id)
      } catch { /* already deleted or not found — ignore */ }
    }
  }

  // Audit record before deletion (user row won't exist after)
  await db.from('audit_log').insert({
    admin_id: adminRow.id,
    action:   'user_deleted',
    target:   `user:${params.id}`,
    reason:   `Account permanently deleted by admin. Email: ${targetEmail}`,
  })

  // Delete the auth user — Postgres cascades handle all table cleanup:
  // users → jumps, gear, certificates, subscriptions, support_tickets,
  //         pdf_exports, notification_preferences, jump_edit_log
  // jumps → jump_tags, jump_people, flagged_entries, jump_signatures
  // support_tickets → ticket_messages
  // auth.users (direct) → notifications, subscription_events
  const { error } = await db.auth.admin.deleteUser(params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
