import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { stripe } from "@/lib/stripe"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  // ── Auth: Bearer (mobile) or session cookie (web) ──────────────────────────
  let userId: string | null = null
  const admin = createAdminClient()

  const authHeader = req.headers.get("authorization")
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null

  if (token) {
    const { verifyBearerToken } = await import('@/lib/supabase/bearer')
    const { data: { user }, error } = await verifyBearerToken(token)
    if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    userId = user.id
  } else {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    userId = user.id
  }

  // ── Get Stripe customer ID from subscription row ────────────────────────────
  const { data: sub } = await admin
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!sub?.stripe_customer_id) {
    return NextResponse.json({ invoices: [] })
  }

  // ── Fetch invoices from Stripe ──────────────────────────────────────────────
  try {
    const list = await stripe.invoices.list({
      customer: sub.stripe_customer_id!,
      limit: 24,
    })

    const invoices = list.data.map((inv) => ({
      id:          inv.id,
      date:        inv.created,         // Unix timestamp
      amount:      inv.amount_paid,     // cents
      currency:    inv.currency,
      status:      inv.status,          // "paid" | "open" | "void" | "uncollectible"
      pdf_url:     inv.invoice_pdf,
      hosted_url:  inv.hosted_invoice_url,
    }))

    return NextResponse.json({ invoices })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Stripe error"
    // Fake/test customer IDs (e.g. Apple review account) return "No such customer" — treat as empty
    if (message.includes('No such customer')) {
      return NextResponse.json({ invoices: [] })
    }
    console.error("[stripe/invoices]", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
