import { createAdminClient } from '@/lib/supabase/admin'
import PricingEditor from '@/components/admin/PricingEditor'

export default async function AdminPricingPage() {
  const db = createAdminClient()

  const [
    { data: subsData },
    { count: activeSubsCount },
    { data: auditPricing },
  ] = await Promise.all([
    // Get all distinct prices ever used to build plan cards from real data
    db.from('subscriptions')
      .select('price_at_signup, status')
      .order('price_at_signup', { ascending: false }),
    db.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    // Price change history from audit log
    db.from('audit_log')
      .select('action, target, reason, created_at')
      .ilike('action', '%price%')
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  // Derive current price: most common price_at_signup among active subs
  const activePrices = subsData?.filter(s => s.status === 'active').map(s => Number(s.price_at_signup)) ?? []
  const priceFreq: Record<number, number> = {}
  activePrices.forEach(p => { priceFreq[p] = (priceFreq[p] ?? 0) + 1 })
  const currentAnnualPrice = activePrices.length
    ? Number(Object.entries(priceFreq).sort(([, a], [, b]) => b - a)[0][0])
    : 5 // default if no subs yet

  const plans = [
    { id: 'annual', label: 'Annual', cycle: 'yearly', current: currentAnnualPrice, currency: 'USD' },
  ]

  // Map audit log entries to price history shape
  const history = (auditPricing ?? []).map(e => ({
    from: e.target?.split('→')[0]?.trim() ?? '—',
    to:   e.target?.split('→')[1]?.trim() ?? '—',
    reason: e.reason ?? e.action,
    applied_to: 'new & renewing',
    created_at: e.created_at,
  }))

  return (
    <PricingEditor
      plans={plans}
      history={history}
      activeSubs={activeSubsCount ?? 0}
    />
  )
}
