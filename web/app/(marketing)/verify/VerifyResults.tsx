"use client"

import { useState, useMemo } from "react"
import { Search, X, ArrowRight, User, Plane } from "lucide-react"

type ChangeEntry = { field: string; from: string | null; to: string | null }
type EditEntry   = { edited_at: string; changes: ChangeEntry[] }

export type VerifiedJump = {
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

export type VerifyJumper = {
  full_name: string | null
  licence_number: string | null
  licence_rating: string | null
  country: string | null
  home_dz: string | null
}

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

  // Total edit changes count
  const totalChanges = jump.edits.reduce((sum, e) => {
    const ch = Array.isArray(e.changes) ? e.changes : []
    return sum + ch.length
  }, 0)

  return (
    <div className="border border-border rounded-sm overflow-hidden">
      {/* Card header */}
      <div className="flex items-start justify-between gap-4 bg-surface px-5 py-4 border-b border-border">
        <div className="flex items-center gap-4">
          <div>
            <p className="font-mono text-xs text-fg-4 tracking-widest uppercase mb-0.5">Jump №</p>
            <p className="font-mono text-4xl font-medium text-fg leading-none">{jump.jump_number}</p>
          </div>
          <div className="flex flex-wrap gap-1">
            {jump.jump_type && (
              <span className="inline-block font-mono text-xs bg-sky/10 text-sky px-2 py-1 rounded-sm tracking-wider uppercase">
                {jump.jump_type}
              </span>
            )}
            {isStudent && jump.jump_stage && (
              <span className="inline-block font-mono text-xs bg-warn/10 text-warn px-2 py-1 rounded-sm tracking-wider uppercase">
                {jump.jump_stage}
              </span>
            )}
            {jump.signer_outcome && outcomeColor && (
              <span className={`inline-block font-mono text-xs px-2 py-1 rounded-sm tracking-wider uppercase ${outcomeColor}`}>
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
        <Spec label="Dropzone"        value={dzLabel || null} />
        <Spec label="Aircraft"        value={acLabel || null} />
        <Spec label="Canopy type"     value={jump.canopy_type} />
        <Spec label="Jumper category" value={isStudent ? "Student" : "Licensed"} />
        <Spec label="People on jump"  value={jump.people_on_jump != null ? String(jump.people_on_jump) : null} />
        <Spec label="Logged"          value={fmtDateTime(jump.created_at)} />
        <Spec label="Last updated"    value={fmtDateTime(jump.updated_at)} />
      </div>

      {/* Notes */}
      {jump.notes && (
        <div className="mx-5 mb-4 mt-1 p-3 bg-surface-2 rounded-sm border border-border">
          <p className="font-mono text-[10px] text-fg-4 tracking-widest uppercase mb-1.5">Notes</p>
          <p className="text-sm text-fg-2 leading-relaxed">{jump.notes}</p>
        </div>
      )}

      {/* Instructor notes (student) */}
      {isStudent && jump.signer_notes && (
        <div className="mx-5 mb-4 mt-1 p-3 bg-surface-2 rounded-sm border border-border">
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
      {jump.edits.length > 0 ? (
        <div className="mx-5 mb-4 mt-2">
          <div className="flex items-center gap-2 mb-2">
            <p className="font-mono text-[10px] text-fg-4 tracking-widest uppercase">
              Edit history
            </p>
            <span className="font-mono text-[10px] bg-warn/10 text-warn px-1.5 py-0.5 rounded-sm">
              {jump.edits.length} session{jump.edits.length !== 1 ? "s" : ""} · {totalChanges} change{totalChanges !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="border border-border rounded-sm overflow-hidden">
            {jump.edits.map((edit, ei) => {
              const changeList: ChangeEntry[] = Array.isArray(edit.changes) ? edit.changes : []
              return (
                <div key={ei} className="border-b border-border last:border-0">
                  {/* Session header */}
                  <div className="flex items-center justify-between px-4 py-2 bg-surface-2 border-b border-dashed border-border">
                    <p className="font-mono text-[10px] text-fg-3 tracking-wider">
                      Edited {fmtDateTime(edit.edited_at)}
                    </p>
                    <span className="font-mono text-[10px] text-fg-4">
                      {changeList.length} field{changeList.length !== 1 ? "s" : ""} changed
                    </span>
                  </div>
                  {/* Change rows */}
                  {changeList.length === 0 ? (
                    <p className="px-4 py-2 text-xs text-fg-3 italic">No field details recorded.</p>
                  ) : (
                    <div className="divide-y divide-dashed divide-border">
                      {changeList.map((ch, ci) => (
                        <div key={ci} className="flex items-center gap-3 px-4 py-2.5">
                          <span className="font-medium text-xs text-fg-2 w-28 flex-shrink-0">{ch.field}</span>
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="font-mono text-xs text-danger bg-danger/5 px-1.5 py-0.5 rounded-sm line-through max-w-[35%] truncate">
                              {ch.from ?? "—"}
                            </span>
                            <ArrowRight className="w-3 h-3 text-fg-4 flex-shrink-0" />
                            <span className="font-mono text-xs text-ok bg-ok/5 px-1.5 py-0.5 rounded-sm max-w-[35%] truncate">
                              {ch.to ?? "—"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="mx-5 mb-4 mt-2 flex items-center gap-2 px-3 py-2 bg-ok/5 border border-ok/10 rounded-sm">
          <span className="font-mono text-[10px] text-ok tracking-widest uppercase">No edits</span>
          <span className="text-xs text-fg-3">This jump has never been modified after logging.</span>
        </div>
      )}
    </div>
  )
}

// ─── Jumper card ──────────────────────────────────────────────────────────────

function JumperCard({ jumper }: { jumper: VerifyJumper }) {
  const rows = [
    ["Name",           jumper.full_name],
    ["Licence number", jumper.licence_number],
    ["Licence rating", jumper.licence_rating],
    ["Home dropzone",  jumper.home_dz],
    ["Country",        jumper.country],
  ].filter(([, v]) => v) as [string, string][]

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <User className="w-4 h-4 text-fg-3" />
        <h2 className="font-mono font-semibold tracking-widest uppercase text-fg-4 text-xs">Jumper</h2>
      </div>
      <div className="border border-border rounded-sm bg-surface px-5 py-1">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between py-2.5 border-b border-border last:border-0">
            <span className="text-sm text-fg-3">{label}</span>
            <span className="text-sm font-medium text-fg text-right ml-4 max-w-[60%]">{value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main export ─────────────────────────────────────────────────────────────

export default function VerifyResults({
  jumper,
  jumps,
}: {
  jumper: VerifyJumper
  jumps: VerifiedJump[]
}) {
  const [query, setQuery] = useState("")
  const showSearch = jumps.length > 3

  const filtered = useMemo(() => {
    if (!query.trim()) return jumps
    const q = query.trim().toLowerCase()
    return jumps.filter(j =>
      String(j.jump_number).includes(q) ||
      j.date?.includes(q) ||
      j.jump_type?.toLowerCase().includes(q) ||
      j.dz_name?.toLowerCase().includes(q) ||
      j.jump_stage?.toLowerCase().includes(q)
    )
  }, [jumps, query])

  return (
    <div className="space-y-8">
      {/* Jumper */}
      <JumperCard jumper={jumper} />

      {/* Jump list */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Plane className="w-4 h-4 text-fg-3" />
          <h2 className="font-mono font-semibold tracking-widest uppercase text-fg-4 text-xs">
            {jumps.length === 1 ? "Jump record" : `Jump records (${jumps.length})`}
          </h2>
        </div>

        {/* Search — shown when more than 3 jumps */}
        {showSearch && (
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-3 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Filter by jump number, date, type or dropzone…"
                className="w-full pl-10 pr-10 py-3 bg-surface border border-border rounded-sm text-sm text-fg placeholder:text-fg-3 focus:outline-none focus:border-sky focus:ring-1 focus:ring-sky/20 transition-colors"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-fg-3 hover:text-fg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {query && (
              <p className="text-xs text-fg-3 mt-2">
                {filtered.length === 0
                  ? `No jumps match "${query}"`
                  : `Showing ${filtered.length} of ${jumps.length} jump${jumps.length !== 1 ? "s" : ""}`}
              </p>
            )}
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="p-6 border border-border rounded-sm text-center">
            <p className="text-sm text-fg-3">No jumps match &ldquo;{query}&rdquo;</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(jump => (
              <JumpCard key={jump.id} jump={jump} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
