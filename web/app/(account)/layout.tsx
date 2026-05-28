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
        const customers = await stripe.customers.list({ email: user.email, limit: 1 })
        stripeCustomerId = customers.data[0]?.id ?? null
      }

      if (stripeCustomerId) {
        const { data: stripeSubs } = await stripe.subscriptions.list({
          customer: stripeCustomerId,
          limit: 5,
        })
        const activeSub = stripeSubs.find(s => s.status === 'active' || s.status === 'past_due')
        if (activeSub?.cancel_at_period_end) {
          isPro = false
          isCancelledInGrace = !!sub?.renews_at && new Date(sub!.renews_at) > new Date()
          // Backfill both IDs; update by user_id so it works even when stripe_customer_id is NULL
          createAdminClient()
            .from('subscriptions')
            .update({ status: 'cancelled', stripe_subscription_id: activeSub.id, stripe_customer_id: stripeCustomerId })
            .eq('user_id', user.id)
            .then(
              ({ error }) => { if (error) console.error('[layout reconcile]', error.message) },
              () => {}
            )
        }
      }
    } catch {
      // ignore — don't block page render if Stripe is unreachable
    }
  }

  return (
    <div className="min-h-screen bg-bg flex">
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
      <main className="flex-1 min-w-0 overflow-auto px-12 py-8">
        {children}
      </main>
    </div>
  )
}
