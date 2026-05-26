import { createAdminClient } from '@/lib/supabase/admin'
import DiscountsClient from '@/components/admin/DiscountsClient'

export default async function AdminDiscountsPage() {
  const db = createAdminClient()
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString()

  const [
    { data: coupons },
    { data: manualDiscounts },
  ] = await Promise.all([
    db.from('coupons').select('*').order('created_at', { ascending: false }),
    db.from('audit_log')
      .select('id, action, target, reason, created_at, admins(name)')
      .ilike('action', '%discount%')
      .gte('created_at', thirtyDaysAgo)
      .order('created_at', { ascending: false })
      .limit(30),
  ])

  // Aggregate stats from coupon data
  const activeCoupons = coupons?.filter(c => c.status === 'active') ?? []
  const redemptions30d = activeCoupons.reduce((s, c) => s + (c.usage_count ?? 0), 0)

  return (
    <DiscountsClient
      coupons={(coupons ?? []) as Parameters<typeof DiscountsClient>[0]['coupons']}
      manualDiscounts={(manualDiscounts ?? []) as unknown as Parameters<typeof DiscountsClient>[0]['manualDiscounts']}
      redemptions30d={redemptions30d}
      discountGiven30d={0}
      manualComps30d={manualDiscounts?.length ?? 0}
    />
  )
}
