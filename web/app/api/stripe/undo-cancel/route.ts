export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { stripe } from '@/lib/stripe'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Support both cookie-based (web) and Bearer token (mobile) auth
  const authHeader = req.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    const { data: { user: tokenUser } } = await supabase.auth.getUser(token)
    if (!tokenUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('id, stripe_subscription_id, renews_at')
    .eq('user_id', user.id)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!sub?.stripe_subscription_id) {
    return NextResponse.json({ error: 'No subscription found' }, { status: 404 })
  }

  // Verify the subscription is still in grace period (has future access)
  if (!sub.renews_at || new Date(sub.renews_at) <= new Date()) {
    return NextResponse.json({ error: 'Subscription has already expired' }, { status: 400 })
  }

  // Remove the cancellation — no new charge, access continues until original period end
  await stripe.subscriptions.update(sub.stripe_subscription_id, {
    cancel_at_period_end: false,
  })

  // Restore status to active in our DB
  const admin = createAdminClient()
  const { error } = await admin
    .from('subscriptions')
    .update({ status: 'active' })
    .eq('id', sub.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
