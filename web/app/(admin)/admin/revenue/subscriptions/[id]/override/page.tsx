import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import OverrideForm from '@/components/admin/OverrideForm'

export default async function ManualOverridePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = createAdminClient()

  const [
    { data: sub },
    { data: auditEntries },
  ] = await Promise.all([
    db.from('subscriptions')
      .select('id, status, plan, price_at_signup, started_at, renews_at, payment_method_brand, payment_method_last4, stripe_customer_id, stripe_subscription_id, user_id')
      .eq('id', id)
      .single(),
    db.from('audit_log')
      .select('id, action, reason, created_at')
      .eq('target', `subscription:${id}`)
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  if (!sub) notFound()

  const { data: user } = await db
    .from('users')
    .select('id, full_name, email')
    .eq('id', sub.user_id)
    .single()

  if (!user) notFound()

  return (
    <OverrideForm
      subscription={sub}
      user={user}
      auditEntries={auditEntries ?? []}
    />
  )
}
