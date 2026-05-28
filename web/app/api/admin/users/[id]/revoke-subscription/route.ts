export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'

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

  const body = await req.json().catch(() => ({}))
  const reason: string = body.reason ?? 'Revoked by admin'

  // Find the active subscription for this user (include stripe_subscription_id)
  const { data: sub } = await db
    .from('subscriptions')
    .select('id, stripe_subscription_id')
    .eq('user_id', params.id)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!sub) return NextResponse.json({ error: 'No subscription found' }, { status: 404 })

  // Cancel in Stripe first so the user is never billed again
  if (sub.stripe_subscription_id) {
    try {
      await stripe.subscriptions.cancel(sub.stripe_subscription_id)
    } catch (stripeErr) {
      const msg = stripeErr instanceof Error ? stripeErr.message : 'Stripe error'
      // If already cancelled in Stripe that's fine; any other error is a hard failure
      if (!msg.toLowerCase().includes('no such subscription') && !msg.toLowerCase().includes('already been canceled')) {
        return NextResponse.json({ error: `Stripe cancellation failed: ${msg}` }, { status: 500 })
      }
    }
  }

  const { error } = await db
    .from('subscriptions')
    .update({ status: 'cancelled' })
    .eq('id', sub.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await db.from('audit_log').insert({
    admin_id: adminRow.id,
    action: 'subscription_revoke',
    target: `subscription:${sub.id}`,
    reason,
  })

  return NextResponse.json({ ok: true })
}
