import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { stripe } from "@/lib/stripe"
import type Stripe from "stripe"

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
  )
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get("stripe-signature")

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature or webhook secret" }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    )
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  const db = getSupabaseAdmin()

  try {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.metadata?.user_id
      if (!userId || !session.subscription) break

      // Retrieve full subscription + payment method from Stripe
      const stripeSub = await stripe.subscriptions.retrieve(
        session.subscription as string,
        { expand: ["default_payment_method"] },
      )
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const subAny = stripeSub as any
      const pm = subAny.default_payment_method as Stripe.PaymentMethod | null
      const card = pm?.card

      const unitAmount = stripeSub.items.data[0]?.price?.unit_amount ?? 0
      const startTs = subAny.start_date ?? subAny.created ?? Math.floor(Date.now() / 1000)
      const endTs = subAny.current_period_end ?? Math.floor(Date.now() / 1000) + 365 * 24 * 3600

      const { error: insertError } = await db.from("subscriptions").upsert({
        user_id: userId,
        stripe_subscription_id: stripeSub.id,
        stripe_customer_id: session.customer as string,
        status: stripeSub.status === "trialing" ? "trial" : "active",
        plan: "annual",
        price_at_signup: unitAmount / 100,
        started_at: new Date(startTs * 1000).toISOString(),
        renews_at: new Date(endTs * 1000).toISOString(),
        payment_method_brand: card?.brand ?? "",
        payment_method_last4: card?.last4 ?? "",
        payment_method_expiry: card ? `${card.exp_month}/${card.exp_year}` : "",
      }, { onConflict: "stripe_subscription_id" })
      if (insertError) console.error("[webhook] insert error:", insertError)
      break
    }

    case "customer.subscription.updated": {
      const stripeSub = event.data.object as Stripe.Subscription
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const subAny2 = stripeSub as any
      const statusMap: Record<string, string> = {
        active: "active",
        trialing: "trial",
        past_due: "overdue",
        canceled: "cancelled",
        unpaid: "overdue",
        paused: "overdue",
      }
      await db.from("subscriptions")
        .update({
          status: statusMap[stripeSub.status] ?? "active",
          renews_at: new Date(subAny2.current_period_end * 1000).toISOString(),
        })
        .eq("stripe_subscription_id", stripeSub.id)
      break
    }

    case "customer.subscription.deleted": {
      const stripeSub = event.data.object as Stripe.Subscription
      await db.from("subscriptions")
        .update({ status: "cancelled" })
        .eq("stripe_subscription_id", stripeSub.id)
      break
    }

    case "invoice.payment_failed": {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const invoice = event.data.object as any
      if (invoice.subscription) {
        await db.from("subscriptions")
          .update({ status: "overdue" })
          .eq("stripe_subscription_id", invoice.subscription as string)
      }
      break
    }

    case "invoice.payment_succeeded": {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const invoice2 = event.data.object as any
      if (invoice2.subscription) {
        // Retrieve updated subscription to get new renews_at
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const stripeSub = await stripe.subscriptions.retrieve(invoice2.subscription as string) as any
        await db.from("subscriptions")
          .update({
            status: "active",
            renews_at: new Date(stripeSub.current_period_end * 1000).toISOString(),
          })
          .eq("stripe_subscription_id", invoice2.subscription as string)
      }
      break
    }
  }
  } catch (err) {
    console.error("[webhook] unhandled error:", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
