// Legacy path — kept so old Stripe webhook configs still work.
// All logic lives at /api/stripe/webhook.
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  // Forward the raw body and stripe-signature header to the canonical handler.
  const body = await request.text()
  const sig = request.headers.get('stripe-signature') ?? ''

  const canonical = new URL('/api/stripe/webhook', request.url)
  const response = await fetch(canonical.toString(), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'stripe-signature': sig,
    },
    body,
  })

  const json = await response.json()
  return NextResponse.json(json, { status: response.status })
}
