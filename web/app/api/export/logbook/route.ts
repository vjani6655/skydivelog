import { createClient }          from '@/lib/supabase/server'
import { createAdminClient }     from '@/lib/supabase/admin'
import { SingleDocument } from '@/lib/pdf/single'
import { TenDocument }    from '@/lib/pdf/ten'
import type { JumperProfile, PdfJump } from '@/lib/pdf/types'
import { renderToStream } from '@react-pdf/renderer'
import crypto             from 'crypto'
import React              from 'react'

export const dynamic = 'force-dynamic'

function generateCode(): string {
  return crypto.randomBytes(5).toString('hex') // 10-char hex
}

/** Decode a Supabase JWT payload locally — no network call required. */
function decodeJwt(token: string): { sub?: string; exp?: number } | null {
  try {
    const payload = token.split('.')[1]
    const decoded = Buffer.from(payload, 'base64url').toString('utf8')
    return JSON.parse(decoded)
  } catch {
    return null
  }
}

export async function POST(request: Request) {
  // ── Auth — cookie (web) or Bearer token (mobile) ──────────────────────────
  let userId: string | null = null

  const bearerToken = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? null

  const admin = createAdminClient()

  if (bearerToken) {
    // Mobile: decode JWT locally to get user ID — avoids Supabase auth API call
    const claims = decodeJwt(bearerToken)
    if (!claims?.sub) return new Response('Unauthorized', { status: 401 })
    if (claims.exp && claims.exp < Math.floor(Date.now() / 1000)) {
      return new Response('Token expired', { status: 401 })
    }
    userId = claims.sub
  } else {
    // Web: session cookie
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return new Response('Unauthorized', { status: 401 })
    userId = user.id
  }

  const supabase = admin

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: { jumpIds?: string[]; layout?: string }
  try {
    body = await request.json()
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }
  const { jumpIds, layout } = body
  if (!Array.isArray(jumpIds) || jumpIds.length === 0) {
    return new Response('jumpIds required', { status: 400 })
  }
  if (layout !== 'single' && layout !== 'ten') {
    return new Response('layout must be "single" or "ten"', { status: 400 })
  }

  // ── Fetch jumps (scoped to this user) ─────────────────────────────────────
  const { data: rawJumps, error: jumpsErr } = await supabase
    .from('jumps')
    .select(`
      id,
      jump_number,
      date,
      aircraft_type,
      aircraft_rego,
      jump_type,
      jump_stage,
      canopy_type,
      jumper_type,
      exit_altitude_ft,
      pull_altitude_ft,
      freefall_seconds,
      canopy_seconds,
      landing_accuracy_value,
      landing_accuracy_unit,
      notes,
      people_on_jump,
      dropzones ( name, region ),
      signatures ( signer_name, signer_licence_number, signer_licence_rating, signature_data, outcome, notes )
    `)
    .eq('user_id', userId)
    .in('id', jumpIds)
    .is('deleted_at', null)
    .order('jump_number', { ascending: true })

  if (jumpsErr) {
    console.error('[pdf] jumps query error', jumpsErr)
    return new Response('DB error', { status: 500 })
  }

  // ── Fetch user profile ────────────────────────────────────────────────────
  const { data: profile } = await supabase
    .from('users')
    .select('full_name, licence_number, licence_rating, home_dropzone_id, dropzones:home_dropzone_id ( name )')
    .eq('id', userId)
    .single()

  // ── Fetch career stats across all jumps ───────────────────────────────────
  const { data: allJumps } = await supabase
    .from('jumps')
    .select('jump_number, freefall_seconds, canopy_seconds')
    .eq('user_id', userId)
    .is('deleted_at', null)

  type StatRow = { jump_number?: number; freefall_seconds?: number; canopy_seconds?: number }
  const totalJumps   = (allJumps as StatRow[] | null)?.reduce((mx: number, j: StatRow) => Math.max(mx, j.jump_number ?? 0), 0) ?? 0
  const totalFF      = (allJumps as StatRow[] | null)?.reduce((s: number,  j: StatRow) => s + (j.freefall_seconds  ?? 0), 0) ?? 0
  const totalCanopy  = (allJumps as StatRow[] | null)?.reduce((s: number,  j: StatRow) => s + (j.canopy_seconds    ?? 0), 0) ?? 0

  // ── Shape data ────────────────────────────────────────────────────────────
  const jumper: JumperProfile = {
    full_name:            profile?.full_name ?? 'Skydiver',
    licence_number:       profile?.licence_number ?? null,
    licence_rating:       profile?.licence_rating ?? null,
    home_dz:              (profile?.dropzones as unknown as { name: string } | null)?.name ?? null,
    total_jumps:          totalJumps,
    total_ff_seconds:     totalFF,
    total_canopy_seconds: totalCanopy,
  }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfJumps: PdfJump[] = ((rawJumps ?? []) as any[]).map((raw: any) => {
    const dz  = raw.dropzones  as unknown as { name: string; region: string } | null
    const sig = (raw.signatures as unknown as Array<{
      signer_name: string
      signer_licence_number: string
      signer_licence_rating: string | null
      signature_data: string | null
      outcome: string | null
      notes: string | null
    }>)?.[0]

    return {
      id:                      raw.id,
      jump_number:             raw.jump_number,
      date:                    raw.date,
      dz_name:                 dz?.name   ?? null,
      dz_region:               dz?.region ?? null,
      aircraft_type:           raw.aircraft_type           ?? null,
      aircraft_rego:           raw.aircraft_rego           ?? null,
      jump_type:               raw.jump_type               ?? null,
      jump_stage:              raw.jump_stage              ?? null,
      canopy_type:             raw.canopy_type             ?? null,
      jumper_type:             raw.jumper_type             ?? null,
      exit_altitude_ft:        raw.exit_altitude_ft        ?? null,
      pull_altitude_ft:        raw.pull_altitude_ft        ?? null,
      freefall_seconds:        raw.freefall_seconds        ?? null,
      canopy_seconds:          raw.canopy_seconds          ?? null,
      landing_accuracy_value:  raw.landing_accuracy_value  ?? null,
      landing_accuracy_unit:   raw.landing_accuracy_unit   ?? null,
      notes:                   raw.notes                   ?? null,
      people_on_jump:          raw.people_on_jump          ?? null,
      signer_name:             sig?.signer_name             ?? null,
      signer_licence_number:   sig?.signer_licence_number  ?? null,
      signer_licence_rating:   sig?.signer_licence_rating  ?? null,
      signer_outcome:          sig?.outcome                ?? null,
      signer_notes:            sig?.notes                  ?? null,
      signer_signature_data:   sig?.signature_data          ?? null,
    }
  })

  // ── Generate verify code + persist ────────────────────────────────────────
  const verifyCode = generateCode()
  await supabase.from('pdf_exports').insert({
    code:     verifyCode,
    user_id:  userId,
    jump_ids: jumpIds,
    layout,
  })

  // ── Render PDF ────────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfDoc: any = layout === 'single'
    ? React.createElement(SingleDocument, { jumps: pdfJumps, jumper })
    : React.createElement(TenDocument,    { jumps: pdfJumps, jumper })

  let pdfStream: NodeJS.ReadableStream
  try {
    pdfStream = await renderToStream(pdfDoc)
  } catch (err) {
    console.error('[pdf] render error', err)
    return new Response('PDF render failed', { status: 500 })
  }

  const chunks: Buffer[] = []
  for await (const chunk of pdfStream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as unknown as Uint8Array))
  }
  const pdfBuffer = Buffer.concat(chunks)

  // ── Return file ───────────────────────────────────────────────────────────
  const slug  = (jumper.full_name).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  const today = new Date().toISOString().split('T')[0]
  const filename = `${slug}-logbook-${today}.pdf`

  return new Response(pdfBuffer, {
    headers: {
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length':      String(pdfBuffer.byteLength),
    },
  })
}
