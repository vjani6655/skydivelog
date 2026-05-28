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
    .select("plan, renews_at, status, stripe_subscription_id")
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

  // Reconcile: if Stripe says cancel_at_period_end but DB still says active, fix it
  if (isPro && sub?.stripe_subscription_id) {
    try {
      const stripeSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id)
      if (stripeSub.cancel_at_period_end) {
        // Update UI immediately — don't wait for DB
        isPro = false
        isCancelledInGrace = !!sub.renews_at && new Date(sub.renews_at) > new Date()
        // Best-effort DB reconciliation (fire and forget)
        createAdminClient()
          .from('subscriptions')
          .update({ status: 'cancelled' })
          .eq('stripe_subscription_id', sub.stripe_subscription_id)
          .then(({ error }) => { if (error) console.error('[layout reconcile]', error.message) })
          .catch(() => {})
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
