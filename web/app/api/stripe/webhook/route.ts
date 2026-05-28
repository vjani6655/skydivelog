import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'

// Required: prevent Next.js from parsing the body — Stripe needs the raw bytes for sig verification
export const runtime = 'nodejs'

const STATUS_MAP: Record<string, string> = {
  active: 'active',
  past_due: 'overdue',
  canceled: 'cancelled',
  cancelled: 'cancelled',
  unpaid: 'overdue',
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Webhook signature error'
    console.error('[stripe/webhook] signature verification failed:', message)
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const admin = createAdminClient()

  // ── checkout.session.completed ────────────────────────────────────────────
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    if (session.mode !== 'subscription') return NextResponse.json({ received: true })

    const userId = session.metadata?.user_id
    if (!userId) {
      console.error('[stripe/webhook] checkout.session.completed: no user_id in metadata')
      return NextResponse.json({ error: 'No user_id in metadata' }, { status: 400 })
    }

    // Expand subscription so we get period dates, price, product name, and payment method
    const subscription = await stripe.subscriptions.retrieve(
      session.subscription as string,
      { expand: ['default_payment_method', 'items.data.price.product'] },
    )

    const pm = subscription.default_payment_method as Stripe.PaymentMethod | null
    const card = pm?.card
    const item = subscription.items.data[0]
    const price = item?.price
    const product = price?.product as Stripe.Product | null

    const { error } = await admin.from('subscriptions').upsert(
      {
        user_id: userId,
        stripe_subscription_id: subscription.id,
        stripe_customer_id: session.customer as string,
        status: STATUS_MAP[subscription.status] ?? 'active',
        plan: product?.name ?? price?.nickname ?? 'Pro',
        price_at_signup: (price?.unit_amount ?? 0) / 100,
        started_at: new Date(item.current_period_start * 1000).toISOString(),
        renews_at: new Date(item.current_period_end * 1000).toISOString(),
        payment_method_brand: card?.brand ?? 'unknown',
        payment_method_last4: card?.last4 ?? '0000',
        payment_method_expiry: card ? `${card.exp_month}/${String(card.exp_year).slice(-2)}` : 'unknown',
      },
      { onConflict: 'stripe_subscription_id' },
    )

    if (error) {
      console.error('[stripe/webhook] db upsert failed:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('[stripe/webhook] subscription created for user', userId)
  }

  // ── customer.subscription.updated ─────────────────────────────────────────
  if (event.type === 'customer.subscription.updated') {
    const subscription = event.data.object as Stripe.Subscription

    // If cancel_at_period_end is true the user cancelled but still has access until
    // current_period_end. Store as 'cancelled' now so isCancelledInGrace works.
    const isCancelling = subscription.cancel_at_period_end
    const newStatus = isCancelling ? 'cancelled' : (STATUS_MAP[subscription.status] ?? 'active')
    const newRenewsAt = new Date((subscription.items.data[0]?.current_period_end ?? 0) * 1000).toISOString()

    // Try matching by subscription ID first
    const { data: bySubId } = await admin
      .from('subscriptions')
      .update({ status: newStatus, renews_at: newRenewsAt })
      .eq('stripe_subscription_id', subscription.id)
      .select('id')

    // Fall back to customer ID if the row was created before we stored stripe_subscription_id
    if (!bySubId?.length) {
      const { error } = await admin
        .from('subscriptions')
        .update({ status: newStatus, renews_at: newRenewsAt, stripe_subscription_id: subscription.id })
        .eq('stripe_customer_id', subscription.customer as string)
      if (error) console.error('[stripe/webhook] customer fallback update failed:', error.message)
      else console.log('[stripe/webhook] updated via customer_id fallback for', subscription.customer)
    }
  }

  // ── customer.subscription.deleted ─────────────────────────────────────────
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription

    const { data: bySubId } = await admin
      .from('subscriptions')
      .update({ status: 'cancelled' })
      .eq('stripe_subscription_id', subscription.id)
      .select('id')

    if (!bySubId?.length) {
      await admin
        .from('subscriptions')
        .update({ status: 'cancelled', stripe_subscription_id: subscription.id })
        .eq('stripe_customer_id', subscription.customer as string)
    }
  }

  return NextResponse.json({ received: true })
}
