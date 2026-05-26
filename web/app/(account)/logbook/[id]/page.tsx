export const dynamic = "force-dynamic"

import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Check, Star, MapPin, AlertTriangle } from "lucide-react"
import { fmtDate } from "@/lib/display"
import FavouriteButton from "@/components/FavouriteButton"
import ExportJumpPdfButton from "@/components/ExportJumpPdfButton"
import JumpDateDisplay, { LocalTime } from "@/components/JumpDateDisplay"

// ─── Local helpers ────────────────────────────────────────────────────────────

function fmtTime(s: number | null) {
  if (!s) return "—"
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, "0")}`
}

function fmtAltNum(ft: number | null, unit: string): string {
  if (ft == null) return "—"
  if (unit === "m") return Math.round(ft * 0.3048).toLocaleString()
  return ft.toLocaleString()
}

function fmtCoords(lat: number | null, lng: number | null): string {
  if (!lat || !lng) return "—"
  const latStr = `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? "N" : "S"}`
  const lngStr = `${Math.abs(lng).toFixed(4)}° ${lng >= 0 ? "E" : "W"}`
  return `${latStr}, ${lngStr}`
}

function fmtSignerShort(name: string): string {
  const parts = name.trim().split(' ')
  if (parts.length < 2) return name.toUpperCase()
  return `${parts[0][0]}. ${parts.slice(1).join(' ')}`.toUpperCase()
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TelCell({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="px-5 py-4 flex-1">
      <p className="text-overline font-mono uppercase tracking-wider text-fg-3 mb-2">{label}</p>
      <div className="flex items-baseline gap-1.5">
        <span className="text-num font-mono font-medium text-fg">{value}</span>
        {unit && <span className="text-overline font-mono text-fg-3 uppercase">{unit}</span>}
      </div>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-overline font-mono uppercase tracking-wider text-fg-3 mb-1">{label}</p>
      <div className="text-base font-sans text-fg leading-snug">{children}</div>
    </div>
  )
}

function Badge({
  children,
  kind = "sky",
  icon,
}: {
  children: React.ReactNode
  kind?: "sky" | "ok" | "warn" | "danger" | "muted" | "amber"
  icon?: "check"
}) {
  const cls = {
    sky:    "bg-sky-bg text-sky",
    ok:     "bg-ok-bg text-ok",
    warn:   "bg-warn-bg text-warn",
    danger: "bg-danger-bg text-danger",
    muted:  "bg-surface-2 text-fg-2",
    amber:  "bg-amber-500/10 text-amber-400",
  }[kind]
  return (
    <span className={`inline-flex items-center gap-1 px-2 rounded-[5px] text-overline h-[22px] font-mono font-medium tracking-wide uppercase whitespace-nowrap ${cls}`}>
      {icon === "check" && <Check className="w-2.5 h-2.5" />}
      {children}
    </span>
  )
}

function TagPill({ name, color }: { name: string; color: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border"
      style={{
        backgroundColor: `${color}20`,
        borderColor: `${color}50`,
        color: color,
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
      {name}
    </span>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface Props {
  params: { id: string }
}

export default async function JumpDetailPage({ params }: Props) {
  const { id } = params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const cookieStore = await cookies()
  const dateFormat = cookieStore.get("pref_date_format")?.value ?? "DD MMM YYYY"
  const altUnit    = cookieStore.get("pref_altitude_unit")?.value ?? "ft"

  // ── Fetch jump with all related data ───────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: raw } = await (supabase as any)
    .from("jumps")
    .select(`
      id, jump_number, date,
      jump_type, jump_stage, jumper_type,
      aircraft_type, aircraft_rego,
      exit_altitude_ft, pull_altitude_ft, deploy_altitude_ft,
      freefall_seconds, canopy_seconds, canopy_type,
      landing_accuracy_value, landing_accuracy_unit,
      coordinates_lat, coordinates_lng,
      notes, photo_url,
      is_favourite, is_draft,
      created_at, updated_at,
      dropzone:dropzones(id, name, region),
      signatures(id, signer_name, signer_licence_number, signer_licence_rating, outcome, notes, signed_at, signature_data),
      jump_tags(tags(id, name, color))
    `)
    .eq("id", id)
    .eq("user_id", user!.id)
    .is("deleted_at", null)
    .single()

  if (!raw) notFound()

  // ── Fetch edit history (graceful if table absent) ─────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: editsRaw } = await (supabase as any)
    .from("jump_edits")
    .select("id, edited_at, changes")
    .eq("jump_id", id)
    .order("edited_at", { ascending: true })
  const edits: Array<{ id: string; edited_at: string; changes: Array<{ field: string; from: string; to: string }> }> =
    editsRaw ?? []

  // ── Fetch adjacent jumps ───────────────────────────────────────────────────
  const [{ data: prevJump }, { data: nextJump }] = await Promise.all([
    supabase
      .from("jumps")
      .select("id, jump_number, jump_type")
      .eq("user_id", user!.id)
      .is("deleted_at", null)
      .lt("jump_number", raw.jump_number)
      .order("jump_number", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("jumps")
      .select("id, jump_number, jump_type")
      .eq("user_id", user!.id)
      .is("deleted_at", null)
      .gt("jump_number", raw.jump_number)
      .order("jump_number", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ])

  // ── Shape data ─────────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tags: Array<{ id: string; name: string; color: string }> = ((raw.jump_tags ?? []) as any[])
    .map((jt: { tags: { id: string; name: string; color: string } | null }) => jt.tags)
    .filter(Boolean)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sig: {
    id: string; signer_name: string; signer_licence_number: string
    signer_licence_rating: string | null; outcome: string | null
    notes: string | null; signed_at: string; signature_data: string
  } | null = (raw.signatures as unknown[])?.length > 0
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? (raw.signatures as any[])[0]
    : null

  const dz = raw.dropzone as { id: string; name: string; region: string | null } | null

  const isSigned   = !!sig
  const isStudent  = raw.jumper_type === "student"
  const isDraft    = !!raw.is_draft
  const isFav      = !!raw.is_favourite

  const aircraft = [raw.aircraft_type, raw.aircraft_rego].filter(Boolean).join(" · ") || null
  const dzLabel  = dz ? [dz.name, dz.region].filter(Boolean).join(", ") : null
  const sourceId = (() => {
    const d = new Date(raw.date)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `JMP-${y}-${m}-${day}-S${String(raw.jump_number).padStart(3, '0')}`
  })()

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-[1400px] mx-auto">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="mb-6">

        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 mb-3">
          <Link href="/logbook" className="text-[10px] font-semibold tracking-widest uppercase text-fg-4 hover:text-fg-2 transition-colors">
            Logbook
          </Link>
          <span className="text-fg-4 text-xs">/</span>
          <span className="text-[10px] font-semibold tracking-widest uppercase text-fg-4">
            Jump #{raw.jump_number}
          </span>
        </div>

        {/* Title + badges */}
        <div className="flex items-start gap-4 flex-wrap justify-between">
          <div className="flex items-baseline gap-3 flex-wrap">
            <h1 className="text-[2rem] font-bold text-fg tracking-tight leading-none">
              #{raw.jump_number}
            </h1>
            {(raw.jump_type || dz?.name) && (
              <span className="text-xl font-medium text-fg-2">
                {[raw.jump_type, raw.jump_stage ? raw.jump_stage : null, dz?.name]
                  .filter(Boolean).join(" · ")}
              </span>
            )}
            {isFav && <Star className="w-5 h-5 text-amber-400 fill-amber-400 flex-shrink-0" />}
          </div>

          {/* Status badges */}
          <div className="flex items-center gap-2 flex-wrap">
            {isStudent && <Badge kind="warn">STUDENT</Badge>}
            {isDraft && <Badge kind="warn">DRAFT</Badge>}
            {isSigned && <Badge kind="ok" icon="check">SIGNED</Badge>}
            {sig?.outcome === "pass"   && <Badge kind="ok" icon="check">PASS</Badge>}
            {sig?.outcome === "repeat" && <Badge kind="warn">REPEAT</Badge>}
            {!isSigned && !isDraft && <Badge kind="danger">UNSIGNED</Badge>}
          </div>
        </div>

        {/* Date subtitle */}
        <p className="text-sm font-mono text-fg-3 mt-1.5">
          <JumpDateDisplay iso={raw.date} />
        </p>

        {/* Action bar */}
        <div className="flex items-center gap-2 mt-4 flex-wrap">
          {/* Prev / Next */}
          <div className="flex items-center gap-1 border border-border rounded-sm overflow-hidden text-sm">
            {prevJump ? (
              <Link
                href={`/logbook/${prevJump.id}`}
                className="inline-flex items-center gap-1 px-3 py-2 text-fg-2 hover:bg-surface-2 hover:text-fg transition-colors border-r border-border"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Prev #{prevJump.jump_number}
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1 px-3 py-2 text-fg-4 border-r border-border opacity-40 cursor-not-allowed">
                <ChevronLeft className="w-3.5 h-3.5" />Prev
              </span>
            )}
            {nextJump ? (
              <Link
                href={`/logbook/${nextJump.id}`}
                className="inline-flex items-center gap-1 px-3 py-2 text-fg-2 hover:bg-surface-2 hover:text-fg transition-colors"
              >
                Next #{nextJump.jump_number}
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1 px-3 py-2 text-fg-4 opacity-40 cursor-not-allowed">
                Next<ChevronRight className="w-3.5 h-3.5" />
              </span>
            )}
          </div>

          <div className="flex-1" />

          <ExportJumpPdfButton jumpId={raw.id} jumpNumber={raw.jump_number} />
          <FavouriteButton jumpId={raw.id} isFavourite={isFav} />
        </div>
      </div>

      {/* ── Main 2-col grid ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">

        {/* ── MAIN: Telemetry + Flight Details + Notes ─────────────────────── */}
        <div className="space-y-4">

          {/* Telemetry card */}
          <div className="bg-surface border border-border rounded-md overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <p className="text-overline font-mono uppercase tracking-wider text-fg-3">
                Jump Telemetry
              </p>
              {isSigned && (
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-ok" />
                  <p className="text-overline font-mono tracking-wider text-ok uppercase">
                    Log Verified
                  </p>
                </div>
              )}
            </div>
            <div className="divide-y divide-border">
              <div className="grid grid-cols-3 divide-x divide-border">
                <TelCell label="Exit Altitude" value={fmtAltNum(raw.exit_altitude_ft, altUnit)} unit={altUnit} />
                <TelCell label="Pull Altitude" value={fmtAltNum(raw.pull_altitude_ft, altUnit)} unit={altUnit} />
                <TelCell label="Freefall"      value={fmtTime(raw.freefall_seconds)} unit="min:s" />
              </div>
              <div className="grid grid-cols-3 divide-x divide-border">
                <TelCell label="Canopy" value={fmtTime(raw.canopy_seconds)} unit="min:s" />
                {raw.landing_accuracy_value
                  ? <TelCell label="Landing Accuracy" value={`${raw.landing_accuracy_value}${raw.landing_accuracy_unit ? ' ' + raw.landing_accuracy_unit : ''}`} />
                  : <div className="px-4 py-4" />}
                <div className="px-4 py-4" />
              </div>
            </div>
          </div>

          {/* Flight Details card */}
          <div className="bg-surface border border-border rounded-md overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <p className="text-overline font-mono uppercase tracking-wider text-fg-3">Flight Details</p>
            </div>
            <div className="p-5 space-y-5">
              <Row label="Date &amp; Time">
                <span className="font-mono"><JumpDateDisplay iso={raw.date} /></span>
              </Row>
              {raw.jump_type && (
                <div>
                  <p className="text-overline font-mono uppercase tracking-wider text-fg-3 mb-1.5">Jump Type</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge kind="sky">{raw.jump_type}</Badge>
                    {raw.jump_stage && <Badge kind="muted">{raw.jump_stage}</Badge>}
                    {isStudent && <Badge kind="warn">Student</Badge>}
                  </div>
                </div>
              )}
              {dzLabel && <Row label="Dropzone">{dzLabel}</Row>}
              {aircraft && <Row label="Aircraft">{aircraft}</Row>}
              {(raw as any).canopy_type && (
                <Row label="Canopy Type">{(raw as any).canopy_type}</Row>
              )}
              {isSigned && (raw.signatures as any[]).length > 0 && (
                <div>
                  <p className="text-overline font-mono uppercase tracking-wider text-fg-3 mb-1.5">
                    {isStudent ? "Instructors" : "Signed By"}
                  </p>
                  <div className="space-y-1">
                    {((raw.signatures as any[]) ?? []).map((s: any, i: number) => (
                      <div key={i} className="text-sm">
                        <span className="font-medium text-fg">{s.signer_name}</span>
                        {s.signer_licence_rating && (
                          <span className="text-fg-3"> · {s.signer_licence_rating}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {raw.coordinates_lat != null && raw.coordinates_lng != null && (
                <Row label="GPS Coordinates">
                  <span className="font-mono text-xs flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-fg-4" />
                    {fmtCoords(raw.coordinates_lat, raw.coordinates_lng)}
                  </span>
                </Row>
              )}
              {tags.length > 0 && (
                <div>
                  <p className="text-overline font-mono uppercase tracking-wider text-fg-3 mb-2">Tags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((t) => <TagPill key={t.id} name={t.name} color={t.color} />)}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Student / jumper notes */}
          {raw.notes && (
            <div className="bg-surface border border-border rounded-md overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <p className="text-overline font-mono uppercase tracking-wider text-fg-3">
                  {isStudent ? "Student Notes" : "Notes"}
                </p>
                {isStudent && <Badge kind="muted">Self</Badge>}
              </div>
              <div className="p-5">
                <p className="text-body text-fg-2 leading-relaxed whitespace-pre-wrap">{raw.notes}</p>
              </div>
            </div>
          )}

          {/* Instructor notes — student jump, blue accent */}
          {isStudent && sig?.notes && (
            <div className="bg-surface border border-sky/20 rounded-md overflow-hidden">
              <div className="px-4 py-3 border-b border-sky/20 flex items-center justify-between">
                <p className="text-overline font-mono uppercase tracking-wider text-sky">
                  Instructor Notes
                </p>
                <span className="text-overline font-mono text-fg-3">
                  {fmtSignerShort(sig.signer_name)}
                  {sig.signer_licence_rating ? ` · ${sig.signer_licence_rating}` : ""}
                </span>
              </div>
              <div className="p-5">
                <p className="text-body text-fg-2 leading-relaxed whitespace-pre-wrap">{sig.notes}</p>
              </div>
            </div>
          )}

          {/* Photo */}
          {raw.photo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={raw.photo_url}
              alt={`Jump #${raw.jump_number} photo`}
              className="w-full rounded-md object-cover max-h-80 border border-border"
            />
          )}

          {/* Edit history */}
          {edits.length > 0 && (
            <div className="bg-surface border border-border rounded-md overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <p className="text-overline font-mono uppercase tracking-wider text-fg-3">Edit History</p>
              </div>
              <div className="divide-y divide-border">
                {edits.map((edit) => (
                  <div key={edit.id} className="px-4 py-3">
                    <p className="text-overline font-mono text-fg-3 mb-2">
                      <LocalTime iso={edit.edited_at} />
                      {" · "}
                      {fmtDate(edit.edited_at.slice(0, 10), dateFormat)}
                    </p>
                    {(edit.changes as Array<{ field: string; from: string; to: string }>).map((c, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        <span className="text-fg-4 font-mono uppercase w-20 shrink-0">{c.field}</span>
                        <span className="text-fg-3 line-through">{c.from || "—"}</span>
                        <span className="text-fg-4">→</span>
                        <span className="text-fg-2">{c.to || "—"}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── SIDEBAR: Sign-off + Audit Trail + Adjacent Jumps ─────────────── */}
        <div className="space-y-4">

          {/* Signed off card */}
          {isSigned && sig ? (
            <div className="bg-surface border border-sky/20 ring-1 ring-sky/10 rounded-md overflow-hidden">
              <div className="px-4 py-3 border-b border-sky/20 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-ok">
                  <Check className="w-3.5 h-3.5" />
                  <p className="text-overline font-mono uppercase tracking-wider">Signed Off</p>
                </div>
                <div className="flex gap-1.5">
                  {sig.outcome === "pass"   && <Badge kind="ok" icon="check">Pass</Badge>}
                  {sig.outcome === "repeat" && <Badge kind="warn">Repeat</Badge>}
                  {isStudent                && <Badge kind="warn">Student</Badge>}
                </div>
              </div>
              <div className="p-4">
                <p className="text-overline font-mono uppercase tracking-wider text-fg-3 mb-1">
                  {isStudent ? "Instructor" : "Signed By"}
                </p>
                <p className="text-base font-semibold text-fg">{sig.signer_name}</p>
                <p className="text-sm text-fg-3 mt-0.5">
                  {sig.signer_licence_number}
                  {sig.signer_licence_rating ? ` · ${sig.signer_licence_rating}` : ""}
                </p>
                {sig.signature_data && (
                  <div className="mt-3 rounded-md bg-surface-2 border border-border px-2 pt-1 pb-0">
                    <svg
                      viewBox="0 0 320 200"
                      className="w-full"
                      style={{ height: 80 }}
                      preserveAspectRatio="xMidYMid meet"
                    >
                      <path
                        d={sig.signature_data}
                        stroke="var(--c-sky)"
                        strokeWidth="2.5"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                )}
                <div className="mt-3">
                  <p className="text-overline font-mono uppercase tracking-wider text-fg-3 mb-0.5">
                    Signed At
                  </p>
                  <p className="text-sm font-mono text-fg-2">
                    <JumpDateDisplay iso={sig.signed_at} />
                  </p>
                </div>
                {!isStudent && sig.notes && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-overline font-mono uppercase tracking-wider text-fg-3 mb-1">
                      Signer Notes
                    </p>
                    <p className="text-sm text-fg-2 leading-relaxed">{sig.notes}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-surface border border-border rounded-md overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-warn" />
                <p className="text-overline font-mono uppercase tracking-wider text-fg-3">
                  {isDraft ? "Draft — Not Submitted" : "Awaiting Sign-Off"}
                </p>
              </div>
              <div className="p-4">
                <p className="text-sm text-fg-3">
                  {isDraft
                    ? "This jump has been saved as a draft and has not yet been signed."
                    : "This jump has not been signed by an instructor."}
                </p>
              </div>
            </div>
          )}

          {/* Audit Trail */}
          <div className="bg-surface border border-border rounded-md overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <p className="text-overline font-mono uppercase tracking-wider text-fg-3">Audit Trail</p>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <p className="text-overline font-mono uppercase tracking-wider text-fg-3 mb-0.5">Created</p>
                <p className="text-sm font-mono text-fg-2"><JumpDateDisplay iso={raw.created_at} /></p>
              </div>
              {raw.updated_at && raw.updated_at !== raw.created_at && (
                <div>
                  <p className="text-overline font-mono uppercase tracking-wider text-fg-3 mb-0.5">Updated</p>
                  <p className="text-sm font-mono text-fg-2"><JumpDateDisplay iso={raw.updated_at} /></p>
                </div>
              )}
              {isSigned && sig && (
                <div>
                  <p className="text-overline font-mono uppercase tracking-wider text-fg-3 mb-0.5">Signed</p>
                  <p className="text-sm font-mono text-fg-2"><JumpDateDisplay iso={sig.signed_at} /></p>
                </div>
              )}
              <div>
                <p className="text-overline font-mono uppercase tracking-wider text-fg-3 mb-0.5">Source ID</p>
                <p className="text-overline font-mono text-fg-3 select-all">{sourceId}</p>
              </div>
              <p className="text-xs text-fg-3 leading-relaxed pt-2 border-t border-border">
                Read-only on web — edits must be made in the iOS / Android app.
              </p>
            </div>
          </div>

          {/* Adjacent Jumps */}
          {(prevJump || nextJump) && (
            <div className="bg-surface border border-border rounded-md overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <p className="text-overline font-mono uppercase tracking-wider text-fg-3">
                  Adjacent Jumps
                </p>
              </div>
              <div className="divide-y divide-border">
                {prevJump && (
                  <Link
                    href={`/logbook/${prevJump.id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 text-fg-4 shrink-0" />
                    <div>
                      <p className="text-overline font-mono uppercase tracking-wider text-fg-3">← Prev</p>
                      <p className="text-base font-medium text-fg">
                        #{prevJump.jump_number}
                        {prevJump.jump_type ? ` · ${prevJump.jump_type}` : ""}
                      </p>
                    </div>
                  </Link>
                )}
                {nextJump && (
                  <Link
                    href={`/logbook/${nextJump.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-surface-2 transition-colors"
                  >
                    <div>
                      <p className="text-overline font-mono uppercase tracking-wider text-fg-3">Next →</p>
                      <p className="text-base font-medium text-fg">
                        #{nextJump.jump_number}
                        {nextJump.jump_type ? ` · ${nextJump.jump_type}` : ""}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-fg-4 shrink-0" />
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

