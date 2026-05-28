// TEMPORARY debug endpoint — remove before going to real production users
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 1. DB row
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('id, status, plan, renews_at, stripe_subscription_id, stripe_customer_id, started_at')
    .eq('user_id', user.id)
    .order('started_at', { ascending: false })
    .limit(5)

  // 2. All DB rows (might be multiple)
  const mostRecent = sub?.[0]

  // 3. Stripe customer lookup
  let stripeCustomerId = mostRecent?.stripe_customer_id ?? null
  let customerSource = 'db'
  let customerLookupError: string | null = null

  if (!stripeCustomerId && user.email) {
    try {
      const { data: customers } = await stripe.customers.list({ email: user.email, limit: 3 })
      stripeCustomerId = customers[0]?.id ?? null
      customerSource = 'email_lookup'
    } catch (e) {
      customerLookupError = String(e)
    }
  }

  // 4. Stripe subscriptions
  let stripeSubs: object[] = []
  let subsError: string | null = null
  if (stripeCustomerId) {
    try {
      const { data } = await stripe.subscriptions.list({
        customer: stripeCustomerId,
        status: 'all',
        limit: 10,
      })
      stripeSubs = data.map(s => ({
        id: s.id,
        status: s.status,
        cancel_at_period_end: s.cancel_at_period_end,
        current_period_end: new Date((s.items.data[0]?.current_period_end ?? 0) * 1000).toISOString(),
        created: new Date(s.created * 1000).toISOString(),
      }))
    } catch (e) {
      subsError = String(e)
    }
  }

  const genuinelyActive = (stripeSubs as { status: string; cancel_at_period_end: boolean }[]).find(
    s => (s.status === 'active' || s.status === 'past_due' || s.status === 'trialing') && !s.cancel_at_period_end
  )

  return NextResponse.json({
    user_email: user.email,
    db_rows: sub,
    stripe_customer_id: stripeCustomerId,
    customer_source: customerSource,
    customer_lookup_error: customerLookupError,
    stripe_subscriptions: stripeSubs,
    subs_error: subsError,
    genuinely_active: genuinelyActive ?? null,
    would_show_pro: !!genuinelyActive,
  })
}
