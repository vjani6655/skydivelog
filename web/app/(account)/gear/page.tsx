export const dynamic = "force-dynamic"

import { createClient } from "@/lib/supabase/server"
import { Briefcase, Umbrella, Cpu, AlertTriangle } from "lucide-react"
import GearActions from "./GearActions"

// ─── Types ───────────────────────────────────────────────────────────────────

interface GearRow {
  id: string
  type: "rig" | "canopy" | "aad"
  make_model: string
  serial_number: string
  manufactured_date: string | null
  jumps_on: number | null
  hours: number | null
  last_repack_date: string | null
  repack_reminder_enabled: boolean
  canopy_sub_type: string | null
  created_at: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function daysBetween(from: string | null, to: Date = new Date()): number | null {
  if (!from) return null
  const d = new Date(from)
  return Math.floor((to.getTime() - d.getTime()) / 86400000)
}

function fmtDate(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-AU", { month: "short", year: "numeric" })
}

// 180-day repack interval for reserve canopy
const REPACK_INTERVAL = 180
// ~4-year AAD service interval (1460 days)
const AAD_SERVICE_INTERVAL = 1460

function gearStatus(g: GearRow): {
  label: string
  kind: "ok" | "warn" | "danger"
  alertMsg: string | null
  progressPct: number | null
  daysLeft: number | null
} {
  const now = new Date()

  if (g.type === "canopy" && g.canopy_sub_type === "reserve" && g.last_repack_date) {
    const daysSince = daysBetween(g.last_repack_date, now) ?? 0
    const daysLeft = REPACK_INTERVAL - daysSince
    const pct = Math.max(0, Math.min(100, (daysLeft / REPACK_INTERVAL) * 100))
    if (daysLeft < 0) return { label: "REPACK OVERDUE", kind: "danger", alertMsg: `${Math.abs(daysLeft)}D overdue`, progressPct: 0, daysLeft }
    if (daysLeft <= 30) return { label: "REPACK DUE", kind: "warn", alertMsg: `${daysLeft}D left`, progressPct: pct, daysLeft }
    return { label: "IN SERVICE", kind: "ok", alertMsg: null, progressPct: pct, daysLeft }
  }

  if (g.type === "aad" && g.manufactured_date) {
    const daysSince = daysBetween(g.manufactured_date, now) ?? 0
    const daysLeft = AAD_SERVICE_INTERVAL - daysSince
    const pct = Math.max(0, Math.min(100, (daysLeft / AAD_SERVICE_INTERVAL) * 100))
    if (daysLeft < 0) return { label: "SERVICE OVERDUE", kind: "danger", alertMsg: `${Math.abs(daysLeft)}D overdue`, progressPct: 0, daysLeft }
    if (daysLeft <= 60) return { label: "SERVICE DUE", kind: "warn", alertMsg: `Service due ${fmtDate(g.manufactured_date)}`, progressPct: pct, daysLeft }
    return { label: "IN SERVICE", kind: "ok", alertMsg: null, progressPct: pct, daysLeft }
  }

  return { label: "IN SERVICE", kind: "ok", alertMsg: null, progressPct: null, daysLeft: null }
}

function GearIcon({ type }: { type: string }) {
  const cls = "w-5 h-5 text-sky"
  if (type === "canopy") return <Umbrella className={cls} />
  if (type === "aad")    return <Cpu className={cls} />
  return <Briefcase className={cls} />
}

function StatusBadge({ kind, label }: { kind: "ok" | "warn" | "danger"; label: string }) {
  const cls = {
    ok:     "bg-ok-bg text-ok border-ok/20",
    warn:   "bg-warn-bg text-warn border-warn/20",
    danger: "bg-danger-bg text-danger border-danger/20",
  }[kind]
  return (
    <span className={`inline-flex items-center h-[22px] px-2 rounded-[5px] font-mono text-[10px] font-medium tracking-wide border ${cls}`}>
      {label}
    </span>
  )
}

function ProgressBar({ pct, kind }: { pct: number; kind: "ok" | "warn" | "danger" }) {
  const color = { ok: "bg-ok", warn: "bg-warn", danger: "bg-danger" }[kind]
  return (
    <div className="h-[3px] bg-surface-2 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

// ─── Gear card ────────────────────────────────────────────────────────────────

function GearCard({ g, jumpCount }: { g: GearRow; jumpCount?: number }) {
  const { label, kind, alertMsg, progressPct, daysLeft } = gearStatus(g)
  const daysSinceRepack = g.last_repack_date ? daysBetween(g.last_repack_date) : null

  return (
    <div className="bg-surface border border-border rounded-[14px] p-5">
      {/* Top row: icon + name + badge */}
      <div className="flex items-start gap-3 mb-4">
        <div className="w-11 h-11 rounded-xl bg-surface-2 border border-border flex items-center justify-center flex-shrink-0">
          <GearIcon type={g.type} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="text-body font-semibold text-fg leading-tight">{g.make_model}</p>
            <StatusBadge kind={kind} label={label} />
          </div>
          <p className="font-mono text-[11px] text-fg-3">
            {g.serial_number ? `S/N ${g.serial_number}` : ""}
            {g.serial_number && g.manufactured_date ? " · " : ""}
            {g.manufactured_date ? `MFG ${fmtDate(g.manufactured_date)}` : ""}
          </p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div>
          <p className="font-mono text-[9px] tracking-widest uppercase text-fg-4 mb-1">Jumps on</p>
          <p className="font-mono text-[18px] font-medium text-fg leading-none">
            {jumpCount != null ? jumpCount : (g.jumps_on != null ? g.jumps_on : "—")}
          </p>
        </div>
        {g.type === "aad" && (
          <div>
            <p className="font-mono text-[9px] tracking-widest uppercase text-fg-4 mb-1">Hours</p>
            <p className="font-mono text-[18px] font-medium text-fg leading-none">
              {g.hours != null ? `${g.hours} h` : "—"}
            </p>
          </div>
        )}
        {(g.type === "canopy" || g.type === "rig") && daysLeft != null && (
          <div>
            <p className="font-mono text-[9px] tracking-widest uppercase text-fg-4 mb-1">Repack</p>
            <p className={`font-mono text-[18px] font-medium leading-none ${daysLeft < 0 ? "text-danger" : "text-fg"}`}>
              {daysLeft < 0 ? `${Math.abs(daysLeft)}D over` : `${daysLeft}D left`}
            </p>
          </div>
        )}
        {g.type === "aad" && daysLeft != null && (
          <div>
            <p className="font-mono text-[9px] tracking-widest uppercase text-fg-4 mb-1">Service</p>
            <p className={`font-mono text-[18px] font-medium leading-none ${daysLeft < 0 ? "text-danger" : "text-fg"}`}>
              {daysLeft < 0 ? `${Math.abs(daysLeft)}D over` : `${daysLeft}D left`}
            </p>
          </div>
        )}
      </div>

      {/* Progress bar + meta */}
      {progressPct != null ? (
        <div>
          <ProgressBar pct={progressPct} kind={kind} />
          <div className="flex items-center justify-between mt-1.5">
            <span className="font-mono text-[9px] text-fg-4">
              {daysSinceRepack != null ? `${daysSinceRepack} DAYS SINCE LAST` : ""}
            </span>
            {alertMsg && (
              <span className={`font-mono text-[9px] font-medium ${kind === "danger" ? "text-danger" : "text-warn"}`}>
                {alertMsg.toUpperCase()}
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="h-[3px] bg-surface-2 rounded-full" />
      )}

      {/* Alert banner */}
      {alertMsg && kind !== "ok" && (
        <div className={`mt-3 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border ${
          kind === "danger"
            ? "bg-danger-bg border-danger/20 text-danger"
            : "bg-warn-bg border-warn/20 text-warn"
        }`}>
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          {kind === "danger" && g.type === "aad" ? "4-yr service" : g.type === "canopy" && g.canopy_sub_type === "reserve" ? "Repack" : "Service"} {alertMsg}
        </div>
      )}
    </div>
  )
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label, count, sub,
}: { label: string; count: number; sub: string }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-5">
      <p className="font-mono text-[10px] font-semibold tracking-widest uppercase text-fg-3">{label}</p>
      <p className="font-mono text-[30px] font-medium leading-none text-fg mt-2">{count}</p>
      <p className="text-xs text-fg-3 mt-1.5">{sub}</p>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function GearPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const uid = user!.id

  const { data: gearRaw } = await supabase
    .from("gear")
    .select("*")
    .eq("user_id", uid)
    .order("created_at", { ascending: false })

  const gear = (gearRaw ?? []) as GearRow[]

  // For canopies: count jumps linked via canopy_gear_id (real count overrides manual jumps_on)
  const canopyIds = gear.filter((g) => g.type === "canopy").map((g) => g.id)
  const jumpCounts: Record<string, number> = {}
  if (canopyIds.length > 0) {
    const { data: countRows } = await supabase
      .from("jumps")
      .select("canopy_gear_id")
      .in("canopy_gear_id", canopyIds)
      .is("deleted_at", null)
    for (const row of countRows ?? []) {
      if (row.canopy_gear_id) {
        jumpCounts[row.canopy_gear_id] = (jumpCounts[row.canopy_gear_id] ?? 0) + 1
      }
    }
  }

  // Stats
  const rigs      = gear.filter((g) => g.type === "rig")
  const canopies  = gear.filter((g) => g.type === "canopy")
  const aads      = gear.filter((g) => g.type === "aad")
  const attention = gear.filter((g) => {
    const { kind } = gearStatus(g)
    return kind !== "ok"
  })

  // Repack reminders active
  const reminders = gear.filter((g) => g.repack_reminder_enabled).length

  const statCards = [
    {
      label: "Rigs",
      count: rigs.length,
      sub: rigs.length === 0 ? "None added" : `${rigs.length} in service`,
    },
    {
      label: "Canopies",
      count: canopies.length,
      sub: (() => {
        const overdue = canopies.filter((g) => gearStatus(g).kind === "danger").length
        const due = canopies.filter((g) => gearStatus(g).kind === "warn").length
        if (overdue > 0) return `${overdue} repack overdue`
        if (due > 0) return `${due} repack due soon`
        return canopies.length === 0 ? "None added" : "All current"
      })(),
    },
    {
      label: "AADs",
      count: aads.length,
      sub: (() => {
        const serviceDue = aads.find((g) => gearStatus(g).kind !== "ok")
        if (serviceDue) {
          const mfg = serviceDue.manufactured_date
          return mfg ? `Service due ${new Date(mfg).toLocaleDateString("en-AU", { month: "short", year: "numeric" })}` : "Service due"
        }
        return aads.length === 0 ? "None added" : "All current"
      })(),
    },
    {
      label: "Reminders",
      count: reminders,
      sub: reminders === 0 ? "None set" : "upcoming this quarter",
    },
  ]

  return (
    <div className="max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] tracking-widest uppercase text-fg-3 mb-1">Gear</p>
          <h1 className="text-[28px] font-bold text-fg tracking-tight leading-none">
            {gear.length} item{gear.length !== 1 ? "s" : ""}
            {attention.length > 0 && (
              <span className="text-fg-3 font-normal"> · {attention.length} need attention</span>
            )}
          </h1>
        </div>
        <GearActions />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((s) => (
          <StatCard key={s.label} label={s.label} count={s.count} sub={s.sub} />
        ))}
      </div>

      {/* Gear grid */}
      {gear.length === 0 ? (
        <div className="bg-surface border border-border rounded-[14px] p-12 text-center">
          <Briefcase className="w-10 h-10 text-fg-4 mx-auto mb-3" />
          <p className="text-base font-medium text-fg-2 mb-1">No gear added yet</p>
          <p className="text-sm text-fg-3">Track your rig, canopy, and AAD here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {gear.map((g) => (
            <GearCard key={g.id} g={g} jumpCount={g.type === "canopy" ? jumpCounts[g.id] : undefined} />
          ))}
        </div>
      )}
    </div>
  )
}
