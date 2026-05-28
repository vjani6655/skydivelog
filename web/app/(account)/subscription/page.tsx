export const dynamic = 'force-dynamic'

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import UpgradeButton from "@/components/UpgradeButton"
import ManageBillingButton from "@/components/ManageBillingButton"
import UndoCancelButton from "@/components/UndoCancelButton"
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
      "status, plan, price_at_signup, started_at, renews_at, payment_method_brand, payment_method_last4, payment_method_expiry, stripe_customer_id, stripe_subscription_id"
    )
    .eq("user_id", user!.id)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  let isActive = sub?.status === "active"
  const isTrial = sub?.status === "trial"
  let isCancelledInGrace =
    sub?.status === 'cancelled' &&
    !!sub?.renews_at &&
    new Date(sub.renews_at) > new Date()

  // Reconcile: if Stripe says cancel_at_period_end but DB still says active, fix it
  if (isActive && sub?.stripe_subscription_id) {
    try {
      const stripeSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id)
      if (stripeSub.cancel_at_period_end) {
        // Update UI immediately — don't wait for DB
        isActive = false
        isCancelledInGrace = !!sub.renews_at && new Date(sub.renews_at) > new Date()
        // Best-effort DB reconciliation (fire and forget)
        createAdminClient()
          .from('subscriptions')
          .update({ status: 'cancelled' })
          .eq('stripe_subscription_id', sub.stripe_subscription_id)
          .then(({ error }) => { if (error) console.error('[sub page reconcile]', error.message) })
          .catch(() => {})
      }
    } catch {
      // ignore — don't block page render if Stripe is unreachable
    }
  }

  // Fetch billing address from Stripe if subscribed
  let billingAddress: Stripe.Address | null = null
  let billingName: string | null = null
  if ((isActive || isTrial || isCancelledInGrace) && sub?.stripe_customer_id) {
    try {
      const customer = await stripe.customers.retrieve(sub.stripe_customer_id) as Stripe.Customer
      billingAddress = customer.address ?? null
      billingName = customer.name ?? null
    } catch {
      // ignore — billing address is optional
    }
  }

  // Subscribed user view (active, trial, or cancelled-in-grace)
  if (isActive || isTrial || isCancelledInGrace) {
    const planLabel = (sub.plan?.startsWith('price_') ? 'Pro' : sub.plan ?? 'Pro')
      .replace(/^./, (c: string) => c.toUpperCase())

    return (
      <div className="max-w-[1400px] mx-auto">
        <div className="mb-6">
          <p className="font-mono text-[11px] tracking-widest uppercase text-fg-3 mb-1.5">Subscription</p>
          <h1 className="text-[28px] font-bold text-fg tracking-tight">Your plan</h1>
        </div>

        {/* Main plan card */}
        <div
          className={`border rounded-[14px] p-8 mb-5 ${
            isCancelledInGrace
              ? 'border-warn/40'
              : 'border-sky'
          }`}
          style={{background: isCancelledInGrace
            ? 'linear-gradient(135deg, rgba(251,191,36,0.08) 0%, transparent 100%)'
            : 'linear-gradient(135deg, rgba(74,158,255,0.18) 0%, transparent 100%)'}}
        >
          <div className="flex items-start justify-between gap-8">
            {/* Left: badge + price */}
            <div className="flex-1">
              <div className="mb-[14px]">
                {isCancelledInGrace ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-warn/10 border border-warn/30 font-mono text-xs font-semibold text-warn uppercase tracking-wide">
                    {planLabel.toUpperCase()} · CANCELLED
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-sky/10 border border-sky/30 font-mono text-xs font-semibold text-sky uppercase tracking-wide">
                    <svg className="w-3 h-3" viewBox="0 0 32 32" fill="none">
                      <path d="M16 4C9.37 4 4 9.37 4 16s5.37 12 12 12 12-5.37 12-12S22.63 4 16 4zm0 2c5.52 0 10 4.48 10 10s-4.48 10-10 10S6 21.52 6 16 10.48 6 16 6z" fill="currentColor" opacity="0.5"/>
                      <path d="M22 10.5l-8 3.5-3.5 8 8-3.5 3.5-8z" fill="currentColor"/>
                    </svg>
                    {planLabel.toUpperCase()} · {isActive ? "ACTIVE" : "TRIAL"}
                  </span>
                )}
              </div>

              <div className="font-mono text-[40px] font-medium tracking-tight text-fg leading-none mb-[6px]">
                ${Number(sub.price_at_signup ?? 5).toFixed(0)} / year
              </div>
              {isCancelledInGrace ? (
                <p className="text-sm text-fg-2">
                  Access until <span className="text-warn font-medium">{fmtDate(sub.renews_at)}</span>
                  {sub.started_at && <> · started {fmtDate(sub.started_at)}</>}
                </p>
              ) : (
                <p className="text-sm text-fg-2">
                  Renews <span className="text-fg font-medium">{fmtDate(sub.renews_at)}</span>
                  {sub.started_at && <> · started {fmtDate(sub.started_at)}</>}
                </p>
              )}
            </div>

            {/* Right: actions */}
            <div className="flex flex-col gap-2 flex-shrink-0 min-w-[200px]">
              {isCancelledInGrace ? (
                <div className="flex flex-col gap-2">
                  <UndoCancelButton />
                  <p className="text-[11px] text-fg-4 text-center">No new charge — your paid access continues until {fmtDate(sub.renews_at)}</p>
                </div>
              ) : (
                <>
                  <ManageBillingButton label="Update card" />
                  <CancelSubscriptionButton />
                </>
              )}
            </div>
          </div>
        </div>

        {/* Payment method + Billing address */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div className="bg-surface border border-border rounded-[14px] p-6">
            <p className="font-mono text-[10px] tracking-widest uppercase text-fg-3 mb-4">Payment method</p>
            <div className="flex items-center gap-3">
              <div className="w-12 h-8 rounded-md flex items-center justify-center" style={{background: 'linear-gradient(135deg, #555 0%, #222 100%)'}}>
                <span className="text-[10px] font-bold text-white tracking-widest">
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
            <div className="bg-surface border border-border rounded-[14px] p-6">
              <p className="font-mono text-[10px] tracking-widest uppercase text-fg-3 mb-4">Billing address</p>
              <div className="font-mono text-sm text-fg-2 leading-relaxed">
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
            <div className="bg-surface border border-border rounded-[14px] p-6 flex items-center justify-center">
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
    <div className="max-w-[1400px] mx-auto">
      <div className="mb-6">
        <p className="font-mono text-[11px] tracking-widest uppercase text-fg-3 mb-1.5">Subscription</p>
        <h1 className="text-[28px] font-bold text-fg tracking-tight">Your plan</h1>
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
