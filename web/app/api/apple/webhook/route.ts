import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Decode the payload of a JWS token without verifying the signature.
// Apple's App Store Server Notifications are signed by Apple — we trust
// that they arrive over HTTPS from Apple's IP ranges.
function decodeJWSPayload(jws: string): Record<string, unknown> | null {
  try {
    const parts = jws.split('.')
    if (parts.length !== 3) return null
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4)
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf-8'))
  } catch {
    return null
  }
}

// Maps Apple notificationType (+ optional subtype) to our DB status.
// Returns undefined if the event should be ignored.
function resolveStatus(notificationType: string, subtype: string): string | undefined {
  switch (notificationType) {
    case 'SUBSCRIBED':                    return 'active'
    case 'DID_RENEW':                     return 'active'
    case 'DID_FAIL_TO_RENEW':            return subtype === 'GRACE_PERIOD' ? 'active' : 'overdue'
    case 'EXPIRED':                       return 'cancelled'
    case 'REFUND':                        return 'cancelled'
    case 'REVOKE':                        return 'cancelled'
    case 'DID_CHANGE_RENEWAL_STATUS':
      return subtype === 'AUTO_RENEW_DISABLED' ? 'cancelled' : 'active'
    default:
      return undefined // PRICE_INCREASE, TEST, etc. — nothing to do
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { signedPayload } = body
    if (!signedPayload) return NextResponse.json({ received: true })

    // Decode outer notification envelope
    const notification = decodeJWSPayload(signedPayload as string)
    if (!notification) {
      console.error('[apple/webhook] failed to decode signedPayload')
      return NextResponse.json({ received: true })
    }

    const notificationType = notification.notificationType as string
    const subtype          = (notification.subtype as string) ?? ''
    const data             = notification.data as Record<string, unknown> | undefined

    const signedTransactionInfo = data?.signedTransactionInfo as string | undefined
    const signedRenewalInfo     = data?.signedRenewalInfo     as string | undefined

    if (!signedTransactionInfo) return NextResponse.json({ received: true })

    // Decode signed transaction to get originalTransactionId, expiresDate, productId
    const tx = decodeJWSPayload(signedTransactionInfo)
    if (!tx) return NextResponse.json({ received: true })

    const originalTransactionId = tx.originalTransactionId as string
    if (!originalTransactionId) return NextResponse.json({ received: true })

    const newStatus = resolveStatus(notificationType, subtype)
    if (!newStatus) {
      console.log(`[apple/webhook] ignoring ${notificationType}/${subtype}`)
      return NextResponse.json({ received: true })
    }

    // Determine renews_at: prefer signedRenewalInfo.expirationDate, fall back to tx.expiresDate
    let renewsAt: string | undefined
    if (signedRenewalInfo) {
      const renewal = decodeJWSPayload(signedRenewalInfo)
      const ms = (renewal?.expirationDate ?? renewal?.renewalDate) as number | undefined
      if (ms) renewsAt = new Date(ms).toISOString()
    }
    if (!renewsAt && tx.expiresDate) {
      renewsAt = new Date(tx.expiresDate as number).toISOString()
    }

    const admin = createAdminClient()

    const { data: existing } = await admin
      .from('subscriptions')
      .select('id')
      .eq('apple_original_transaction_id', originalTransactionId)
      .maybeSingle()

    if (existing) {
      const update: Record<string, unknown> = { status: newStatus }
      if (renewsAt) update.renews_at = renewsAt
      await admin.from('subscriptions').update(update).eq('id', existing.id)
      console.log(`[apple/webhook] ${notificationType}/${subtype} → ${newStatus} for ${originalTransactionId}`)
    } else {
      // No row yet — the validate endpoint creates the row on first purchase.
      // Webhook may arrive before the client validates; nothing to do.
      console.log(`[apple/webhook] no row found for ${originalTransactionId}, skipping`)
    }

    return NextResponse.json({ received: true })
  } catch (e) {
    console.error('[apple/webhook]', e)
    // Always return 200 so Apple doesn't retry indefinitely
    return NextResponse.json({ received: true })
  }
}
