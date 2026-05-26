export const dynamic = 'force-dynamic'

import { createClient } from "@/lib/supabase/server"
import Stripe from "stripe"
import { Download } from "lucide-react"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

function fmtDate(ts: number) {
  return new Date(ts * 1000).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function fmtAmount(amount: number, currency: string) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(amount / 100)
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ upgraded?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id, stripe_subscription_id, status")
    .eq("user_id", user!.id)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  let invoices: Stripe.Invoice[] = []
  let receiptEmail: string | null = user?.email ?? null

  if (sub?.stripe_customer_id) {
    try {
      const [invoiceResult, customer] = await Promise.all([
        stripe.invoices.list({ customer: sub.stripe_customer_id, limit: 50 }),
        stripe.customers.retrieve(sub.stripe_customer_id),
      ])
      invoices = invoiceResult.data
      if (!customer.deleted) receiptEmail = customer.email ?? receiptEmail
    } catch {
      // Stripe error — show empty state
    }
  }

  return (
    <div className="max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] tracking-widest uppercase text-fg-3 mb-1.5">Billing</p>
          <h1 className="text-[28px] font-bold text-fg tracking-tight">Invoice history</h1>
        </div>
        {invoices.length > 0 && (() => {
          const latest = invoices[0]
          const url = latest.status === 'paid'
            ? (latest.hosted_invoice_url ?? latest.invoice_pdf)
            : latest.invoice_pdf
          return url ? (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 border border-border text-fg-2 text-sm px-3 py-2 rounded-sm hover:bg-surface-2 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              {latest.status === 'paid' ? 'View receipt' : 'Download invoice'}
            </a>
          ) : null
        })()}
      </div>

      {params.upgraded === "1" && (
        <div className="mb-5 bg-ok-bg border border-ok/20 rounded-lg px-4 py-3 text-sm text-ok font-medium">
          ✓ Your subscription is now active. Welcome aboard!
        </div>
      )}

      {invoices.length === 0 ? (
        <div className="bg-surface border border-border rounded-[14px] px-6 py-14 text-center">
          <p className="text-sm text-fg-3">No invoices yet.</p>
          {!sub && (
            <a href="/subscription" className="mt-3 inline-block text-xs text-sky hover:text-sky/80">
              View subscription plans →
            </a>
          )}
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-[14px] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                {["INVOICE", "DATE", "DESCRIPTION", "AMOUNT", "STATUS", ""].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-2.5 text-overline font-semibold tracking-widest text-fg-4"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {invoices.map((inv) => {
                const status = inv.status
                const isPaid = status === "paid"
                return (
                  <tr key={inv.id} className="hover:bg-surface-2 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-fg-3">
                      {inv.number ?? inv.id.slice(0, 12)}
                    </td>
                    <td className="px-4 py-3 text-xs text-fg whitespace-nowrap">
                      {fmtDate(inv.created)}
                    </td>
                    <td className="px-4 py-3 text-xs text-fg-2">
                      {inv.lines.data[0]?.description ?? "Annual renewal"}
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-fg">
                      {fmtAmount(inv.amount_paid, inv.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          isPaid
                            ? "bg-ok-bg text-ok"
                            : status === "open"
                            ? "bg-warn-bg text-warn"
                            : "bg-surface-3 text-fg-3"
                        }`}
                      >
                        {status?.toUpperCase() ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {(() => {
                        const url = isPaid
                          ? (inv.hosted_invoice_url ?? inv.invoice_pdf)
                          : inv.invoice_pdf
                        return url ? (
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-fg-4 hover:text-sky transition-colors"
                            title={isPaid ? 'View receipt' : 'Download invoice'}
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        ) : null
                      })()}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Receipts email */}
      {receiptEmail && (
        <div className="mt-5 border-t border-border pt-4 flex items-center justify-between">
          <p className="text-xs text-fg-4">
            Receipts sent to <span className="text-fg-2">{receiptEmail}</span> after every renewal.
          </p>
          <a href="/settings" className="text-xs text-sky hover:text-sky/80">
            Change
          </a>
        </div>
      )}
    </div>
  )
}
