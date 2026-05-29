import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  let code: string
  try {
    const body = await request.json()
    code = (body.code ?? '').trim().toLowerCase().replace(/[^a-f0-9]/g, '')
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  if (!code || code.length < 8) {
    return NextResponse.json({ error: 'Invalid code' }, { status: 400 })
  }

  const db = createAdminClient()

  // Look up the export record
  const { data: exportRow, error: exportErr } = await db
    .from('pdf_exports')
    .select('code, user_id, jump_ids, layout, created_at')
    .eq('code', code)
    .maybeSingle()

  if (exportErr || !exportRow) {
    return NextResponse.json({ error: 'No jump found for this code' }, { status: 404 })
  }

  const jumpIds: string[] = exportRow.jump_ids ?? []
  if (jumpIds.length === 0) {
    return NextResponse.json({ error: 'Export record has no jumps' }, { status: 404 })
  }

  // Fetch full jump data (admin bypasses RLS)
  const { data: rawJumps, error: jumpsErr } = await db
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
      deploy_altitude_ft,
      freefall_seconds,
      canopy_seconds,
      landing_accuracy_value,
      landing_accuracy_unit,
      notes,
      people_on_jump,
      created_at,
      updated_at,
      dropzones ( name, region ),
      signatures (
        signer_name, signer_licence_number, signer_licence_rating,
        outcome, notes, signed_at
      )
    `)
    .in('id', jumpIds)
    .is('deleted_at', null)
    .order('jump_number', { ascending: true })

  if (jumpsErr || !rawJumps) {
    return NextResponse.json({ error: 'Failed to load jump data' }, { status: 500 })
  }

  // Fetch edit history for all jumps
  const { data: edits } = await db
    .from('jump_edits')
    .select('jump_id, edited_at, changes')
    .in('jump_id', jumpIds)
    .order('edited_at', { ascending: false })

  // Fetch jumper profile
  const { data: profile } = await db
    .from('users')
    .select('full_name, licence_number, licence_rating, country, dropzones:home_dropzone_id ( name )')
    .eq('id', exportRow.user_id)
    .single()

  // Shape response
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const jumps = (rawJumps as any[]).map((j: any) => {
    const dz  = j.dropzones as { name: string; region: string } | null
    const sig = (j.signatures as Array<{
      signer_name: string; signer_licence_number: string; signer_licence_rating: string | null
      outcome: string | null; notes: string | null; signed_at: string
    }>)?.[0] ?? null

    const jumpEdits = (edits ?? [])
      .filter(e => e.jump_id === j.id)
      .map(e => ({ edited_at: e.edited_at, changes: e.changes }))

    return {
      id:                    j.id,
      jump_number:           j.jump_number,
      date:                  j.date,
      created_at:            j.created_at,
      updated_at:            j.updated_at,
      dz_name:               dz?.name ?? null,
      dz_region:             dz?.region ?? null,
      aircraft_type:         j.aircraft_type ?? null,
      aircraft_rego:         j.aircraft_rego ?? null,
      jump_type:             j.jump_type ?? null,
      jump_stage:            j.jump_stage ?? null,
      canopy_type:           j.canopy_type ?? null,
      jumper_type:           j.jumper_type ?? null,
      exit_altitude_ft:      j.exit_altitude_ft ?? null,
      pull_altitude_ft:      j.pull_altitude_ft ?? null,
      deploy_altitude_ft:    j.deploy_altitude_ft ?? null,
      freefall_seconds:      j.freefall_seconds ?? null,
      canopy_seconds:        j.canopy_seconds ?? null,
      landing_accuracy_value: j.landing_accuracy_value ?? null,
      landing_accuracy_unit:  j.landing_accuracy_unit ?? null,
      notes:                 j.notes ?? null,
      people_on_jump:        j.people_on_jump ?? null,
      signer_name:           sig?.signer_name ?? null,
      signer_licence_number: sig?.signer_licence_number ?? null,
      signer_licence_rating: sig?.signer_licence_rating ?? null,
      signer_outcome:        sig?.outcome ?? null,
      signer_notes:          sig?.notes ?? null,
      signer_signed_at:      sig?.signed_at ?? null,
      edits:                 jumpEdits,
    }
  })

  return NextResponse.json({
    code: exportRow.code,
    exported_at: exportRow.created_at,
    layout: exportRow.layout,
    jumper: {
      full_name:      profile?.full_name ?? null,
      licence_number: profile?.licence_number ?? null,
      licence_rating: profile?.licence_rating ?? null,
      country:        profile?.country ?? null,
      home_dz:        (profile?.dropzones as unknown as { name: string } | null)?.name ?? null,
    },
    jumps,
  })
}
