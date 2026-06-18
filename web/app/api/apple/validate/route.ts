import { NextRequest, NextResponse } from 'next/server'
import { verifyBearerToken } from '@/lib/supabase/bearer'
import { createAdminClient } from '@/lib/supabase/admin'

const VERIFY_PROD    = 'https://buy.itunes.apple.com/verifyReceipt'
const VERIFY_SANDBOX = 'https://sandbox.itunes.apple.com/verifyReceipt'

async function callVerifyReceipt(receipt: string, sandbox: boolean) {
  const res = await fetch(sandbox ? VERIFY_SANDBOX : VERIFY_PROD, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      'receipt-data': receipt,
      password: process.env.APPLE_IAP_SHARED_SECRET!,
      'exclude-old-transactions': true,
    }),
  })
  return res.json()
}

export async function POST(req: NextRequest) {
  try {
    const { receipt } = await req.json()
    if (!receipt) return NextResponse.json({ error: 'Receipt required.' }, { status: 400 })

    const authHeader = req.headers.get('authorization')
    console.log('[apple/validate] authHeader present:', !!authHeader, 'length:', authHeader?.length ?? 0, 'prefix:', authHeader?.substring(0, 14) ?? 'none')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (!token) {
      console.error('[apple/validate] token missing — authHeader was:', authHeader ?? 'null')
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const { data: { user }, error: authErr } = await verifyBearerToken(token)
    if (authErr || !user) {
      console.error('[apple/validate] Auth failed:', authErr?.message ?? 'no user returned')
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    // Try production first; status 21007 means sandbox receipt sent to production
    let apple = await callVerifyReceipt(receipt, false)
    console.log('[apple/validate] prod status:', apple.status)
    if (apple.status === 21007) {
      apple = await callVerifyReceipt(receipt, true)
      console.log('[apple/validate] sandbox status:', apple.status)
    }

    if (apple.status !== 0) {
      console.error('[apple/validate] Apple validation failed, status:', apple.status)
      return NextResponse.json({ error: `Apple validation error (${apple.status}).` }, { status: 400 })
    }

    const productId = process.env.APPLE_IAP_PRODUCT_ID!
    const txList: Record<string, string>[] = apple.latest_receipt_info ?? apple.receipt?.in_app ?? []
    const txProductIds = txList.map((t) => t.product_id)
    console.log('[apple/validate] looking for productId:', productId, 'found in receipt:', txProductIds)

    // Pick the most recent non-expired transaction for our product
    const latest = txList
      .filter((t) => t.product_id === productId)
      .sort((a, b) => Number(b.purchase_date_ms) - Number(a.purchase_date_ms))[0]

    if (!latest) {
      console.error('[apple/validate] no matching tx — expected:', productId, 'got:', txProductIds)
      return NextResponse.json({ error: 'No matching transaction found.' }, { status: 400 })
    }

    const originalTransactionId = latest.original_transaction_id
    const expiresMs  = Number(latest.expires_date_ms)
    const startedAt  = new Date(Number(latest.purchase_date_ms)).toISOString()
    const renewsAt   = new Date(expiresMs).toISOString()
    const status     = expiresMs < Date.now() ? 'cancelled' : 'active'

    const admin = createAdminClient()

    // Upsert: one row per original_transaction_id
    const { data: existing } = await admin
      .from('subscriptions')
      .select('id, status')
      .eq('apple_original_transaction_id', originalTransactionId)
      .maybeSingle()

    let subId: string | undefined

    if (existing) {
      await admin.from('subscriptions')
        .update({ status, renews_at: renewsAt })
        .eq('id', existing.id)
      subId = existing.id
    } else {
      const { data: inserted, error: insertErr } = await admin
        .from('subscriptions')
        .insert({
          user_id: user.id,
          apple_original_transaction_id: originalTransactionId,
          apple_product_id: productId,
          source: 'apple',
          status,
          plan: 'Pro',
          started_at: startedAt,
          renews_at: renewsAt,
          ...(process.env.APPLE_IAP_PRICE ? { price_at_signup: Number(process.env.APPLE_IAP_PRICE) } : {}),
        })
        .select('id')
        .single()

      if (insertErr) {
        console.error('[apple/validate] insert error:', insertErr.message)
        return NextResponse.json({ error: 'Could not save subscription.' }, { status: 500 })
      }
      subId = inserted?.id
    }

    // Log subscription event (non-fatal)
    try {
      await admin.from('subscription_events').insert({
        user_id: user.id,
        sub_id: subId ?? null,
        event: existing ? 'iap_revalidated' : 'iap_subscribed',
        metadata: { original_transaction_id: originalTransactionId, product_id: productId },
      })
    } catch { /* ignore — events table may have enum constraints */ }

    console.log(`[apple/validate] ${existing ? 'updated' : 'created'} sub for user`, user.id, 'status:', status)

    // If the receipt is already expired, tell the client so it can show an appropriate message
    // rather than silently marking the purchase as successful while the subscription is cancelled.
    if (status === 'cancelled') {
      return NextResponse.json({
        success: false,
        error: 'Your subscription has expired. Please contact support if you were charged.',
      }, { status: 422 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[apple/validate]', e)
    return NextResponse.json({ error: 'Validation failed.' }, { status: 500 })
  }
}
