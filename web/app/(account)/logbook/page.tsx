import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { fmtDate, fmtAltitude } from "@/lib/display"
import LogbookSearch from "@/components/LogbookSearch"
import LogbookRow from "@/components/LogbookRow"
import LogbookBulkExportButton from "@/components/LogbookBulkExportButton"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Star, Check } from "lucide-react"

const PAGE_SIZE = 20

function fmtSeconds(s: number | null) {
  if (!s) return "—"
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, "0")}`
}

type SearchParams = { page?: string; q?: string; year?: string; type?: string; signed?: string; fav?: string }

type Signature = { id: string; signer_name: string; signed_at: string }
type JumpRow = {
  id: string; jump_number: number; date: string; jump_type: string | null
  jump_stage: string | null; jumper_type: string | null
  aircraft_type: string | null; aircraft_rego: string | null; exit_altitude_ft: number | null
  freefall_seconds: number | null; canopy_seconds: number | null; is_favourite: boolean | null
  dropzone: { name: string } | null; signatures: Signature[]
}

export default async function LogbookPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const uid = user!.id

  const cookieStore = await cookies()
  const dateFormat = cookieStore.get("pref_date_format")?.value ?? "DD MMM YYYY"
  const altUnit    = cookieStore.get("pref_altitude_unit")?.value ?? "ft"

  const page    = Math.max(1, Number(params.page ?? 1))
  const query   = params.q    ?? ""
  const year    = params.year ?? ""
  const jumpType = params.type ?? ""
  const signed  = params.signed === "1"
  const fav     = params.fav === "1"

  const sigSelect = signed ? "signatures!inner(id, signer_name, signed_at)" : "signatures(id, signer_name, signed_at)"
  const selectStr = `id, jump_number, date, jump_type, jump_stage, jumper_type, aircraft_type, aircraft_rego, exit_altitude_ft, freefall_seconds, canopy_seconds, is_favourite, dropzone:dropzones(name), ${sigSelect}`

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = supabase
    .from("jumps")
    .select(selectStr, { count: "exact" })
    .eq("user_id", uid)
    .is("deleted_at", null)

  if (query)    q = q.or(`jump_type.ilike.%${query}%,aircraft_type.ilike.%${query}%`)
  if (year)     q = q.gte("date", `${year}-01-01`).lte("date", `${year}-12-31`)
  if (jumpType) q = q.eq("jump_type", jumpType)
  if (fav)      q = q.eq("is_favourite", true)

  q = q.order("jump_number", { ascending: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

  const { data: jumps, count } = await q

  const totalCount = count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const from = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const to   = Math.min(page * PAGE_SIZE, totalCount)

  const { data: yearRows } = await supabase
    .from("jumps").select("date").eq("user_id", uid).is("deleted_at", null)
  const years = Array.from(new Set((yearRows ?? []).map((r: { date: string }) => new Date(r.date).getFullYear()))).sort((a, b) => (b as number) - (a as number))

  const TYPES = ["Belly", "Freefly", "Tracking", "Wingsuit", "AFF", "Tandem", "CRW", "Coach", "Demo"]

  const buildLink = (overrides: Record<string, string | undefined>) => {
    const p = new URLSearchParams()
    if (params.q)      p.set("q",      params.q)
    if (params.year)   p.set("year",   params.year)
    if (params.type)   p.set("type",   params.type)
    if (params.signed) p.set("signed", params.signed)
    if (params.fav)    p.set("fav",    params.fav)
    Object.entries(overrides).forEach(([k, v]) => {
      if (v) p.set(k, v); else p.delete(k)
    })
    const qs = p.toString()
    return `/logbook${qs ? `?${qs}` : ""}`
  }

  const now = new Date().getFullYear()

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-5 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-overline font-semibold tracking-widest uppercase text-fg-4 mb-1">
            Logbook · <span className="text-danger">Read-only</span>
          </p>
          <h1 className="text-h1 font-bold text-fg tracking-tight">{totalCount.toLocaleString()} jumps</h1>
        </div>
        <LogbookBulkExportButton jumpIds={(jumps ?? []).map((j: JumpRow) => j.id)} />
      </div>

      {/* Filters row */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        {/* Search */}
        <LogbookSearch defaultValue={query} />

        {/* Year */}
        <Link
          href={buildLink({ year: year ? undefined : String(now), page: "1" })}
          className={`text-xs px-3 py-1.5 rounded-sm border transition-colors flex items-center gap-1.5 ${
            year ? "border-sky bg-sky/10 text-sky" : "border-border text-fg-3 hover:border-border-strong hover:text-fg"
          }`}
        >
          {year || now}
        </Link>

        {/* Type filter */}
        <div className="flex items-center gap-1 flex-wrap">
          <Link
            href={buildLink({ type: "", page: "1" })}
            className={`text-xs px-2.5 py-1.5 rounded-sm border transition-colors ${
              !jumpType ? "border-sky bg-sky/10 text-sky" : "border-border text-fg-3 hover:text-fg"
            }`}
          >
            All types
          </Link>
          {TYPES.map((t) => (
            <Link
              key={t}
              href={buildLink({ type: t, page: "1" })}
              className={`text-xs px-2.5 py-1.5 rounded-sm border transition-colors ${
                jumpType === t ? "border-sky bg-sky/10 text-sky" : "border-border text-fg-3 hover:text-fg"
              }`}
            >
              {t}
            </Link>
          ))}
        </div>

        {/* Signed filter */}
        <Link
          href={buildLink({ signed: signed ? undefined : "1", page: "1" })}
          className={`text-xs px-2.5 py-1.5 rounded-sm border transition-colors flex items-center gap-1 ${
            signed ? "border-sky bg-sky/10 text-sky" : "border-border text-fg-3 hover:text-fg"
          }`}
        >
          <Check className="w-3 h-3" /> Signed
        </Link>

        {/* Favs filter */}
        <Link
          href={buildLink({ fav: fav ? undefined : "1", page: "1" })}
          className={`text-xs px-2.5 py-1.5 rounded-sm border transition-colors flex items-center gap-1 ${
            fav ? "border-warn bg-warn/10 text-warn" : "border-border text-fg-3 hover:text-fg"
          }`}
        >
          <Star className="w-3 h-3" /> Favs
        </Link>
      </div>

      {/* Year quick filters */}
      <div className="flex items-center gap-1 flex-wrap mb-5">
        <Link
          href={buildLink({ year: "", page: "1" })}
          className={`text-xs px-2.5 py-1 rounded-sm border transition-colors ${
            !year ? "border-sky bg-sky/10 text-sky" : "border-border text-fg-3 hover:text-fg"
          }`}
        >
          All time
        </Link>
        {(years as number[]).map((y) => (
          <Link
            key={y}
            href={buildLink({ year: String(y), page: "1" })}
            className={`text-xs px-2.5 py-1 rounded-sm border transition-colors ${
              year === String(y) ? "border-sky bg-sky/10 text-sky" : "border-border text-fg-3 hover:text-fg"
            }`}
          >
            {y}
          </Link>
        ))}
      </div>

      {/* Table */}
      {!jumps?.length ? (
        <div className="bg-surface border border-border rounded-lg py-16 text-center text-sm text-fg-3">
          {query || year || jumpType || signed || fav ? "No jumps match those filters." : "No jumps logged yet."}
        </div>
      ) : (
        <>
          <div className="bg-surface border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    {["#", "DATE", "TYPE", "DZ", "AIRCRAFT", "REGO", "EXIT", "FF", "CANOPY", "STATUS"].map((h) => (
                      <th key={h} className="px-3 py-2.5 text-overline font-semibold tracking-widest text-fg-4 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(jumps as JumpRow[]).map((j) => {
                    const isSigned = j.signatures?.length > 0
                    const isFav = j.is_favourite
                    return (
                      <LogbookRow key={j.id} href={`/logbook/${j.id}`}>
                        <td className="px-3 py-2.5 font-mono text-xs text-fg-3">
                          <span className="flex items-center gap-1">
                            {isFav && <Star className="w-2.5 h-2.5 text-warn fill-warn flex-shrink-0" />}
                            #{j.jump_number}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-xs text-fg whitespace-nowrap">{fmtDate(j.date, dateFormat)}</td>
                        <td className="px-3 py-2.5 text-xs text-fg">{j.jumper_type === 'student' && j.jump_stage ? j.jump_stage : (j.jump_type ?? "—")}</td>
                        <td className="px-3 py-2.5 text-xs text-fg-2 max-w-[120px] truncate">{j.dropzone?.name ?? "—"}</td>
                        <td className="px-3 py-2.5 text-xs text-fg-3">{j.aircraft_type ?? "—"}</td>
                        <td className="px-3 py-2.5 text-xs text-fg-3 font-mono">{j.aircraft_rego ?? "—"}</td>
                        <td className="px-3 py-2.5 text-xs text-fg-3">
                          {fmtAltitude(j.exit_altitude_ft, altUnit)}
                        </td>
                        <td className="px-3 py-2.5 text-xs font-mono text-fg">{fmtSeconds(j.freefall_seconds)}</td>
                        <td className="px-3 py-2.5 text-xs font-mono text-fg-3">{fmtSeconds(j.canopy_seconds)}</td>
                        <td className="px-3 py-2.5">
                          {isSigned ? (
                            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-ok/15">
                              <Check className="w-3 h-3 text-ok" />
                            </span>
                          ) : (
                            <span className="w-5 h-5 flex items-center justify-center">
                              <span className="w-1 h-1 rounded-full bg-fg-4" />
                            </span>
                          )}
                        </td>
                      </LogbookRow>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="mt-4 flex items-center justify-between gap-4 flex-wrap">
            <p className="text-xs text-fg-4">Showing {from}–{to} of {totalCount.toLocaleString()}</p>
            <div className="flex items-center gap-1">
              {page > 1 ? (
                <Link href={buildLink({ page: String(page - 1) })} className="p-1.5 rounded-sm border border-border text-fg-3 hover:text-fg hover:border-border-strong transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </Link>
              ) : (
                <span className="p-1.5 rounded-sm border border-border text-fg-4 opacity-40 cursor-not-allowed">
                  <ChevronLeft className="w-4 h-4" />
                </span>
              )}

              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = totalPages <= 5 ? i + 1
                  : page <= 3 ? i + 1
                  : page >= totalPages - 2 ? totalPages - 4 + i
                  : page - 2 + i
                return (
                  <Link
                    key={pageNum}
                    href={buildLink({ page: String(pageNum) })}
                    className={`min-w-[32px] text-center px-2 py-1 rounded-sm border text-xs transition-colors ${
                      pageNum === page
                        ? "border-sky bg-sky/10 text-sky font-semibold"
                        : "border-border text-fg-3 hover:text-fg hover:border-border-strong"
                    }`}
                  >
                    {pageNum}
                  </Link>
                )
              })}

              {totalPages > 5 && page < totalPages - 2 && (
                <>
                  <span className="px-1 text-fg-4 text-xs">…</span>
                  <Link href={buildLink({ page: String(totalPages) })} className="min-w-[32px] text-center px-2 py-1 rounded-sm border border-border text-xs text-fg-3 hover:text-fg hover:border-border-strong transition-colors">
                    {totalPages}
                  </Link>
                </>
              )}

              {page < totalPages ? (
                <Link href={buildLink({ page: String(page + 1) })} className="p-1.5 rounded-sm border border-border text-fg-3 hover:text-fg hover:border-border-strong transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </Link>
              ) : (
                <span className="p-1.5 rounded-sm border border-border text-fg-4 opacity-40 cursor-not-allowed">
                  <ChevronRight className="w-4 h-4" />
                </span>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
