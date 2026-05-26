import { createAdminClient } from '@/lib/supabase/admin'
import ApplyDiscountForm from '@/components/admin/ApplyDiscountForm'
import { notFound } from 'next/navigation'

export default async function ApplyDiscountPage({ params }: { params: { id: string } }) {
  const db = createAdminClient()

  const [
    { data: user },
    { data: subscription },
    { count: jumpCount },
  ] = await Promise.all([
    db.from('users').select('id, full_name, email, country, created_at').eq('id', params.id).single(),
    db.from('subscriptions').select('id, stripe_subscription_id, status, plan, price_at_signup, renews_at')
      .eq('user_id', params.id)
      .order('started_at', { ascending: false })
      .limit(1)
      .single(),
    db.from('jumps').select('*', { count: 'exact', head: true })
      .eq('user_id', params.id)
      .is('deleted_at', null),
  ])

  if (!user) notFound()

  return (
    <ApplyDiscountForm
      user={user}
      subscription={subscription ?? null}
      userId={params.id}
      jumpCount={jumpCount ?? 0}
    />
  )
}
