export const dynamic = 'force-dynamic'

import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { fmtDate } from "@/lib/display"
import Link from "next/link"
import { Download, BookOpen, Package, Award } from "lucide-react"

function fmtFreefall(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function daysSince(iso: string) {
  const ms = Date.now() - new Date(iso).getTime()
  return Math.floor(ms / 86400000)
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>
}) {
  const { period = "month" } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const uid = user!.id

  const cookieStore = await cookies()
  const dateFormat = cookieStore.get("pref_date_format")?.value ?? "DD MMM YYYY"

  // Profile
  const { data: profile } = await supabase
    .from("users")
    .select("full_name, licence_number, licence_rating")
    .eq("id", uid)
    .maybeSingle()

  // Subscription
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("status, plan, renews_at")
    .eq("user_id", uid)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  // All jumps (for stats)
  const { data: jumps } = await supabase
    .from("jumps")
    .select("id, jump_number, date, jump_type, freefall_seconds, dropzone_id")
    .eq("user_id", uid)
    .is("deleted_at", null)
    .order("date", { ascending: false })

  const jumpCount = jumps?.length ?? 0
  const totalFreefallSec = jumps?.reduce((s, j) => s + (j.freefall_seconds ?? 0), 0) ?? 0
  const lastJump = jumps?.[0] ?? null
  const currencyDays = lastJump ? daysSince(lastJump.date) : null
  const isCurrent = currencyDays !== null && currencyDays <= 30

  // Jumps in last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString()
  const recent30 = jumps?.filter((j) => j.date >= thirtyDaysAgo).length ?? 0

  const now = new Date()

  // Chart data depending on selected period
  let chartBars: { label: string; count: number }[] = []
  if (period === "year") {
    // Current calendar year by month
    const curYear = now.getFullYear()
    chartBars = Array.from({ length: 12 }, (_, i) => {
      const label = new Date(curYear, i, 1).toLocaleDateString("en-AU", { month: "short" }).toUpperCase()
      const count = jumps?.filter((j) => {
        const d = new Date(j.date); return d.getFullYear() === curYear && d.getMonth() === i
      }).length ?? 0
      return { label, count }
    })
  } else if (period === "all") {
    // All time by year
    const allYears = Array.from(new Set(jumps?.map((j) => new Date(j.date).getFullYear()) ?? [])).sort((a, b) => a - b)
    chartBars = allYears.map((y) => ({
      label: String(y),
      count: jumps?.filter((j) => new Date(j.date).getFullYear() === y).length ?? 0,
    }))
    if (chartBars.length === 0) chartBars = [{ label: String(now.getFullYear()), count: 0 }]
  } else {
    // Last 12 months (default: month view)
    chartBars = Array.from({ length: 12 }, (_, i) => {
      const monthsAgo = 11 - i
      const d = new Date(now)
      d.setMonth(d.getMonth() - monthsAgo)
      const label = d.toLocaleDateString("en-AU", { month: "short" }).toUpperCase()
      const count = jumps?.filter((j) => {
        const jd = new Date(j.date)
        return (now.getFullYear() - jd.getFullYear()) * 12 + (now.getMonth() - jd.getMonth()) === monthsAgo
      }).length ?? 0
      return { label, count }
    })
  }
  const chartTotal = chartBars.reduce((s, b) => s + b.count, 0)
  const maxBar = Math.max(...chartBars.map((b) => b.count), 1)

  // Legacy: monthlyCounts still used as alias
  const monthlyCounts = Array.from({ length: 12 }, (_, i) => {
    const monthsAgo = i
    return jumps?.filter((j) => {
      const jd = new Date(j.date)
      return (now.getFullYear() - jd.getFullYear()) * 12 + (now.getMonth() - jd.getMonth()) === monthsAgo
    }).length ?? 0
  })
  const maxMonthly = Math.max(...monthlyCounts, 1)
  void maxMonthly

  // Recent 5 jumps with DZ names
  const { data: recentJumps } = await supabase
    .from("jumps")
    .select("id, jump_number, date, jump_type, dropzone:dropzones(name)")
    .eq("user_id", uid)
    .is("deleted_at", null)
    .order("date", { ascending: false })
    .limit(5)

  // Gear due for attention
  const { data: gear } = await supabase
    .from("gear")
    .select("id, type, make_model, last_repack_date")
    .eq("user_id", uid)
    .not("last_repack_date", "is", null)

  const gearDue = gear?.filter((g) => {
    if (!g.last_repack_date) return false
    const repackDue = new Date(g.last_repack_date)
    repackDue.setMonth(repackDue.getMonth() + 6) // 6-month repack cycle
    return repackDue <= new Date(Date.now() + 30 * 86400000)
  }) ?? []

  // Certificates expiring within 90 days
  const ninetyDaysFromNow = new Date(Date.now() + 90 * 86400000).toISOString().split("T")[0]
  const { data: expiringCerts } = await supabase
    .from("certificates")
    .select("id, title, expires_date, category")
    .eq("user_id", uid)
    .not("expires_date", "is", null)
    .lte("expires_date", ninetyDaysFromNow)
    .order("expires_date", { ascending: true })
    .limit(5)

  const needsAttention = [
    ...gearDue.map((g) => ({
      id: g.id,
      label: `${g.make_model} — repack due`,
      type: "gear" as const,
      href: "/settings",
    })),
    ...(expiringCerts ?? []).map((c) => {
      const days = Math.floor((new Date(c.expires_date!).getTime() - Date.now()) / 86400000)
      const expired = days < 0
      return {
        id: c.id,
        label: c.title,
        note: expired ? `Expired ${Math.abs(days)}d ago` : `Expires in ${days}d`,
        type: "cert" as const,
        href: "/settings",
        urgent: expired || days < 30,
      }
    }),
  ]

  const firstName = profile?.full_name?.split(" ")[0] || "there"
  const isPro = sub?.status === "active"

  return (
    <div className="max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <p className="font-mono text-[11px] tracking-widest uppercase text-fg-3 mb-2">Dashboard</p>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-h1 font-bold text-fg tracking-tight">Hi, {firstName}.</h1>
          {isCurrent && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold bg-ok-bg text-ok px-2 py-0.5 rounded-full">
              ✓ CURRENT
            </span>
          )}
          {isPro && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold bg-sky-bg text-sky px-2 py-0.5 rounded-full">
              ○ PRO
            </span>
          )}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="bg-surface border border-border rounded-xl p-[22px]">
          <p className="font-mono text-[10px] font-semibold tracking-widest uppercase text-fg-3">Total jumps</p>
          <p className="font-mono text-[30px] font-medium leading-none text-fg mt-2">{jumpCount}</p>
          {recent30 > 0 ? (
            <p className="text-xs text-ok mt-[6px]">+{recent30} / 30D</p>
          ) : (
            <p className="text-xs text-fg-4 mt-[6px]">&nbsp;</p>
          )}
        </div>
        <div className="bg-surface border border-border rounded-xl p-[22px]">
          <p className="font-mono text-[10px] font-semibold tracking-widest uppercase text-fg-3">Freefall</p>
          <p className="font-mono text-[30px] font-medium leading-none text-fg mt-2">{jumpCount > 0 ? fmtFreefall(totalFreefallSec) : "—"}</p>
          {jumpCount > 0 ? (
            <p className="text-xs text-fg-3 mt-[6px]">avg {Math.round(totalFreefallSec / jumpCount)}s / jump</p>
          ) : (
            <p className="text-xs text-fg-4 mt-[6px]">&nbsp;</p>
          )}
        </div>
        <div className="bg-surface border border-border rounded-xl p-[22px]">
          <p className="font-mono text-[10px] font-semibold tracking-widest uppercase text-fg-3">Currency</p>
          <p className="font-mono text-[30px] font-medium leading-none text-fg mt-2">
            {currencyDays !== null ? `${currencyDays}D` : "—"}
          </p>
          <p className={`text-xs mt-[6px] ${isCurrent ? "text-ok" : currencyDays !== null ? "text-warn" : "text-fg-4"}`}>
            {currencyDays === null ? "No jumps yet" : isCurrent ? "Current" : `lapses in ${30 - currencyDays}d`}
          </p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-[22px]">
          <p className="font-mono text-[10px] font-semibold tracking-widest uppercase text-fg-3">Gear due</p>
          <p className="font-mono text-[30px] font-medium leading-none text-fg mt-2">{needsAttention.length}</p>
          <p className="text-xs text-fg-3 mt-[6px]">
            {needsAttention.length === 0 ? "All clear" : "repack & service"}
          </p>
        </div>
      </div>

      {/* Activity chart + recent */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Chart */}
        <div className="lg:col-span-2 bg-surface border border-border rounded-[14px] p-6 flex flex-col">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="font-mono text-[10px] font-semibold tracking-widest uppercase text-fg-3">
                {period === "year" ? `${now.getFullYear()}` : period === "all" ? "All time" : "Last 12 months"}
              </p>
              <p className="font-mono text-2xl font-medium text-fg mt-1">
                {chartTotal} <span className="text-sm font-normal text-fg-3">jumps</span>
              </p>
            </div>
            {/* Period toggle */}
            <div className="flex items-center bg-surface-2 rounded-lg p-[3px]">
              {(["month", "year", "all"] as const).map((p) => (
                <Link
                  key={p}
                  href={`/dashboard?period=${p}`}
                  className={`px-3 py-[6px] text-xs font-medium rounded-md transition-colors ${
                    period === p ? "bg-surface-3 text-fg" : "text-fg-3 hover:text-fg"
                  }`}
                >
                  {p === "month" ? "Month" : p === "year" ? "Year" : "All"}
                </Link>
              ))}
            </div>
          </div>
          {/* SVG bar chart */}
          {(() => {
            const svgW = 600
            const svgH = 160
            const n = chartBars.length
            const slot = svgW / n
            const barW = slot * 0.6
            return (
              <svg viewBox={`0 0 ${svgW} ${svgH + 18}`} className="w-full flex-1" preserveAspectRatio="none" style={{ minHeight: 120 }}>
                {chartBars.map(({ label, count }, i) => {
                  const barH = count > 0 ? Math.max((count / maxBar) * svgH, 4) : 2
                  const x = i * slot + (slot - barW) / 2
                  const y = svgH - barH
                  return (
                    <g key={i}>
                      <rect
                        x={x} y={y} width={barW} height={barH} rx="3"
                        fill={count > 0 ? 'rgba(74,158,255,0.40)' : 'rgba(74,158,255,0.10)'}
                      />
                      <text
                        x={x + barW / 2} y={svgH + 13}
                        textAnchor="middle"
                        style={{ fontSize: 9, fontFamily: 'var(--font-mono, monospace)', fill: 'var(--c-fg-3)' }}
                      >
                        {label}
                      </text>
                    </g>
                  )
                })}
              </svg>
            )
          })()}
        </div>

        {/* Recent jumps */}
        <div className="bg-surface border border-border rounded-[14px]">
          <div className="px-6 pt-6 pb-[14px] flex items-center justify-between">
            <p className="font-mono text-[10px] font-semibold tracking-widest uppercase text-fg-3">Recent</p>
            <Link href="/logbook" className="text-xs text-sky hover:text-sky/80 font-medium">
              View all →
            </Link>
          </div>
          {!recentJumps?.length ? (
            <div className="px-6 py-6 text-center text-xs text-fg-4">No jumps yet.</div>
          ) : (
            <ul className="divide-y divide-border">
              {(recentJumps as unknown as Array<{
                id: string
                jump_number: number
                date: string
                jump_type: string | null
                dropzone: { name: string } | null
              }>).map((j) => (
                <li key={j.id} className="px-6 py-[10px] flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-fg">{j.jump_type ?? "Jump"}</p>
                    <p className="font-mono text-[11px] text-fg-3">
                      {j.dropzone?.name ?? "Unknown DZ"} · {fmtDate(j.date, dateFormat)}
                    </p>
                  </div>
                  <span className="font-mono text-[11px] text-fg-3">#{j.jump_number}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Needs attention + Quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Needs attention */}
        <div className="bg-surface border border-border rounded-[14px]">
          <div className="px-6 pt-6 pb-[14px] border-b border-border">
            <p className="font-mono text-[10px] font-semibold tracking-widest uppercase text-fg-3">Needs attention</p>
          </div>
          {needsAttention.length === 0 ? (
            <div className="px-6 py-6 text-center text-xs text-fg-3">
              <span className="text-ok">✓</span> All clear
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {needsAttention.slice(0, 5).map((item) => (
                <li key={item.id} className="px-6 py-3 flex items-center gap-3">
                  <span
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${(item as { urgent?: boolean }).urgent ? "bg-danger" : "bg-warn"}`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-body font-medium text-fg">{item.label}</p>
                    {(item as { note?: string }).note && (
                      <p className="font-mono text-[11px] text-fg-3">{(item as { note?: string }).note}</p>
                    )}
                  </div>
                  <Link href={item.href} className="text-xs text-sky hover:text-sky/80 font-medium flex-shrink-0">
                    Resolve
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Quick actions */}
        <div className="bg-surface border border-border rounded-[14px]">
          <div className="px-6 pt-6 pb-[14px] border-b border-border">
            <p className="font-mono text-[10px] font-semibold tracking-widest uppercase text-fg-3">Quick actions</p>
          </div>
          <div className="p-6 grid grid-cols-2 gap-[10px]">
            {[
              { icon: Download, label: "Export logbook", href: "/logbook" },
              { icon: BookOpen, label: "View jumps", href: "/logbook" },
              { icon: Package, label: "Manage gear", href: "/gear" },
              { icon: Award, label: "Add certificate", href: "/settings" },
            ].map(({ icon: Icon, label, href }) => (
              <Link
                key={label}
                href={href}
                className="flex items-center gap-2.5 p-[14px] bg-surface-2 hover:bg-surface-3 rounded-[10px] transition-colors"
              >
                <Icon className="w-4 h-4 text-sky flex-shrink-0" />
                <span className="text-sm font-medium text-fg">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
