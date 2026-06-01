import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export type ServiceHealth = {
  name: string
  status: 'ok' | 'degraded' | 'down'
  latencyMs: number
  detail: string
}

export type HealthResponse = {
  ok: boolean
  checkedAt: string
  services: ServiceHealth[]
}

async function checkSupabase(): Promise<ServiceHealth> {
  const start = Date.now()
  try {
    const db = createAdminClient()
    const { error } = await db.from('users').select('id', { count: 'exact', head: true })
    const ms = Date.now() - start
    if (error) return { name: 'Supabase (DB)', status: 'down', latencyMs: ms, detail: error.message }
    return { name: 'Supabase (DB)', status: ms > 3000 ? 'degraded' : 'ok', latencyMs: ms, detail: `Query completed in ${ms}ms` }
  } catch (e) {
    return { name: 'Supabase (DB)', status: 'down', latencyMs: Date.now() - start, detail: String(e) }
  }
}

async function checkStripe(): Promise<ServiceHealth> {
  const start = Date.now()
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return { name: 'Stripe', status: 'down', latencyMs: 0, detail: 'STRIPE_SECRET_KEY not set' }
  try {
    const res = await fetch('https://api.stripe.com/v1/balance', {
      headers: { Authorization: `Bearer ${key}` },
    })
    const ms = Date.now() - start
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      return { name: 'Stripe', status: 'down', latencyMs: ms, detail: body?.error?.message ?? `HTTP ${res.status}` }
    }
    return { name: 'Stripe', status: ms > 3000 ? 'degraded' : 'ok', latencyMs: ms, detail: `API responded in ${ms}ms` }
  } catch (e) {
    return { name: 'Stripe', status: 'down', latencyMs: Date.now() - start, detail: String(e) }
  }
}

async function checkResend(): Promise<ServiceHealth> {
  const start = Date.now()
  const key = process.env.RESEND_API_KEY
  if (!key) return { name: 'Resend', status: 'down', latencyMs: 0, detail: 'RESEND_API_KEY not set' }
  try {
    const res = await fetch('https://api.resend.com/domains', {
      headers: { Authorization: `Bearer ${key}` },
    })
    const ms = Date.now() - start
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      return { name: 'Resend', status: 'down', latencyMs: ms, detail: body?.message ?? `HTTP ${res.status}` }
    }
    return { name: 'Resend', status: ms > 3000 ? 'degraded' : 'ok', latencyMs: ms, detail: `API responded in ${ms}ms` }
  } catch (e) {
    return { name: 'Resend', status: 'down', latencyMs: Date.now() - start, detail: String(e) }
  }
}

export async function GET() {
  const [supabase, stripe, resend] = await Promise.all([
    checkSupabase(),
    checkStripe(),
    checkResend(),
  ])

  const services = [supabase, stripe, resend]
  const ok = services.every(s => s.status === 'ok')

  const body: HealthResponse = {
    ok,
    checkedAt: new Date().toISOString(),
    services,
  }

  return NextResponse.json(body, { status: ok ? 200 : 503 })
}
