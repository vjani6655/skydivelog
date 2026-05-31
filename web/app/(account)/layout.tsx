import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { stripe } from "@/lib/stripe"
import AccountSidebar from "@/components/AccountSidebar"
import PrefsSyncer from "@/components/PrefsSyncer"

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("users")
    .select("full_name, licence_number, theme, preferred_altitude_unit, date_format")
    .eq("id", user.id)
    .maybeSingle()

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan, renews_at, status, stripe_subscription_id, stripe_customer_id")
    .eq("user_id", user.id)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  const fullName = profile?.full_name || user.email?.split("@")[0] || "User"
  let isPro = sub?.status === "active"
  let isCancelledInGrace =
    sub?.status === 'cancelled' &&
    !!sub?.renews_at &&
    new Date(sub.renews_at) > new Date()

  // Reconcile: check Stripe live state. Falls back to email lookup when stripe_customer_id is NULL in DB.
  if (isPro) {
    try {
      let stripeCustomerId = sub?.stripe_customer_id ?? null

      // Email fallback — handles the case where stripe_customer_id was never stored
      if (!stripeCustomerId && user.email) {
        const { data: customers } = await stripe.customers.list({ email: user.email, limit: 1 })
        stripeCustomerId = customers[0]?.id ?? null
      }

      if (stripeCustomerId) {
        // status:'all' catches both cancel_at_period_end AND immediately-cancelled subs
        const { data: stripeSubs } = await stripe.subscriptions.list({
          customer: stripeCustomerId,
          status: 'all',
          limit: 10,
        })

        // A 'genuinely active' sub: not cancelled, not scheduled to cancel
        const genuinelyActive = stripeSubs.find(
          s => (s.status === 'active' || s.status === 'past_due' || s.status === 'trialing')
            && !s.cancel_at_period_end
        )

        if (!genuinelyActive) {
          isPro = false
          // Is the user still within a grace period?
          const cancellingSub = stripeSubs.find(
            s => (s.status === 'active' || s.status === 'past_due') && s.cancel_at_period_end
          )
          if (cancellingSub) {
            const periodEnd = new Date((cancellingSub.items.data[0]?.current_period_end ?? 0) * 1000)
            isCancelledInGrace = periodEnd > new Date()
          } else {
            isCancelledInGrace = !!sub?.renews_at && new Date(sub!.renews_at) > new Date()
          }
          const subIdToBackfill = cancellingSub?.id ?? stripeSubs[0]?.id
          createAdminClient()
            .from('subscriptions')
            .update({
              status: 'cancelled',
              stripe_customer_id: stripeCustomerId,
              ...(subIdToBackfill ? { stripe_subscription_id: subIdToBackfill } : {}),
            })
            .eq('user_id', user.id)
            .then(
              ({ error }) => { if (error) console.error('[layout reconcile]', error.message) },
              (err) => { console.error('[layout reconcile] db error:', err) }
            )
        }
      }
    } catch (e) {
      console.error('[layout reconcile] stripe error:', e)
    }
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col md:flex-row">
      <PrefsSyncer
        theme={profile?.theme ?? "dark"}
        dateFormat={profile?.date_format ?? "DD MMM YYYY"}
        altUnit={profile?.preferred_altitude_unit ?? "ft"}
      />
      <AccountSidebar
        fullName={fullName}
        licenceNumber={profile?.licence_number ?? null}
        plan={isPro ? (sub?.plan?.startsWith('price_') ? 'annual' : (sub?.plan ?? 'annual')) : null}
        renewsAt={isPro ? sub?.renews_at ?? null : null}
        cancelledInGrace={isCancelledInGrace}
        cancelAt={isCancelledInGrace ? sub?.renews_at ?? null : null}
      />
      <main className="flex-1 min-w-0 overflow-auto px-4 py-6 md:px-12 md:py-8">
        {children}
      </main>
    </div>
  )
}
