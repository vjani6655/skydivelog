import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { stripe } from "@/lib/stripe"

export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Check if user already has a Stripe customer to avoid duplicates
  const { data: existingSub } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://jumplogs.com'

  const sessionParams: Parameters<typeof stripe.checkout.sessions.create>[0] = {
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
    success_url: `${APP_URL}/billing?upgraded=1`,
    cancel_url: `${APP_URL}/subscription`,
    allow_promotion_codes: true,
    metadata: { user_id: user.id },
  }

  if (existingSub?.stripe_customer_id) {
    sessionParams.customer = existingSub.stripe_customer_id
  } else {
    sessionParams.customer_email = user.email
  }

  try {
    const session = await stripe.checkout.sessions.create(sessionParams)
    return NextResponse.json({ url: session.url })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Stripe error'
    console.error('[create-checkout]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
