// v2
import { NextRequest, NextResponse } from 'next/server'
import { verifyBearerToken } from '@/lib/supabase/bearer'
import { createAdminClient } from '@/lib/supabase/admin'

const VERIFY_PROD    = 'https://buy.itunes.apple.com/verifyReceipt'
const VERIFY_SANDBOX = 'https://sandbox.itunes.apple.com/verifyReceipt'

async function callVerifyReceipt(receipt: string, sandbox: boolean) {
  const url = sandbox ? VERIFY_SANDBOX : VERIFY_PROD
  const body = JSON.stringify({
    'receipt-data': receipt,
    password: process.env.APPLE_IAP_SHARED_SECRET ?? '',
    'exclude-old-transactions': true,
  })
  console.log('[apple/validate] calling', sandbox ? 'SANDBOX' : 'PROD', 'url:', url, 'body size:', body.length)
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  })
  const json = await res.json()
  console.log('[apple/validate]', sandbox ? 'sandbox' : 'prod', 'raw response:', JSON.stringify({
    status: json.status,
    environment: json.environment,
    receipt_bundle_id: json.receipt?.bundle_id,
    receipt_app_item_id: json.receipt?.app_item_id,
    receipt_version_external_identifier: json.receipt?.version_external_identifier,
    latest_receipt_info_count: json.latest_receipt_info?.length ?? 0,
    is_retryable: json.is_retryable,
  }))
  return json
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

    const sharedSecret = process.env.APPLE_IAP_SHARED_SECRET ?? ''
    console.log('[apple/validate] APPLE_IAP_SHARED_SECRET set:', !!sharedSecret, 'length:', sharedSecret.length, 'hint:', sharedSecret.slice(0, 3) + '...' + sharedSecret.slice(-3))
    if (!sharedSecret) {
      console.error('[apple/validate] APPLE_IAP_SHARED_SECRET is missing — Apple will reject all receipts')
    }

    // Strip any whitespace/newlines — some iOS SDK versions emit MIME-style base64
    const cleanReceipt = (receipt as string).replace(/[\s\r\n]/g, '')
    const receiptPrefix = cleanReceipt.substring(0, 20)
    console.log('[apple/validate] receipt length:', cleanReceipt.length, 'prefix:', receiptPrefix)
    if (receiptPrefix.startsWith('eyJ')) {
      console.error('[apple/validate] receipt is JWS format (StoreKit 2) — verifyReceipt will return 21003')
    }
    // Deep-inspect the receipt structure for diagnostics
    try {
      const decoded = Buffer.from(cleanReceipt, 'base64')
      console.log('[apple/validate] receipt decoded bytes:', decoded.length,
        'first8hex:', decoded.slice(0, 8).toString('hex'),
        'last8hex:', decoded.slice(-8).toString('hex'))

      // PKCS#7 outer SEQUENCE with 2-byte length
      if (decoded.length > 4 && decoded[0] === 0x30 && decoded[1] === 0x82) {
        const declaredContentLen = (decoded[2] << 8) | decoded[3]
        const actualContentLen = decoded.length - 4
        const pct = Math.round(actualContentLen / declaredContentLen * 100)
        if (actualContentLen < declaredContentLen) {
          console.error('[apple/validate] RECEIPT TRUNCATED: declared', declaredContentLen,
            'bytes content, received', actualContentLen, 'bytes (', pct, '%)')
        } else {
          console.log('[apple/validate] receipt integrity OK:', actualContentLen, '/',
            declaredContentLen, 'declared bytes (', pct, '%)')
        }
        // OID immediately follows the outer SEQUENCE header (at byte 4)
        if (decoded[4] === 0x06) {
          const oidLen = decoded[5]
          const oidBytes = decoded.slice(6, 6 + oidLen).toString('hex')
          console.log('[apple/validate] receipt OID bytes:', oidBytes,
            '(pkcs7-signedData = 2a864886f70d010702)')
        }
      } else {
        console.warn('[apple/validate] receipt does not start with expected PKCS#7 SEQUENCE:',
          'byte0=0x' + decoded[0]?.toString(16),
          'byte1=0x' + decoded[1]?.toString(16))
      }
    } catch (e) {
      console.warn('[apple/validate] receipt inspection error:', String(e))
    }

    // Try production first; 21007 = sandbox receipt sent to prod (expected for TestFlight).
    // 21003 = receipt unauthenticated — prod sometimes returns this instead of 21007
    // for valid sandbox receipts, so also fall through to sandbox on 21003.
    let apple = await callVerifyReceipt(cleanReceipt, false)
    console.log('[apple/validate] prod status:', apple.status)
    if (apple.status === 21007 || apple.status === 21003) {
      apple = await callVerifyReceipt(cleanReceipt, true)
      console.log('[apple/validate] sandbox status:', apple.status)
    }

    if (apple.status !== 0) {
      console.error('[apple/validate] Apple validation failed, status:', apple.status)
      return NextResponse.json({ error: `Apple validation error (${apple.status}).`, appleStatus: apple.status }, { status: 400 })
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
