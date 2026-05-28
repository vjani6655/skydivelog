'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { stripe } from '@/lib/stripe'

export async function undoCancelAction(): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Unauthorized' }

  const admin = createAdminClient()
  const { data: sub } = await admin
    .from('subscriptions')
    .select('id, stripe_subscription_id, renews_at')
    .eq('user_id', user.id)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!sub?.stripe_subscription_id) {
    return { ok: false, error: 'No subscription found' }
  }

  if (!sub.renews_at || new Date(sub.renews_at) <= new Date()) {
    return { ok: false, error: 'Subscription has already expired' }
  }

  try {
    await stripe.subscriptions.update(sub.stripe_subscription_id, {
      cancel_at_period_end: false,
    })
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }

  const { error: dbError } = await admin
    .from('subscriptions')
    .update({ status: 'active' })
    .eq('id', sub.id)

  if (dbError) return { ok: false, error: dbError.message }

  return { ok: true }
}

export async function cancelSubscriptionAction(): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Unauthorized' }

  const admin = createAdminClient()
  const { data: sub } = await admin
    .from('subscriptions')
    .select('id, stripe_subscription_id')
    .eq('user_id', user.id)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!sub?.stripe_subscription_id) {
    return { ok: false, error: 'No active subscription found' }
  }

  try {
    await stripe.subscriptions.update(sub.stripe_subscription_id, {
      cancel_at_period_end: true,
    })
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }

  const { error: dbError } = await admin
    .from('subscriptions')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('id', sub.id)

  if (dbError) return { ok: false, error: dbError.message }

  return { ok: true }
}
