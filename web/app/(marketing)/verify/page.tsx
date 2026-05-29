import { createAdminClient } from "@/lib/supabase/admin"
import { ShieldCheck, ShieldAlert, User, Plane, ArrowRight } from "lucide-react"
import VerifyForm from "./VerifyForm"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-AU", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  })
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-AU", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
}

function fmtMSS(s: number | null) {
  if (!s) return "—"
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${String(sec).padStart(2, "0")}`
}

function fmtCode(code: string) {
  return `${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8)}`.toUpperCase()
}

// ─── Types ────────────────────────────────────────────────────────────────────

type ChangeEntry = { field: string; from: string | null; to: string | null }
type EditEntry   = { edited_at: string; changes: ChangeEntry[] }

type VerifiedJump = {
  id: string
  jump_number: number
  date: string
  created_at: string
  updated_at: string
  dz_name: string | null
  dz_region: string | null
  aircraft_type: string | null
  aircraft_rego: string | null
  jump_type: string | null
  jump_stage: string | null
  canopy_type: string | null
  jumper_type: string | null
  exit_altitude_ft: number | null
  pull_altitude_ft: number | null
  deploy_altitude_ft: number | null
  freefall_seconds: number | null
  canopy_seconds: number | null
  landing_accuracy_value: string | null
  landing_accuracy_unit: string | null
  notes: string | null
  people_on_jump: number | null
  signer_name: string | null
  signer_licence_number: string | null
  signer_licence_rating: string | null
  signer_outcome: string | null
  signer_notes: string | null
  signer_signed_at: string | null
  edits: EditEntry[]
}

type VerifyResult = {
  code: string
  exported_at: string
  layout: string
  jumper: {
    full_name: string | null
    licence_number: string | null
    licence_rating: string | null
    country: string | null
    home_dz: string | null
  }
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
      edits: (edits ?? []).filter(e => e.jump_id === j.id).map(e => ({ edited_at: e.edited_at, changes: e.changes })),
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

// ─── Spec row ─────────────────────────────────────────────────────────────────

function Spec({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="flex justify-between py-2.5 border-b border-border last:border-0">
      <span className="text-sm text-fg-3">{label}</span>
      <span className="text-sm font-medium text-fg text-right ml-4 max-w-[60%]">{value}</span>
    </div>
  )
}

// ─── Jump card ─────────────────────────────────────────────────────────────────

function JumpCard({ jump }: { jump: VerifiedJump }) {
  const isStudent = jump.jumper_type === "student"
  const acLabel   = [jump.aircraft_type, jump.aircraft_rego].filter(Boolean).join(" · ")
  const dzLabel   = [jump.dz_name, jump.dz_region].filter(Boolean).join(", ")
  const accLabel  = jump.landing_accuracy_value
    ? `${jump.landing_accuracy_value} ${jump.landing_accuracy_unit ?? ""}`.trim()
    : null

  const outcomeColor = jump.signer_outcome === "pass"
    ? "bg-ok/10 text-ok" : jump.signer_outcome === "repeat"
    ? "bg-warn/10 text-warn" : null

  return (
    <div className="border border-border rounded-sm overflow-hidden">
      {/* Card header */}
      <div className="flex items-start justify-between gap-4 bg-surface px-5 py-4 border-b border-border">
        <div className="flex items-center gap-4">
          <div>
            <p className="font-mono text-xs text-fg-4 tracking-widest uppercase mb-0.5">Jump №</p>
            <p className="font-mono text-4xl font-medium text-fg leading-none">{jump.jump_number}</p>
          </div>
          <div>
            {jump.jump_type && (
              <span className="inline-block font-mono text-xs bg-sky/10 text-sky px-2 py-1 rounded-sm tracking-wider uppercase mb-1">
                {jump.jump_type}
              </span>
            )}
            {isStudent && jump.jump_stage && (
              <span className="inline-block font-mono text-xs bg-warn/10 text-warn px-2 py-1 rounded-sm tracking-wider uppercase mb-1 ml-1">
                {jump.jump_stage}
              </span>
            )}
            {jump.signer_outcome && outcomeColor && (
              <span className={`inline-block font-mono text-xs px-2 py-1 rounded-sm tracking-wider uppercase mb-1 ml-1 ${outcomeColor}`}>
                {jump.signer_outcome}
              </span>
            )}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="font-mono text-xs text-fg-4 tracking-widest uppercase mb-0.5">Date</p>
          <p className="font-mono text-sm text-fg">{fmtDate(jump.date)}</p>
        </div>
      </div>

      {/* Telemetry bar */}
      <div className="grid grid-cols-5 divide-x divide-border border-b border-border">
        {[
          ["EXIT",   jump.exit_altitude_ft  ? `${jump.exit_altitude_ft.toLocaleString()} ft` : null],
          ["PULL",   jump.pull_altitude_ft  ? `${jump.pull_altitude_ft.toLocaleString()} ft` : null],
          ["FF",     jump.freefall_seconds  ? `${jump.freefall_seconds}s` : null],
          ["CANOPY", fmtMSS(jump.canopy_seconds)],
          ["ACC",    accLabel],
        ].map(([label, val]) => (
          <div key={label as string} className="py-2.5 px-3 text-center">
            <p className="font-mono text-[10px] text-fg-4 tracking-widest mb-0.5">{label}</p>
            <p className="font-mono text-sm font-medium text-fg">{val ?? "—"}</p>
          </div>
        ))}
      </div>

      {/* Details grid */}
      <div className="px-5 py-1">
        <Spec label="Dropzone"          value={dzLabel || null} />
        <Spec label="Aircraft"          value={acLabel || null} />
        <Spec label="Canopy type"       value={jump.canopy_type} />
        <Spec label="Jumper category"   value={isStudent ? "Student" : "Licensed"} />
        <Spec label="People on jump"    value={jump.people_on_jump != null ? String(jump.people_on_jump) : null} />
        <Spec label="Logged"            value={fmtDateTime(jump.created_at)} />
        <Spec label="Last updated"      value={fmtDateTime(jump.updated_at)} />
      </div>

      {/* Notes */}
      {jump.notes && (
        <div className="mx-5 mb-4 mt-1 p-3 bg-surface2 rounded-sm border border-border">
          <p className="font-mono text-[10px] text-fg-4 tracking-widest uppercase mb-1.5">Notes</p>
          <p className="text-sm text-fg-2 leading-relaxed">{jump.notes}</p>
        </div>
      )}

      {/* Instructor notes (student) */}
      {isStudent && jump.signer_notes && (
        <div className="mx-5 mb-4 mt-1 p-3 bg-surface2 rounded-sm border border-border">
          <p className="font-mono text-[10px] text-fg-4 tracking-widest uppercase mb-1.5">Instructor notes</p>
          <p className="text-sm text-fg-2 leading-relaxed">{jump.signer_notes}</p>
        </div>
      )}

      {/* Signature block */}
      {jump.signer_name && (
        <div className="mx-5 mb-4 mt-1 p-3 bg-surface rounded-sm border border-border">
          <p className="font-mono text-[10px] text-fg-4 tracking-widest uppercase mb-2">Signed by</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-fg">{jump.signer_name}</p>
              <p className="font-mono text-xs text-fg-3 mt-0.5">
                {[jump.signer_licence_number, jump.signer_licence_rating].filter(Boolean).join(" · ")}
              </p>
            </div>
            {jump.signer_signed_at && (
              <p className="font-mono text-xs text-fg-4">{fmtDateTime(jump.signer_signed_at)}</p>
            )}
          </div>
        </div>
      )}

      {/* Edit history */}
      {jump.edits.length > 0 && (
        <div className="mx-5 mb-4 mt-1">
          <p className="font-mono text-[10px] text-fg-4 tracking-widest uppercase mb-2">Edit history ({jump.edits.length})</p>
          <div className="border border-border rounded-sm overflow-hidden">
            {jump.edits.map((edit, ei) => (
              <div key={ei} className="px-4 py-3 border-b border-border last:border-0">
                <p className="font-mono text-[10px] text-fg-4 tracking-wider mb-2">{fmtDateTime(edit.edited_at)}</p>
                {(edit.changes as ChangeEntry[]).map((ch, ci) => (
                  <div key={ci} className="flex items-center gap-2 text-xs mb-1 last:mb-0">
                    <span className="font-medium text-fg-2 w-32 flex-shrink-0">{ch.field}</span>
                    <span className="font-mono text-danger line-through opacity-70">{ch.from ?? "—"}</span>
                    <ArrowRight className="w-3 h-3 text-fg-4 flex-shrink-0" />
                    <span className="font-mono text-ok">{ch.to ?? "—"}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
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

      {/* Results */}
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

      {result && (
        <section className="py-12 px-5">
          <div className="max-w-3xl mx-auto space-y-8">

            {/* Verification badge */}
            <div className="flex items-start gap-4 p-5 bg-ok/5 border border-ok/20 rounded-sm">
              <ShieldCheck className="w-6 h-6 text-ok flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-fg text-lg">Verified authentic record</p>
                <p className="text-sm text-fg-3 mt-1">
                  This PDF export was generated on <strong className="text-fg">{fmtDateTime(result.exported_at)}</strong> and
                  contains {result.jumps.length} jump{result.jumps.length !== 1 ? "s" : ""}.
                </p>
                <p className="font-mono text-xs text-fg-4 tracking-widest mt-2 uppercase">
                  Code · {fmtCode(result.code)}
                </p>
              </div>
            </div>

            {/* Jumper profile */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <User className="w-4 h-4 text-fg-3" />
                <h2 className="text-overline font-semibold tracking-widest uppercase text-fg-4 text-xs">Jumper</h2>
              </div>
              <div className="border border-border rounded-sm bg-surface px-5 py-1">
                <Spec label="Name"             value={result.jumper.full_name} />
                <Spec label="Licence number"   value={result.jumper.licence_number} />
                <Spec label="Licence rating"   value={result.jumper.licence_rating} />
                <Spec label="Home dropzone"    value={result.jumper.home_dz} />
                <Spec label="Country"          value={result.jumper.country} />
              </div>
            </div>

            {/* Jumps */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Plane className="w-4 h-4 text-fg-3" />
                <h2 className="text-overline font-semibold tracking-widest uppercase text-fg-4 text-xs">
                  {result.jumps.length === 1 ? "Jump record" : `Jump records (${result.jumps.length})`}
                </h2>
              </div>
              <div className="space-y-4">
                {result.jumps.map(jump => (
                  <JumpCard key={jump.id} jump={jump} />
                ))}
              </div>
            </div>

          </div>
        </section>
      )}

      {/* How it works — shown when no code entered */}
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
