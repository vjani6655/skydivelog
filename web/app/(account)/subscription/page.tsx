export const dynamic = 'force-dynamic'

import { createClient } from "@/lib/supabase/server"
import UpgradeButton from "@/components/UpgradeButton"
import ManageBillingButton from "@/components/ManageBillingButton"
import CancelSubscriptionButton from "@/components/CancelSubscriptionButton"
import { Check } from "lucide-react"
import { stripe } from "@/lib/stripe"
import type Stripe from "stripe"

function fmtDate(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

const FEATURES = [
  "Unlimited jump logs",
  "Full statistics & currency tracking",
  "Gear & repack tracking",
  "Certificates & medicals",
  "PDF & CSV export",
  "iOS & Android apps",
  "Offline support",
  "Your data, always exportable",
]

export default async function SubscriptionPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: sub } = await supabase
    .from("subscriptions")
    .select(
      "status, plan, price_at_signup, started_at, renews_at, payment_method_brand, payment_method_last4, payment_method_expiry, stripe_customer_id"
    )
    .eq("user_id", user!.id)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  const isActive = sub?.status === "active"
  const isTrial = sub?.status === "trial"

  // Fetch billing address from Stripe if subscribed
  let billingAddress: Stripe.Address | null = null
  let billingName: string | null = null
  if ((isActive || isTrial) && sub?.stripe_customer_id) {
    try {
      const customer = await stripe.customers.retrieve(sub.stripe_customer_id) as Stripe.Customer
      billingAddress = customer.address ?? null
      billingName = customer.name ?? null
    } catch {
      // ignore — billing address is optional
    }
  }

  // Subscribed user view
  if (isActive || isTrial) {
    const planLabel = (sub.plan?.startsWith('price_') ? 'Pro' : sub.plan ?? 'Pro')
      .replace(/^./, (c) => c.toUpperCase())

    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="mb-6">
          <p className="text-overline font-semibold tracking-widest uppercase text-fg-4 mb-1.5">Subscription</p>
          <h1 className="text-h1 font-bold text-fg tracking-tight">Your plan</h1>
        </div>

        {/* Main plan card */}
        <div className="bg-surface border border-sky/20 rounded-lg p-5 mb-4 ring-1 ring-sky/10">
          <div className="flex items-start justify-between gap-4">
            {/* Left: badges + price */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-sm bg-sky/10 border border-sky/25 text-xs font-semibold text-sky">
                  <svg className="w-3 h-3" viewBox="0 0 32 32" fill="none">
                    <path d="M16 4C9.37 4 4 9.37 4 16s5.37 12 12 12 12-5.37 12-12S22.63 4 16 4zm0 2c5.52 0 10 4.48 10 10s-4.48 10-10 10S6 21.52 6 16 10.48 6 16 6z" fill="currentColor" opacity="0.5"/>
                    <path d="M22 10.5l-8 3.5-3.5 8 8-3.5 3.5-8z" fill="currentColor"/>
                  </svg>
                  {planLabel.toUpperCase()}
                </span>
                <span className={`text-xs font-semibold px-2 py-1 rounded-sm border ${
                  isActive
                    ? "bg-ok/10 border-ok/20 text-ok"
                    : "bg-sky/10 border-sky/20 text-sky"
                }`}>
                  {sub.status.toUpperCase()}
                </span>
              </div>

              <div className="flex items-baseline gap-1.5 mb-1.5">
                <span className="text-5xl font-bold text-fg tracking-tight">
                  ${Number(sub.price_at_signup ?? 5).toFixed(0)}
                </span>
                <span className="text-xl text-fg-3 font-medium">/ year</span>
              </div>
              <p className="text-xs text-fg-3">
                Renews {fmtDate(sub.renews_at)}
                {sub.started_at && <> · started {fmtDate(sub.started_at)}</>}
              </p>
            </div>

            {/* Right: actions */}
            <div className="flex flex-col gap-2 flex-shrink-0 min-w-[140px]">
              <ManageBillingButton label="Update card" />
              <CancelSubscriptionButton />
            </div>
          </div>
        </div>

        {/* Payment method + Billing address */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div className="bg-surface border border-border rounded-lg p-5">
            <p className="text-overline font-semibold tracking-widest uppercase text-fg-4 mb-4">Payment method</p>
            <div className="flex items-center gap-3">
              <div className="w-12 h-7 bg-surface-2 border border-border rounded flex items-center justify-center">
                <span className="text-[10px] font-bold text-fg-2 tracking-wide">
                  {(sub.payment_method_brand ?? "CC").slice(0, 4).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-sm font-mono text-fg">···· {sub.payment_method_last4 ?? "——"}</p>
                {sub.payment_method_expiry && (
                  <p className="text-[11px] font-mono text-fg-4 mt-0.5 tracking-widest">
                    EXPIRES {sub.payment_method_expiry}
                  </p>
                )}
              </div>
            </div>
          </div>

          {(billingName || billingAddress) ? (
            <div className="bg-surface border border-border rounded-lg p-5">
              <p className="text-overline font-semibold tracking-widest uppercase text-fg-4 mb-4">Billing address</p>
              <div className="text-sm text-fg-2 space-y-0.5 font-mono text-xs">
                {billingName && <p>{billingName}</p>}
                {billingAddress?.line1 && <p>{billingAddress.line1}</p>}
                {billingAddress?.line2 && <p>{billingAddress.line2}</p>}
                {(billingAddress?.city || billingAddress?.state || billingAddress?.postal_code) && (
                  <p>{[billingAddress.city, billingAddress.state, billingAddress.postal_code].filter(Boolean).join(" ")}</p>
                )}
                {billingAddress?.country && <p>{billingAddress.country}</p>}
              </div>
            </div>
          ) : (
            <div className="bg-surface border border-border rounded-lg p-5 flex items-center justify-center">
              <ManageBillingButton label="Add billing address" />
            </div>
          )}
        </div>

        {/* Invoice history link */}
        <a href="/billing" className="text-xs text-sky hover:text-sky/80 transition-colors">
          View invoice history →
        </a>
      </div>
    )
  }

  // Non-subscribed user — upgrade view
  return (
    <div className="p-6 max-w-xl mx-auto">
      <div className="mb-6">
        <p className="text-overline font-semibold tracking-widest uppercase text-fg-4 mb-1.5">Subscription</p>
        <h1 className="text-h1 font-bold text-fg tracking-tight">Your plan</h1>
      </div>

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="px-6 pt-6 pb-5 border-b border-border">
          <p className="text-overline font-semibold tracking-widest uppercase text-fg-4 mb-1">Jump Logs Pro · Billed annually</p>
          <div className="flex items-baseline gap-1 mt-3 mb-1">
            <span className="text-display-sm font-bold text-fg">$12</span>
            <span className="text-lg text-fg-3">/ year</span>
          </div>
          <p className="text-xs text-fg-4">Less than a cup of coffee.</p>
        </div>

        <ul className="px-6 py-4 space-y-2 border-b border-border">
          {FEATURES.map((f) => (
            <li key={f} className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-ok flex-shrink-0" />
              <span className="text-sm text-fg-2">{f}</span>
            </li>
          ))}
        </ul>

        <div className="px-6 py-5">
          <UpgradeButton />
          <p className="text-xs text-center text-fg-4 mt-3">Cancel any time · your data stays yours</p>
        </div>
      </div>
    </div>
  )
}
