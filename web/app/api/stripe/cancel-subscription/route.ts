export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { verifyBearerToken } from '@/lib/supabase/bearer'
import { createAdminClient } from '@/lib/supabase/admin'
import { stripe } from '@/lib/stripe'

export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: { user }, error } = await verifyBearerToken(authHeader.slice(7))
  if (error) console.error('[cancel-subscription] auth error:', error.message)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: sub } = await admin
    .from('subscriptions')
    .select('id, stripe_subscription_id, stripe_customer_id')
    .eq('user_id', user.id)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!sub?.stripe_subscription_id) {
    return NextResponse.json({ error: 'No active subscription found' }, { status: 404 })
  }

  try {
    await stripe.subscriptions.update(sub.stripe_subscription_id, {
      cancel_at_period_end: true,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Stripe error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  const { error: dbError } = await admin
    .from('subscriptions')
    .update({ status: 'cancelled' })
    .eq('id', sub.id)

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
