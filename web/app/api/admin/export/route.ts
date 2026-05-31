export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

// ─── CSV helpers ──────────────────────────────────────────────────────────────

function esc(v: unknown): string {
  const s = String(v ?? '')
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function isoDate(s: string | null | undefined): string {
  if (!s) return ''
  return new Date(s).toISOString()
}

// ─── Auth guard ───────────────────────────────────────────────────────────────

async function getCallerAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const db = createAdminClient()
  const { data: adminRow } = await db
    .from('admins').select('id, role')
    .eq('email', user.email!).eq('active', true).maybeSingle()
  return adminRow ?? null
}

// ─── POST handler ─────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const caller = await getCallerAdmin()
  if (!caller) return new Response('Forbidden', { status: 403 })

  let body: {
    dataset: string
    fields: string[]
    filters?: {
      fromDate?: string
      toDate?: string
      subStatus?: string[]
      country?: string
    }
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { dataset, fields, filters = {} } = body
  if (!Array.isArray(fields) || !fields.length) {
    return NextResponse.json({ error: 'No fields selected' }, { status: 400 })
  }

  const { fromDate, toDate, subStatus, country } = filters
  const toDateEnd = toDate ? toDate + 'T23:59:59.999Z' : undefined
  const db = createAdminClient()

  // ── Users ───────────────────────────────────────────────────────────────────
  if (dataset === 'users') {
    type UserRow = {
      id: string; email: string | null; full_name: string | null
      licence_number: string | null; licence_rating: string | null
      date_of_birth: string | null; phone: string | null; country: string | null
      created_at: string | null; last_sign_in_at: string | null; last_ip: string | null
      two_factor_enabled: boolean | null; preferred_altitude_unit: string | null
      marketing_emails_opt_in: boolean | null; emergency_contact_name: string | null
      dropzones: { name: string | null } | null
    }
    let q = db.from('users').select(
      'id, email, full_name, licence_number, licence_rating, date_of_birth,' +
      'phone, country, created_at, last_sign_in_at, last_ip,' +
      'two_factor_enabled, preferred_altitude_unit, marketing_emails_opt_in,' +
      'emergency_contact_name, dropzones(name)'
    ).order('created_at', { ascending: false }).limit(100000)

    if (fromDate)  q = q.gte('created_at', fromDate)
    if (toDateEnd) q = q.lte('created_at', toDateEnd)
    if (country && country !== 'all') q = q.eq('country', country)

    const { data: rawUsers } = await q
    const users = (rawUsers ?? []) as unknown as UserRow[]
    const userIds = users.map(u => u.id)

    // Subscriptions — pick effective sub per user (latest started_at)
    type SubEntry = { user_id: string; status: string | null; plan: string | null; renews_at: string | null; stripe_customer_id: string | null; started_at: string | null }
    const { data: allSubs } = await db
      .from('subscriptions')
      .select('user_id, status, plan, renews_at, stripe_customer_id, started_at')
      .in('user_id', userIds)
    const subMap: Record<string, SubEntry> = {}
    ;(allSubs ?? [] as SubEntry[]).forEach(s => {
      const ex = subMap[s.user_id]
      if (!ex || (s.started_at ?? '') > (ex.started_at ?? '')) subMap[s.user_id] = s
    })

    // Jump counts + freefall
    const { data: jumpRows } = await db
      .from('jumps').select('user_id, freefall_seconds')
      .in('user_id', userIds).is('deleted_at', null)
    const jCount: Record<string, number> = {}
    const ffMap:  Record<string, number> = {}
    ;(jumpRows ?? []).forEach(j => {
      jCount[j.user_id] = (jCount[j.user_id] ?? 0) + 1
      ffMap[j.user_id]  = (ffMap[j.user_id]  ?? 0) + (j.freefall_seconds ?? 0)
    })

    // Sub status filter
    const statusFilter = (subStatus ?? []).map(s => s.toLowerCase())
    const trialMs = 14 * 86400000

    const COLS: Record<string, { header: string; fn: (u: UserRow) => string }> = {
      id:                   { header: 'ID',                   fn: u => esc(u.id) },
      email:                { header: 'Email',                fn: u => esc(u.email) },
      name:                 { header: 'Full name',            fn: u => esc(u.full_name) },
      licence:              { header: 'Licence #',            fn: u => esc(u.licence_number) },
      rating:               { header: 'Licence rating',       fn: u => esc(u.licence_rating) },
      dob:                  { header: 'Date of birth',        fn: u => esc(u.date_of_birth) },
      phone:                { header: 'Phone',                fn: u => esc(u.phone) },
      country:              { header: 'Country',              fn: u => esc(u.country) },
      created_at:           { header: 'Joined',               fn: u => esc(isoDate(u.created_at)) },
      last_seen_at:         { header: 'Last seen',            fn: u => esc(isoDate(u.last_sign_in_at)) },
      last_ip:              { header: 'Last IP',              fn: u => esc(u.last_ip) },
      two_factor:           { header: '2FA enabled',          fn: u => esc(u.two_factor_enabled) },
      preferred_units:      { header: 'Alt units',            fn: u => esc(u.preferred_altitude_unit) },
      marketing_opt_in:     { header: 'Marketing opt-in',     fn: u => esc(u.marketing_emails_opt_in) },
      home_dz:              { header: 'Home DZ',              fn: u => esc(u.dropzones?.name) },
      emergency_contact:    { header: 'Emergency contact',    fn: u => esc(u.emergency_contact_name) },
      subscription_status:  { header: 'Sub status',          fn: u => {
        const s = subMap[u.id]
        return esc(s ? s.status : (Date.now() < new Date(u.created_at ?? 0).getTime() + trialMs ? 'trial' : 'expired'))
      }},
      plan:                 { header: 'Plan',                 fn: u => esc(subMap[u.id]?.plan) },
      renews_at:            { header: 'Renews at',            fn: u => esc(isoDate(subMap[u.id]?.renews_at)) },
      stripe_id:            { header: 'Stripe customer ID',   fn: u => esc(subMap[u.id]?.stripe_customer_id) },
      jump_count:           { header: 'Jump count',           fn: u => esc(jCount[u.id] ?? 0) },
      ff_seconds:           { header: 'Freefall seconds',     fn: u => esc(ffMap[u.id] ?? 0) },
    }

    const validCols = fields.filter(f => COLS[f])
    let rows = users
    if (statusFilter.length) {
      rows = rows.filter(u => {
        const s = subMap[u.id]
        const st = s ? s.status : (Date.now() < new Date(u.created_at ?? 0).getTime() + trialMs ? 'trial' : 'expired')
        return statusFilter.includes(st ?? '')
      })
    }

    const header = validCols.map(f => COLS[f].header).join(',')
    const lines  = rows.map(u => validCols.map(f => COLS[f].fn(u)).join(','))
    const csv    = [header, ...lines].join('\n')
    const name   = `users_${new Date().toISOString().slice(0, 10)}.csv`

    return new Response(csv, { headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${name}"`,
    }})
  }

  // ── Jumps ───────────────────────────────────────────────────────────────────
  if (dataset === 'jumps') {
    let q = db.from('jumps').select(
      'id, user_id, jump_number, date, aircraft_type, aircraft_rego,' +
      'exit_altitude_ft, pull_altitude_ft, deploy_altitude_ft,' +
      'freefall_seconds, canopy_seconds, jump_type, jumper_type,' +
      'jump_stage, canopy_type, landing_accuracy_value, landing_accuracy_unit,' +
      'notes, coordinates_lat, coordinates_lng, is_favourite, is_draft,' +
      'created_at, updated_at,' +
      'users(email), dropzones(name)'
    ).is('deleted_at', null).order('date', { ascending: false }).limit(500000)

    if (fromDate)  q = q.gte('date', fromDate)
    if (toDateEnd) q = q.lte('date', toDateEnd)

    const { data: rawJumps } = await q
    type JumpRow = {
      id: string | null; user_id: string | null; jump_number: number | null; date: string | null
      aircraft_type: string | null; aircraft_rego: string | null
      exit_altitude_ft: number | null; pull_altitude_ft: number | null; deploy_altitude_ft: number | null
      freefall_seconds: number | null; canopy_seconds: number | null
      jump_type: string | null; jumper_type: string | null; jump_stage: string | null
      canopy_type: string | null; landing_accuracy_value: number | null; landing_accuracy_unit: string | null
      notes: string | null; coordinates_lat: number | null; coordinates_lng: number | null
      is_favourite: boolean | null; is_draft: boolean | null
      created_at: string | null; updated_at: string | null
      users: { email: string | null } | null; dropzones: { name: string | null } | null
    }
    const jumps = (rawJumps ?? []) as unknown as JumpRow[]
    const COLS: Record<string, { header: string; fn: (j: JumpRow) => string }> = {
      id:                     { header: 'ID',                   fn: j => esc(j.id) },
      user_email:             { header: 'User email',           fn: j => esc(j.users?.email) },
      jump_number:            { header: 'Jump #',               fn: j => esc(j.jump_number) },
      date:                   { header: 'Date',                 fn: j => esc(isoDate(j.date)) },
      dropzone:               { header: 'Dropzone',             fn: j => esc(j.dropzones?.name) },
      aircraft_type:          { header: 'Aircraft type',        fn: j => esc(j.aircraft_type) },
      aircraft_rego:          { header: 'Aircraft rego',        fn: j => esc(j.aircraft_rego) },
      exit_altitude_ft:       { header: 'Exit alt (ft)',        fn: j => esc(j.exit_altitude_ft) },
      pull_altitude_ft:       { header: 'Pull alt (ft)',        fn: j => esc(j.pull_altitude_ft) },
      deploy_altitude_ft:     { header: 'Deploy alt (ft)',      fn: j => esc(j.deploy_altitude_ft) },
      freefall_seconds:       { header: 'Freefall (s)',         fn: j => esc(j.freefall_seconds) },
      canopy_seconds:         { header: 'Canopy (s)',           fn: j => esc(j.canopy_seconds) },
      jump_type:              { header: 'Jump type',            fn: j => esc(j.jump_type) },
      jumper_type:            { header: 'Jumper type',          fn: j => esc(j.jumper_type) },
      jump_stage:             { header: 'Stage',                fn: j => esc(j.jump_stage) },
      canopy_type:            { header: 'Canopy type',          fn: j => esc(j.canopy_type) },
      landing_accuracy_value: { header: 'Landing accuracy',     fn: j => esc(j.landing_accuracy_value) },
      landing_accuracy_unit:  { header: 'Landing unit',         fn: j => esc(j.landing_accuracy_unit) },
      notes:                  { header: 'Notes',                fn: j => esc(j.notes) },
      coordinates_lat:        { header: 'Lat',                  fn: j => esc(j.coordinates_lat) },
      coordinates_lng:        { header: 'Lng',                  fn: j => esc(j.coordinates_lng) },
      is_favourite:           { header: 'Favourite',            fn: j => esc(j.is_favourite) },
      is_draft:               { header: 'Draft',                fn: j => esc(j.is_draft) },
      created_at:             { header: 'Created',              fn: j => esc(isoDate(j.created_at)) },
      updated_at:             { header: 'Updated',              fn: j => esc(isoDate(j.updated_at)) },
    }

    const validCols = fields.filter(f => COLS[f])
    const header    = validCols.map(f => COLS[f].header).join(',')
    const lines     = jumps.map(j => validCols.map(f => COLS[f].fn(j)).join(','))
    const csv       = [header, ...lines].join('\n')
    const name      = `jumps_${new Date().toISOString().slice(0, 10)}.csv`

    return new Response(csv, { headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${name}"`,
    }})
  }

  // ── Revenue ─────────────────────────────────────────────────────────────────
  if (dataset === 'revenue') {
    let q = db.from('subscriptions').select(
      'id, user_id, stripe_subscription_id, stripe_customer_id,' +
      'status, plan, price_at_signup, started_at, renews_at,' +
      'payment_method_brand, payment_method_last4, payment_method_expiry,' +
      'refunded_at, refunded_amount,' +
      'users(email)'
    ).order('started_at', { ascending: false }).limit(100000)

    if (fromDate)  q = q.gte('started_at', fromDate)
    if (toDateEnd) q = q.lte('started_at', toDateEnd)
    if (subStatus?.length) {
      const st = subStatus.map(s => s.toLowerCase()).filter(s => ['active','overdue','cancelled','trial'].includes(s))
      if (st.length) q = q.in('status', st)
    }

    const { data: rawSubs } = await q
    type SubRow = {
      id: string | null; user_id: string | null
      stripe_subscription_id: string | null; stripe_customer_id: string | null
      status: string | null; plan: string | null; price_at_signup: number | null
      started_at: string | null; renews_at: string | null
      payment_method_brand: string | null; payment_method_last4: string | null; payment_method_expiry: string | null
      refunded_at: string | null; refunded_amount: number | null
      users: { email: string | null } | null
    }
    const subs = (rawSubs ?? []) as unknown as SubRow[]
    const COLS: Record<string, { header: string; fn: (s: SubRow) => string }> = {
      id:                     { header: 'ID',                   fn: s => esc(s.id) },
      user_email:             { header: 'User email',           fn: s => esc(s.users?.email) },
      stripe_subscription_id: { header: 'Stripe sub ID',        fn: s => esc(s.stripe_subscription_id) },
      stripe_customer_id:     { header: 'Stripe customer ID',   fn: s => esc(s.stripe_customer_id) },
      status:                 { header: 'Status',               fn: s => esc(s.status) },
      plan:                   { header: 'Plan',                 fn: s => esc(s.plan) },
      price_at_signup:        { header: 'Price',                fn: s => esc(s.price_at_signup) },
      started_at:             { header: 'Started',              fn: s => esc(isoDate(s.started_at)) },
      renews_at:              { header: 'Renews at',            fn: s => esc(isoDate(s.renews_at)) },
      payment_method_brand:   { header: 'Card brand',           fn: s => esc(s.payment_method_brand) },
      payment_method_last4:   { header: 'Card last 4',          fn: s => esc(s.payment_method_last4) },
      payment_method_expiry:  { header: 'Card expiry',          fn: s => esc(s.payment_method_expiry) },
      refunded_at:            { header: 'Refunded at',          fn: s => esc(isoDate(s.refunded_at)) },
      refunded_amount:        { header: 'Refunded amount',      fn: s => esc(s.refunded_amount) },
    }

    const validCols = fields.filter(f => COLS[f])
    const header    = validCols.map(f => COLS[f].header).join(',')
    const lines     = subs.map(s => validCols.map(f => COLS[f].fn(s)).join(','))
    const csv       = [header, ...lines].join('\n')
    const name      = `revenue_${new Date().toISOString().slice(0, 10)}.csv`

    return new Response(csv, { headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${name}"`,
    }})
  }

  // ── Audit log ────────────────────────────────────────────────────────────────
  if (dataset === 'audit') {
    let q = db.from('audit_log').select(
      'id, action, target, reason, created_at, admins(name, email)'
    ).order('created_at', { ascending: false }).limit(100000)

    if (fromDate)  q = q.gte('created_at', fromDate)
    if (toDateEnd) q = q.lte('created_at', toDateEnd)

    const { data: rawEntries } = await q
    type AuditRow = {
      id: string | null; action: string | null; target: string | null
      reason: string | null; created_at: string | null
      admins: { name: string | null; email: string | null } | null
    }
    const entries = (rawEntries ?? []) as unknown as AuditRow[]
    const COLS: Record<string, { header: string; fn: (e: AuditRow) => string }> = {
      id:          { header: 'ID',          fn: e => esc(e.id) },
      admin_name:  { header: 'Admin name',  fn: e => esc(e.admins?.name) },
      admin_email: { header: 'Admin email', fn: e => esc(e.admins?.email) },
      action:      { header: 'Action',      fn: e => esc(e.action) },
      target:      { header: 'Target',      fn: e => esc(e.target) },
      reason:      { header: 'Reason',      fn: e => esc(e.reason) },
      created_at:  { header: 'Timestamp',   fn: e => esc(isoDate(e.created_at)) },
    }

    const validCols = fields.filter(f => COLS[f])
    const header    = validCols.map(f => COLS[f].header).join(',')
    const lines     = entries.map(e => validCols.map(f => COLS[f].fn(e)).join(','))
    const csv       = [header, ...lines].join('\n')
    const name      = `audit_${new Date().toISOString().slice(0, 10)}.csv`

    return new Response(csv, { headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${name}"`,
    }})
  }

  return NextResponse.json({ error: 'Unknown dataset' }, { status: 400 })
}
