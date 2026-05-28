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
  const reason: string = body.reason ?? 'Refunded by admin'

  // Find the subscription for this user
  const { data: sub } = await db
    .from('subscriptions')
    .select('id, stripe_subscription_id, stripe_customer_id, price_at_signup, refunded_at')
    .eq('user_id', params.id)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!sub) return NextResponse.json({ error: 'No subscription found' }, { status: 404 })
  if (sub.refunded_at) return NextResponse.json({ error: 'Already refunded' }, { status: 400 })

  let refundedAmount = Number(sub.price_at_signup)
  let stripeRefundId: string | null = null
  let stripeError: string | null = null

  // Attempt Stripe refund via latest invoice
  if (sub.stripe_subscription_id) {
    try {
      const invoices = await stripe.invoices.list({
        subscription: sub.stripe_subscription_id,
        limit: 1,
      })
      const paymentIntent = invoices.data[0]?.payment_intent
      if (paymentIntent) {
        const refund = await stripe.refunds.create({
          payment_intent: paymentIntent as string,
        })
        stripeRefundId = refund.id
        refundedAmount = refund.amount / 100 // cents → dollars
      }
    } catch (e) {
      stripeError = e instanceof Error ? e.message : 'Stripe refund failed'
      // Don't abort — still mark in DB so admin can reconcile manually
    }
  }

  // Mark as refunded in DB — 'refunded' status immediately revokes access (no grace period)
  const { error: dbError } = await db
    .from('subscriptions')
    .update({
      status: 'refunded',
      refunded_at: new Date().toISOString(),
      refunded_amount: refundedAmount,
    })
    .eq('id', sub.id)

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  await db.from('audit_log').insert({
    admin_id: adminRow.id,
    action: 'subscription_refund',
    target: `subscription:${sub.id}`,
    reason: stripeError
      ? `${reason} — Stripe error: ${stripeError}`
      : `${reason}${stripeRefundId ? ` — Stripe refund: ${stripeRefundId}` : ''}`,
  })

  // Also log to subscription_events for the user-facing history
  await db.from('subscription_events').insert({
    user_id: params.id,
    sub_id: sub.id,
    event: 'refunded',
    metadata: {
      refunded_amount: refundedAmount,
      stripe_refund_id: stripeRefundId,
      stripe_error: stripeError ?? undefined,
      reason,
    },
  })

  return NextResponse.json({
    ok: true,
    refunded_amount: refundedAmount,
    stripe_refund_id: stripeRefundId,
    stripe_error: stripeError,
  })
}
