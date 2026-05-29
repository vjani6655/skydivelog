import { createAdminClient } from "@/lib/supabase/admin"
import { ShieldCheck, ShieldAlert } from "lucide-react"
import VerifyForm from "./VerifyForm"
import VerifyResults, { type VerifiedJump, type VerifyJumper } from "./VerifyResults"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtCode(code: string) {
  return `${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8)}`.toUpperCase()
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-AU", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
}

// ─── Types ────────────────────────────────────────────────────────────────────

type VerifyResult = {
  code: string
  exported_at: string
  layout: string
  jumper: VerifyJumper
  jumps: VerifiedJump[]
}

// ─── Data fetch (server-side) ─────────────────────────────────────────────────

async function fetchVerify(code: string): Promise<VerifyResult | null> {
  const db = createAdminClient()

  const { data: exportRow } = await db
    .from("pdf_exports")
    .select("code, user_id, jump_ids, layout, created_at")
    .eq("code", code)
    .maybeSingle()

  if (!exportRow) return null

  const jumpIds: string[] = exportRow.jump_ids ?? []
  if (!jumpIds.length) return null

  const [{ data: rawJumps }, { data: edits }, { data: profile }] = await Promise.all([
    db.from("jumps").select(`
      id, jump_number, date, created_at, updated_at,
      aircraft_type, aircraft_rego, jump_type, jump_stage, canopy_type, jumper_type,
      exit_altitude_ft, pull_altitude_ft, deploy_altitude_ft,
      freefall_seconds, canopy_seconds,
      landing_accuracy_value, landing_accuracy_unit,
      notes, people_on_jump,
      dropzones ( name, region ),
      signatures ( signer_name, signer_licence_number, signer_licence_rating, outcome, notes, signed_at )
    `)
      .in("id", jumpIds)
      .is("deleted_at", null)
      .order("jump_number", { ascending: true }),
    db.from("jump_edits")
      .select("jump_id, edited_at, changes")
      .in("jump_id", jumpIds)
      .order("edited_at", { ascending: false }),
    db.from("users")
      .select("full_name, licence_number, licence_rating, country, dropzones:home_dropzone_id ( name )")
      .eq("id", exportRow.user_id)
      .single(),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const jumps: VerifiedJump[] = ((rawJumps ?? []) as any[]).map((j: any) => {
    const dz  = j.dropzones as { name: string; region: string } | null
    const sig = (j.signatures as Array<{
      signer_name: string; signer_licence_number: string; signer_licence_rating: string | null
      outcome: string | null; notes: string | null; signed_at: string
    }>)?.[0] ?? null
    return {
      id: j.id, jump_number: j.jump_number, date: j.date,
      created_at: j.created_at, updated_at: j.updated_at,
      dz_name: dz?.name ?? null, dz_region: dz?.region ?? null,
      aircraft_type: j.aircraft_type ?? null, aircraft_rego: j.aircraft_rego ?? null,
      jump_type: j.jump_type ?? null, jump_stage: j.jump_stage ?? null,
      canopy_type: j.canopy_type ?? null, jumper_type: j.jumper_type ?? null,
      exit_altitude_ft: j.exit_altitude_ft ?? null, pull_altitude_ft: j.pull_altitude_ft ?? null,
      deploy_altitude_ft: j.deploy_altitude_ft ?? null,
      freefall_seconds: j.freefall_seconds ?? null, canopy_seconds: j.canopy_seconds ?? null,
      landing_accuracy_value: j.landing_accuracy_value ?? null, landing_accuracy_unit: j.landing_accuracy_unit ?? null,
      notes: j.notes ?? null, people_on_jump: j.people_on_jump ?? null,
      signer_name: sig?.signer_name ?? null, signer_licence_number: sig?.signer_licence_number ?? null,
      signer_licence_rating: sig?.signer_licence_rating ?? null, signer_outcome: sig?.outcome ?? null,
      signer_notes: sig?.notes ?? null, signer_signed_at: sig?.signed_at ?? null,
      edits: (edits ?? [])
        .filter(e => e.jump_id === j.id)
        .map(e => ({ edited_at: e.edited_at, changes: Array.isArray(e.changes) ? e.changes : [] })),
    }
  })

  return {
    code: exportRow.code,
    exported_at: exportRow.created_at,
    layout: exportRow.layout,
    jumper: {
      full_name: profile?.full_name ?? null,
      licence_number: profile?.licence_number ?? null,
      licence_rating: profile?.licence_rating ?? null,
      country: profile?.country ?? null,
      home_dz: (profile?.dropzones as unknown as { name: string } | null)?.name ?? null,
    },
    jumps,
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>
}) {
  const { code: rawCode } = await searchParams
  const code = rawCode?.trim().toLowerCase().replace(/[^a-f0-9]/g, "") ?? ""

  let result: VerifyResult | null = null
  let lookupError: string | null = null

  if (code.length >= 8) {
    result = await fetchVerify(code).catch(() => null)
    if (!result) lookupError = "No jump found for this code. Please check and try again."
  }

  return (
    <>
      {/* Hero */}
      <section className="py-20 px-5 border-b border-border">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-ok/10 text-ok font-mono text-xs tracking-widest uppercase px-3 py-1.5 rounded-sm mb-6">
            <ShieldCheck className="w-3.5 h-3.5" />
            Jump Verification
          </div>
          <h1 className="text-5xl font-bold text-fg tracking-tight mb-4">
            Verify a jump.
          </h1>
          <p className="text-lg text-fg-3 mb-10 max-w-xl mx-auto">
            Enter the verification code printed on a Jump Logs PDF export to view the full, unedited record of any logged jump.
          </p>
          <div className="flex justify-center">
            <VerifyForm initialCode={rawCode} />
          </div>
          <p className="text-xs text-fg-4 mt-4">
            The code is printed in the footer of every Jump Logs PDF export.
          </p>
        </div>
      </section>

      {/* Error */}
      {lookupError && (
        <section className="py-12 px-5">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-3 p-5 bg-danger/5 border border-danger/20 rounded-sm">
              <ShieldAlert className="w-5 h-5 text-danger flex-shrink-0" />
              <div>
                <p className="font-semibold text-fg">Verification failed</p>
                <p className="text-sm text-fg-3 mt-0.5">{lookupError}</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Results */}
      {result && (
        <section className="py-12 px-5">
          <div className="max-w-3xl mx-auto space-y-8">

            {/* Verification badge */}
            <div className="flex items-start gap-4 p-5 bg-ok/5 border border-ok/20 rounded-sm">
              <ShieldCheck className="w-6 h-6 text-ok flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-fg text-lg">Verified authentic record</p>
                <p className="text-sm text-fg-3 mt-1">
                  This PDF export was generated on{" "}
                  <strong className="text-fg">{fmtDateTime(result.exported_at)}</strong> and contains{" "}
                  {result.jumps.length} jump{result.jumps.length !== 1 ? "s" : ""}.
                </p>
                <p className="font-mono text-xs text-fg-4 tracking-widest mt-2 uppercase">
                  Code · {fmtCode(result.code)}
                </p>
              </div>
            </div>

            {/* Jumper + jump cards (client component handles search) */}
            <VerifyResults jumper={result.jumper} jumps={result.jumps} />

          </div>
        </section>
      )}

      {/* How it works */}
      {!code && !result && (
        <section className="py-16 px-5">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-xl font-bold text-fg mb-8 text-center">How verification works</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  step: "01",
                  title: "Export your logbook",
                  desc: "Export any jump or group of jumps as a PDF from Jump Logs. A unique verification code is automatically assigned.",
                },
                {
                  step: "02",
                  title: "Share the PDF",
                  desc: "Give the PDF to an instructor, competition organiser, or dropzone. The code is printed in the footer.",
                },
                {
                  step: "03",
                  title: "They verify here",
                  desc: "Anyone can enter the code above to see the full, live record — including all edits ever made to the jump.",
                },
              ].map(({ step, title, desc }) => (
                <div key={step} className="p-5 border border-border rounded-sm bg-surface">
                  <p className="font-mono text-xs text-fg-4 tracking-widest mb-3">{step}</p>
                  <h3 className="font-semibold text-fg mb-2">{title}</h3>
                  <p className="text-sm text-fg-3 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  )
}
