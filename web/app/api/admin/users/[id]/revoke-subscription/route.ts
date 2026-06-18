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
    .select('id, role')
    .eq('email', user.email!)
    .eq('active', true)
    .maybeSingle()
  if (!adminRow) return new Response('Forbidden', { status: 403 })
  if (!['super-admin', 'admin'].includes(adminRow.role)) return new Response('Forbidden', { status: 403 })

  const body = await req.json().catch(() => ({}))
  const reason: string = body.reason ?? 'Revoked by admin'

  // Find the active subscription for this user
  const { data: sub } = await db
    .from('subscriptions')
    .select('id, stripe_subscription_id, stripe_customer_id')
    .eq('user_id', params.id)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!sub) return NextResponse.json({ error: 'No subscription found' }, { status: 404 })

  // Resolve Stripe customer ID — fall back to email lookup if not stored in DB
  let stripeCustomerId = sub.stripe_customer_id ?? null
  if (!stripeCustomerId) {
    const { data: targetUser } = await db.auth.admin.getUserById(params.id)
    const email = targetUser?.user?.email
    if (email) {
      const customers = await stripe.customers.list({ email, limit: 1 })
      stripeCustomerId = customers.data[0]?.id ?? null
    }
  }

  // Cancel in Stripe — try by subscription ID first, then cancel all active subs for customer
  if (sub.stripe_subscription_id) {
    try {
      await stripe.subscriptions.cancel(sub.stripe_subscription_id)
    } catch (stripeErr) {
      const msg = stripeErr instanceof Error ? stripeErr.message : 'Stripe error'
      if (!msg.toLowerCase().includes('no such subscription') && !msg.toLowerCase().includes('already been canceled')) {
        return NextResponse.json({ error: `Stripe cancellation failed: ${msg}` }, { status: 500 })
      }
    }
  } else if (stripeCustomerId) {
    // No subscription ID stored — cancel all active Stripe subs for this customer
    try {
      const { data: activeSubs } = await stripe.subscriptions.list({
        customer: stripeCustomerId,
        status: 'active',
        limit: 10,
      })
      for (const s of activeSubs) {
        await stripe.subscriptions.cancel(s.id)
      }
    } catch (stripeErr) {
      const msg = stripeErr instanceof Error ? stripeErr.message : 'Stripe error'
      if (!msg.toLowerCase().includes('already been canceled')) {
        return NextResponse.json({ error: `Stripe cancellation failed: ${msg}` }, { status: 500 })
      }
    }
  }

  const { error } = await db
    .from('subscriptions')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString(), ...(stripeCustomerId ? { stripe_customer_id: stripeCustomerId } : {}) })
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
