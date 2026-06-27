"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Download, Loader2, X, FileText, LayoutGrid, Star, Check,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"

const JUMP_TYPES = [
  "Belly", "Freefly", "Tracking", "Angle", "Wingsuit", "VFS", "CRW",
  "Canopy Piloting", "AFF", "Tandem", "Coach", "Camera Flying",
  "Hop&Pop", "Demo", "Night", "HALO", "Accuracy", "Water Jump",
  "Hybrid", "Speed", "Skysurfing",
] as const

const DATE_RANGES = ["All time", "This year", "Last 90 days", "This month", "Custom"] as const
type DateRange = typeof DATE_RANGES[number]
type TagData = { id: string; name: string; color: string }

function getDateBounds(range: DateRange, from: string, to: string) {
  if (range === "This year") return { gte: `${new Date().getFullYear()}-01-01`, lte: undefined }
  if (range === "Last 90 days") {
    const d = new Date(); d.setDate(d.getDate() - 90)
    return { gte: d.toISOString().slice(0, 10), lte: undefined }
  }
  if (range === "This month") {
    const n = new Date()
    return { gte: `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-01`, lte: undefined }
  }
  if (range === "Custom") return { gte: from, lte: to }
  return { gte: undefined, lte: undefined }
}

async function resolveJumpIds(opts: {
  range: DateRange; customFrom: string; customTo: string
  jumpTypes: string[]; tags: string[]
  favouritesOnly: boolean; signedOnly: boolean; jumpNumbers: string
}): Promise<string[]> {
  const { range, customFrom, customTo, jumpTypes, tags, favouritesOnly, signedOnly, jumpNumbers } = opts
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const nums = jumpNumbers.split(",").map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n) && n > 0)
  if (nums.length > 0) {
    const { data } = await supabase.from("jumps").select("id")
      .eq("user_id", user.id).is("deleted_at", null)
      .in("jump_number", nums).order("jump_number", { ascending: true })
    return (data ?? []).map(j => j.id)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = supabase.from("jumps")
    .select("id, is_favourite, jump_tags(tags(id)), signatures(id)")
    .eq("user_id", user.id).is("deleted_at", null)
    .order("jump_number", { ascending: true })

  const bounds = getDateBounds(range, customFrom, customTo)
  if (bounds.gte) q = q.gte("date", bounds.gte)
  if (bounds.lte) q = q.lte("date", bounds.lte)
  if (jumpTypes.length > 0) q = q.in("jump_type", jumpTypes)
  if (favouritesOnly) q = q.eq("is_favourite", true)

  const { data } = await q
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let rows = (data ?? []) as any[]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (tags.length > 0) rows = rows.filter(j => j.jump_tags?.some((jt: any) => tags.includes(jt.tags?.id)))
  if (signedOnly) rows = rows.filter(j => (j.signatures?.length ?? 0) > 0)

  return rows.map(j => j.id)
}

export default function LogbookBulkExportButton() {
  const [open, setOpen] = useState(false)
  const [format, setFormat] = useState<"PDF" | "CSV">("PDF")
  const [loading, setLoading] = useState<"single" | "ten" | "csv" | null>(null)
  const [range, setRange] = useState<DateRange>("All time")
  const [customFrom, setCustomFrom] = useState(() => {
    const d = new Date(); d.setFullYear(d.getFullYear() - 1); return d.toISOString().slice(0, 10)
  })
  const [customTo, setCustomTo] = useState(() => new Date().toISOString().slice(0, 10))
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [favouritesOnly, setFavouritesOnly] = useState(false)
  const [signedOnly, setSignedOnly] = useState(false)
  const [jumpNumbers, setJumpNumbers] = useState("")
  const [userTags, setUserTags] = useState<TagData[]>([])
  const [jumpCount, setJumpCount] = useState<number | null>(null)

  const jumpNumbersActive = jumpNumbers.trim().length > 0
  const hasFilters = range !== "All time" || selectedTypes.length > 0 || selectedTags.length > 0
    || favouritesOnly || signedOnly || jumpNumbersActive

  useEffect(() => {
    if (!open) return
    ;(async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from("tags").select("id, name, color")
        .eq("user_id", user.id).order("name")
      setUserTags(data ?? [])
    })()
  }, [open])

  const clearFilters = useCallback(() => {
    setRange("All time"); setSelectedTypes([]); setSelectedTags([])
    setFavouritesOnly(false); setSignedOnly(false); setJumpNumbers(""); setJumpCount(null)
  }, [])

  const resetCount = () => setJumpCount(null)

  const fetchCount = async () => {
    const ids = await resolveJumpIds({
      range, customFrom, customTo, jumpTypes: selectedTypes, tags: selectedTags,
      favouritesOnly, signedOnly, jumpNumbers,
    })
    setJumpCount(ids.length)
  }

  const handlePdfExport = async (layout: "single" | "ten") => {
    setLoading(layout)
    try {
      const ids = await resolveJumpIds({
        range, customFrom, customTo, jumpTypes: selectedTypes, tags: selectedTags,
        favouritesOnly, signedOnly, jumpNumbers,
      })
      if (ids.length === 0) { alert("No jumps match the selected filters."); return }
      const res = await fetch("/api/export/logbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jumpIds: ids, layout }),
      })
      if (!res.ok) throw new Error("Export failed")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url; a.download = `logbook-${new Date().toISOString().slice(0, 10)}.pdf`
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      alert("PDF export failed. Please try again.")
    } finally {
      setLoading(null)
    }
  }

  const handleCsvExport = async () => {
    setLoading("csv")
    try {
      const ids = await resolveJumpIds({
        range, customFrom, customTo, jumpTypes: selectedTypes, tags: selectedTags,
        favouritesOnly, signedOnly, jumpNumbers,
      })
      if (ids.length === 0) { alert("No jumps match the selected filters."); return }

      const supabase = createClient()
      const { data: jumps, error } = await supabase.from("jumps")
        .select("jump_number, date, aircraft_type, aircraft_rego, jump_type, jumper_type, exit_altitude_ft, pull_altitude_ft, deploy_altitude_ft, freefall_seconds, canopy_seconds, landing_accuracy_value, landing_accuracy_unit, coordinates_lat, coordinates_lng, notes, dropzones(name, region)")
        .in("id", ids).order("jump_number", { ascending: true })
      if (error) throw new Error(error.message)

      const COLS = [
        "jump_number", "date", "dz_name", "dz_region",
        "aircraft_type", "aircraft_rego", "jump_type", "jumper_type",
        "exit_altitude_ft", "pull_altitude_ft", "deploy_altitude_ft",
        "freefall_seconds", "canopy_seconds",
        "landing_accuracy_value", "landing_accuracy_unit",
        "coordinates_lat", "coordinates_lng", "notes",
      ] as const
      const HEADERS: Record<typeof COLS[number], string> = {
        jump_number: "Jump #", date: "Date", dz_name: "Dropzone", dz_region: "Region",
        aircraft_type: "Aircraft Type", aircraft_rego: "Aircraft Rego",
        jump_type: "Jump Type", jumper_type: "Jumper Category",
        exit_altitude_ft: "Exit Altitude (ft)", pull_altitude_ft: "Pull Altitude (ft)",
        deploy_altitude_ft: "Deploy Altitude (ft)",
        freefall_seconds: "Freefall (s)", canopy_seconds: "Canopy (s)",
        landing_accuracy_value: "Landing Accuracy", landing_accuracy_unit: "Accuracy Unit",
        coordinates_lat: "Latitude", coordinates_lng: "Longitude", notes: "Notes",
      }
      const escape = (v: unknown) => {
        if (v === null || v === undefined) return ""
        const s = String(v)
        return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = (jumps ?? []) as any[]
      const csv = "﻿" + [
        COLS.map(c => HEADERS[c]).join(","),
        ...rows.map(r => COLS.map(c => {
          if (c === "dz_name") return escape(r.dropzones?.name ?? null)
          if (c === "dz_region") return escape(r.dropzones?.region ?? null)
          return escape(r[c])
        }).join(",")),
      ].join("\n")

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url; a.download = `logbook-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      alert(err instanceof Error ? err.message : "CSV export failed.")
    } finally {
      setLoading(null)
    }
  }

  const toggleType = (t: string) => {
    setSelectedTypes(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t]); resetCount()
  }
  const toggleTag = (id: string) => {
    setSelectedTags(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]); resetCount()
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 border border-border rounded-sm px-4 py-2 text-sm text-fg-2 hover:bg-surface-2 hover:text-fg transition-colors"
      >
        <Download className="w-4 h-4" />
        Export
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-bg border border-border rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <h2 className="font-semibold text-fg text-base">Export logbook</h2>
              <button onClick={() => setOpen(false)} className="text-fg-4 hover:text-fg transition-colors p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

              {/* FORMAT */}
              <div>
                <p className="text-[10px] font-mono tracking-widest uppercase text-fg-3 mb-2">Format</p>
                <div className="flex gap-2">
                  {(["PDF", "CSV"] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => { setFormat(f); resetCount() }}
                      className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-colors ${
                        format === f
                          ? "border-sky bg-sky/10 text-sky"
                          : "border-border text-fg-3 hover:text-fg hover:border-border-strong"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* FILTERS */}
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
                  <p className="text-[10px] font-mono tracking-widest uppercase text-fg-3">Filters</p>
                  {hasFilters && (
                    <button onClick={clearFilters} className="text-xs text-sky hover:underline">Clear all</button>
                  )}
                </div>

                {/* Date */}
                <p className="text-[10px] font-mono tracking-widest uppercase text-fg-3 mb-2">Date</p>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {DATE_RANGES.map(r => (
                    <button
                      key={r}
                      onClick={() => { setRange(r); resetCount() }}
                      className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                        range === r
                          ? "border-sky bg-sky/10 text-sky"
                          : "border-border text-fg-3 hover:text-fg hover:border-border-strong"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                {range === "Custom" && (
                  <div className="flex gap-3 mb-4">
                    <div className="flex-1">
                      <label className="text-[9px] font-mono tracking-widest uppercase text-fg-4 block mb-1">From</label>
                      <input
                        type="date"
                        value={customFrom}
                        max={customTo}
                        onChange={e => { setCustomFrom(e.target.value); resetCount() }}
                        className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-fg focus:outline-none focus:border-sky transition-colors"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-[9px] font-mono tracking-widest uppercase text-fg-4 block mb-1">To</label>
                      <input
                        type="date"
                        value={customTo}
                        min={customFrom}
                        max={new Date().toISOString().slice(0, 10)}
                        onChange={e => { setCustomTo(e.target.value); resetCount() }}
                        className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-fg focus:outline-none focus:border-sky transition-colors"
                      />
                    </div>
                  </div>
                )}

                {/* Jump type */}
                <p className="text-[10px] font-mono tracking-widest uppercase text-fg-3 mb-2">Jump type</p>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {JUMP_TYPES.map(t => (
                    <button
                      key={t}
                      onClick={() => toggleType(t)}
                      className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                        selectedTypes.includes(t)
                          ? "border-sky bg-sky/10 text-sky"
                          : "border-border text-fg-3 hover:text-fg hover:border-border-strong"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                {/* Tags */}
                {userTags.length > 0 && (
                  <>
                    <p className="text-[10px] font-mono tracking-widest uppercase text-fg-3 mb-2">Tags</p>
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {userTags.map(tag => {
                        const active = selectedTags.includes(tag.id)
                        return (
                          <button
                            key={tag.id}
                            onClick={() => toggleTag(tag.id)}
                            style={{
                              borderColor: active ? tag.color : undefined,
                              backgroundColor: active ? `${tag.color}18` : undefined,
                              color: active ? tag.color : undefined,
                            }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full border transition-colors ${
                              active ? "" : "border-border text-fg-3 hover:text-fg hover:border-border-strong"
                            }`}
                          >
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
                            {tag.name}
                          </button>
                        )
                      })}
                    </div>
                  </>
                )}

                {/* Toggles */}
                <div className="flex items-center justify-between py-3 border-t border-border">
                  <span className="text-sm text-fg">Favourites only</span>
                  <button
                    onClick={() => { setFavouritesOnly(v => !v); resetCount() }}
                    className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      favouritesOnly
                        ? "border-warn bg-warn/10 text-warn"
                        : "border-border text-fg-3 hover:text-fg"
                    }`}
                  >
                    <Star className="w-3 h-3" />
                    {favouritesOnly ? "On" : "Off"}
                  </button>
                </div>
                <div className="flex items-center justify-between py-3 border-t border-border">
                  <span className="text-sm text-fg">Signed only</span>
                  <button
                    onClick={() => { setSignedOnly(v => !v); resetCount() }}
                    className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      signedOnly
                        ? "border-ok bg-ok/10 text-ok"
                        : "border-border text-fg-3 hover:text-fg"
                    }`}
                  >
                    <Check className="w-3 h-3" />
                    {signedOnly ? "On" : "Off"}
                  </button>
                </div>

                {/* Jump numbers */}
                <div className="pt-3 border-t border-border">
                  <p className="text-[10px] font-mono tracking-widest uppercase text-fg-3 mb-2">Jump numbers</p>
                  <input
                    type="text"
                    value={jumpNumbers}
                    onChange={e => { setJumpNumbers(e.target.value); resetCount() }}
                    placeholder="e.g. 1, 5, 100, 250"
                    className={`w-full bg-surface border rounded-lg px-3 py-2 text-sm text-fg placeholder:text-fg-4 focus:outline-none transition-colors ${
                      jumpNumbersActive ? "border-sky" : "border-border focus:border-sky"
                    }`}
                  />
                  {jumpNumbersActive && (
                    <p className="text-xs text-fg-3 mt-1.5">Overrides all filters above — only these jump numbers are exported</p>
                  )}
                </div>
              </div>

              {/* Preview */}
              <div className="bg-surface border border-border rounded-xl p-5 text-center">
                <button onClick={fetchCount} className="hover:opacity-70 transition-opacity">
                  {jumpCount === null ? (
                    <p className="text-sm text-fg-3">Click to preview jump count</p>
                  ) : (
                    <p className="text-4xl font-bold text-fg tracking-tight">{jumpCount} <span className="text-2xl">JUMPS</span></p>
                  )}
                </button>
                <p className="text-xs text-fg-4 font-mono mt-2">
                  {[
                    format,
                    range !== "All time" ? range : null,
                    selectedTypes.length > 0 ? `${selectedTypes.length} type${selectedTypes.length > 1 ? "s" : ""}` : null,
                    selectedTags.length > 0 ? `${selectedTags.length} tag${selectedTags.length > 1 ? "s" : ""}` : null,
                    favouritesOnly ? "Favourites" : null,
                    signedOnly ? "Signed" : null,
                    jumpNumbersActive ? "Custom #s" : null,
                  ].filter(Boolean).join(" · ")}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-border px-6 py-4 shrink-0">
              {format === "PDF" ? (
                <div className="flex gap-3">
                  <button
                    onClick={() => handlePdfExport("single")}
                    disabled={loading !== null}
                    className="flex-1 flex items-center gap-3 px-4 py-3 rounded-lg border border-border hover:bg-surface-2 hover:border-border-strong transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
                  >
                    {loading === "single" ? (
                      <Loader2 className="w-4 h-4 text-fg-3 shrink-0 animate-spin" />
                    ) : (
                      <FileText className="w-4 h-4 text-fg-3 shrink-0" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-fg leading-none mb-0.5">
                        {loading === "single" ? "Generating…" : "1 jump per page"}
                      </p>
                      <p className="text-xs text-fg-4">Full detail + signature</p>
                    </div>
                  </button>
                  <button
                    onClick={() => handlePdfExport("ten")}
                    disabled={loading !== null}
                    className="flex-1 flex items-center gap-3 px-4 py-3 rounded-lg border border-border hover:bg-surface-2 hover:border-border-strong transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
                  >
                    {loading === "ten" ? (
                      <Loader2 className="w-4 h-4 text-fg-3 shrink-0 animate-spin" />
                    ) : (
                      <LayoutGrid className="w-4 h-4 text-fg-3 shrink-0" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-fg leading-none mb-0.5">
                        {loading === "ten" ? "Generating…" : "6 jumps per page"}
                      </p>
                      <p className="text-xs text-fg-4">Compact logbook grid</p>
                    </div>
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleCsvExport}
                  disabled={loading !== null}
                  className="w-full flex items-center justify-center gap-2 bg-sky text-on-sky rounded-lg py-3 text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading === "csv" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  {loading === "csv" ? "Exporting…" : "Download CSV"}
                </button>
              )}
            </div>

          </div>
        </div>
      )}
    </>
  )
}
