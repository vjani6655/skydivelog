import { SingleDocument } from '@/lib/pdf/single'
import { TenDocument }    from '@/lib/pdf/ten'
import type { JumperProfile, PdfJump } from '@/lib/pdf/types'
import { renderToStream } from '@react-pdf/renderer'
import crypto from 'crypto'
import React  from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'

async function renderPdf(doc: React.ReactElement): Promise<Buffer> {
  const stream = await renderToStream(doc)
  const chunks: Buffer[] = []
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as unknown as Uint8Array))
  }
  return Buffer.concat(chunks)
}

export interface UserExports {
  singlePdf:  Buffer
  tenPdf:     Buffer
  csvBuffer:  Buffer
  userName:   string
  slug:       string
  jumpCount:  number
}

export async function generateUserExports(
  userId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
): Promise<UserExports> {
  // Fetch profile + all jumps in parallel
  const [{ data: profile }, { data: rawJumps, error: jumpsErr }] = await Promise.all([
    supabase
      .from('users')
      .select('full_name, licence_number, licence_rating, dropzones:home_dropzone_id ( name )')
      .eq('id', userId)
      .single(),
    supabase
      .from('jumps')
      .select(`
        id, jump_number, date,
        aircraft_type, aircraft_rego, jump_type, jump_stage, canopy_type, jumper_type,
        exit_altitude_ft, pull_altitude_ft, deploy_altitude_ft,
        freefall_seconds, canopy_seconds,
        landing_accuracy_value, landing_accuracy_unit,
        coordinates_lat, coordinates_lng,
        notes, people_on_jump, aad_fired, reserve_deployed,
        planned_objectives, planned_manoeuvres,
        dropzones ( name, region ),
        signatures ( signer_name, signer_licence_number, signer_licence_rating, signature_data, outcome, notes )
      `)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('jump_number', { ascending: true }),
  ])

  if (jumpsErr) throw new Error('Failed to fetch jumps: ' + jumpsErr.message)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (rawJumps ?? []) as any[]

  type StatRow = { jump_number?: number; freefall_seconds?: number; canopy_seconds?: number }
  const totalJumps  = rows.reduce((mx: number, j: StatRow) => Math.max(mx, j.jump_number ?? 0), 0)
  const totalFF     = rows.reduce((s: number,  j: StatRow) => s + (j.freefall_seconds  ?? 0), 0)
  const totalCanopy = rows.reduce((s: number,  j: StatRow) => s + (j.canopy_seconds    ?? 0), 0)

  const userName = profile?.full_name ?? 'Skydiver'
  const slug = userName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

  const jumper: JumperProfile = {
    full_name:            userName,
    licence_number:       profile?.licence_number   ?? null,
    licence_rating:       profile?.licence_rating   ?? null,
    home_dz:              (profile?.dropzones as unknown as { name: string } | null)?.name ?? null,
    total_jumps:          totalJumps,
    total_ff_seconds:     totalFF,
    total_canopy_seconds: totalCanopy,
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfJumps: PdfJump[] = rows.map((raw: any) => {
    const dz  = raw.dropzones  as unknown as { name: string; region: string } | null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sig = (raw.signatures as unknown as any[])?.[0]
    return {
      id: raw.id, jump_number: raw.jump_number, date: raw.date,
      dz_name: dz?.name ?? null, dz_region: dz?.region ?? null,
      aircraft_type: raw.aircraft_type ?? null, aircraft_rego: raw.aircraft_rego ?? null,
      jump_type: raw.jump_type ?? null, jump_stage: raw.jump_stage ?? null,
      canopy_type: raw.canopy_type ?? null, jumper_type: raw.jumper_type ?? null,
      exit_altitude_ft: raw.exit_altitude_ft ?? null, pull_altitude_ft: raw.pull_altitude_ft ?? null,
      freefall_seconds: raw.freefall_seconds ?? null, canopy_seconds: raw.canopy_seconds ?? null,
      landing_accuracy_value: raw.landing_accuracy_value ?? null,
      landing_accuracy_unit:  raw.landing_accuracy_unit  ?? null,
      notes: raw.notes ?? null, people_on_jump: raw.people_on_jump ?? null,
      aad_fired: raw.aad_fired ?? false, reserve_deployed: raw.reserve_deployed ?? false,
      planned_objectives: raw.planned_objectives ?? null, planned_manoeuvres: raw.planned_manoeuvres ?? null,
      signer_name:             sig?.signer_name             ?? null,
      signer_licence_number:   sig?.signer_licence_number   ?? null,
      signer_licence_rating:   sig?.signer_licence_rating   ?? null,
      signer_outcome:          sig?.outcome                 ?? null,
      signer_notes:            sig?.notes                   ?? null,
      signer_signature_data:   sig?.signature_data          ?? null,
    }
  })

  const jumpIds = pdfJumps.map(j => j.id)
  const [codeSingle, codeTen] = [crypto.randomBytes(5).toString('hex'), crypto.randomBytes(5).toString('hex')]

  // Record export in pdf_exports (best-effort, don't block on failure)
  if (jumpIds.length > 0) {
    await Promise.allSettled([
      supabase.from('pdf_exports').insert({ code: codeSingle, user_id: userId, jump_ids: jumpIds, layout: 'single' }),
      supabase.from('pdf_exports').insert({ code: codeTen,    user_id: userId, jump_ids: jumpIds, layout: 'ten' }),
    ])
  }

  // Generate both PDFs in parallel
  const [singlePdf, tenPdf] = await Promise.all([
    renderPdf(React.createElement(SingleDocument, { jumps: pdfJumps, jumper, verifyCode: codeSingle })),
    renderPdf(React.createElement(TenDocument,    { jumps: pdfJumps, jumper, verifyCode: codeTen })),
  ])

  // Generate CSV
  const COLS = [
    'jump_number', 'date', 'dz_name', 'dz_region',
    'aircraft_type', 'aircraft_rego', 'jump_type', 'jumper_type',
    'exit_altitude_ft', 'pull_altitude_ft', 'deploy_altitude_ft',
    'freefall_seconds', 'canopy_seconds',
    'landing_accuracy_value', 'landing_accuracy_unit',
    'coordinates_lat', 'coordinates_lng', 'notes',
  ] as const

  const HEADERS: Record<typeof COLS[number], string> = {
    jump_number: 'Jump #', date: 'Date', dz_name: 'Dropzone', dz_region: 'Region',
    aircraft_type: 'Aircraft Type', aircraft_rego: 'Aircraft Rego',
    jump_type: 'Jump Type', jumper_type: 'Jumper Category',
    exit_altitude_ft: 'Exit Altitude (ft)', pull_altitude_ft: 'Pull Altitude (ft)',
    deploy_altitude_ft: 'Deploy Altitude (ft)',
    freefall_seconds: 'Freefall (s)', canopy_seconds: 'Canopy (s)',
    landing_accuracy_value: 'Landing Accuracy', landing_accuracy_unit: 'Accuracy Unit',
    coordinates_lat: 'Latitude', coordinates_lng: 'Longitude', notes: 'Notes',
  }

  const escape = (v: unknown): string => {
    if (v === null || v === undefined) return ''
    const s = String(v)
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"` : s
  }

  const headerRow = COLS.map(c => HEADERS[c]).join(',')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dataRows = rows.map((r: any) => {
    const dz = r.dropzones as unknown as { name: string; region: string } | null
    return COLS.map(c => {
      if (c === 'dz_name')   return escape(dz?.name   ?? null)
      if (c === 'dz_region') return escape(dz?.region ?? null)
      return escape(r[c])
    }).join(',')
  })
  const csv = '﻿' + [headerRow, ...dataRows].join('\n')

  return {
    singlePdf,
    tenPdf,
    csvBuffer: Buffer.from(csv, 'utf-8'),
    userName,
    slug,
    jumpCount: rows.length,
  }
}
