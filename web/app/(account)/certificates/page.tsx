export const dynamic = "force-dynamic"

import { createClient } from "@/lib/supabase/server"
import { Shield, AlertTriangle } from "lucide-react"
import CertificateActions from "./CertificateActions"

// ─── Types ───────────────────────────────────────────────────────────────────

interface CertRow {
  id: string
  category: "licence" | "rating" | "medical" | "other"
  title: string
  issuing_body: string
  issued_date: string
  expires_date: string | null
  reference_number: string | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function daysUntil(iso: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const exp = new Date(iso)
  exp.setHours(0, 0, 0, 0)
  return Math.round((exp.getTime() - today.getTime()) / 86400000)
}

function fmtMonthYear(iso: string) {
  return new Date(iso).toLocaleDateString("en-AU", { month: "short", year: "numeric" })
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" })
}

function ExpiryBadge({ iso }: { iso: string }) {
  const days = daysUntil(iso)
  if (days < 0) {
    return (
      <span className="inline-flex items-center gap-1 h-[22px] px-2 rounded-[5px] font-mono text-[10px] font-medium tracking-wide border bg-danger-bg text-danger border-danger/20">
        <AlertTriangle className="w-2.5 h-2.5" /> EXPIRED
      </span>
    )
  }
  const kind = days <= 30 ? "danger" : days <= 60 ? "warn" : "muted"
  const cls = {
    danger: "bg-danger-bg text-danger border-danger/20",
    warn:   "bg-warn-bg text-warn border-warn/20",
    muted:  "bg-surface-2 text-fg-3 border-border",
  }[kind]
  return (
    <span className={`inline-flex items-center h-[22px] px-2 rounded-[5px] font-mono text-[10px] font-medium tracking-wide border ${cls}`}>
      {days} D
    </span>
  )
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, count, sub, warn }: { label: string; count: number; sub: string; warn?: boolean }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-5">
      <p className="font-mono text-[10px] font-semibold tracking-widest uppercase text-fg-3">{label}</p>
      <p className="font-mono text-[30px] font-medium leading-none text-fg mt-2">{count}</p>
      <p className={`text-xs mt-1.5 ${warn && count > 0 ? "text-warn" : "text-fg-3"}`}>{sub}</p>
      {warn && count > 0 && (
        <p className={`font-mono text-[10px] font-medium text-warn mt-1`}>↓ −{count}</p>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function CertificatesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const uid = user!.id

  const { data: certsRaw } = await supabase
    .from("certificates")
    .select("id, category, title, issuing_body, issued_date, expires_date, reference_number")
    .eq("user_id", uid)
    .order("issued_date", { ascending: false })

  const certs = (certsRaw ?? []) as CertRow[]

  const licences = certs.filter((c) => c.category === "licence")
  const ratings  = certs.filter((c) => c.category === "rating")
  const medicals = certs.filter((c) => c.category === "medical")

  const expiring60 = certs.filter((c) => {
    if (!c.expires_date) return false
    const d = daysUntil(c.expires_date)
    return d >= 0 && d <= 60
  })
  const expired = certs.filter((c) => c.expires_date && daysUntil(c.expires_date) < 0)

  const statCards = [
    {
      label: "Licences",
      count: licences.length,
      sub: licences.length === 0 ? "None added" : licences.map((c) => c.title).slice(0, 2).join(" · "),
    },
    {
      label: "Ratings",
      count: ratings.length,
      sub: ratings.length === 0 ? "None added" : ratings.map((c) => c.title).slice(0, 3).join(" · "),
    },
    {
      label: "Medicals",
      count: medicals.length,
      sub: medicals.length === 0 ? "None added" : medicals.map((c) => c.title).slice(0, 2).join(" · "),
    },
    {
      label: "Expiring 60D",
      count: expiring60.length,
      sub: expiring60.length === 0 ? "All current" : expiring60.map((c) => c.title).slice(0, 2).join(" · "),
      warn: true,
    },
  ]

  const expiringCount = expiring60.length + expired.length

  return (
    <div className="max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] tracking-widest uppercase text-fg-3 mb-1">Certificates</p>
          <h1 className="text-[28px] font-bold text-fg tracking-tight leading-none">
            {certs.length} document{certs.length !== 1 ? "s" : ""}
            {expiringCount > 0 && (
              <span className="text-warn font-normal"> · {expiringCount} expiring soon</span>
            )}
          </h1>
        </div>
        <CertificateActions />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((s) => (
          <StatCard key={s.label} label={s.label} count={s.count} sub={s.sub} warn={s.warn} />
        ))}
      </div>

      {/* Table */}
      {certs.length === 0 ? (
        <div className="bg-surface border border-border rounded-[14px] p-12 text-center">
          <Shield className="w-10 h-10 text-fg-4 mx-auto mb-3" />
          <p className="text-base font-medium text-fg-2 mb-1">No certificates added yet</p>
          <p className="text-sm text-fg-3">Track your licences, ratings and medicals here.</p>
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-[14px] overflow-hidden">
          {/* Column headers */}
          <div className="grid grid-cols-[auto_1fr_140px_120px_100px_120px_40px] items-center gap-4 px-5 py-3 border-b border-border">
            <div className="w-8" />
            <p className="font-mono text-[10px] tracking-widest uppercase text-fg-4">Certificate</p>
            <p className="font-mono text-[10px] tracking-widest uppercase text-fg-4">Category</p>
            <p className="font-mono text-[10px] tracking-widest uppercase text-fg-4">Issuing body</p>
            <p className="font-mono text-[10px] tracking-widest uppercase text-fg-4">Issued</p>
            <p className="font-mono text-[10px] tracking-widest uppercase text-fg-4">Expires</p>
            <div />
          </div>

          {/* Rows */}
          <div className="divide-y divide-border">
            {certs.map((c) => {
              const isExpired   = c.expires_date ? daysUntil(c.expires_date) < 0 : false
              const isExpiring  = c.expires_date ? daysUntil(c.expires_date) <= 60 && !isExpired : false
              return (
                <div
                  key={c.id}
                  className="grid grid-cols-[auto_1fr_140px_120px_100px_120px_40px] items-center gap-4 px-5 py-3.5 hover:bg-surface-2 transition-colors"
                >
                  {/* Icon */}
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    isExpired ? "bg-danger-bg" : isExpiring ? "bg-warn-bg" : "bg-sky-bg"
                  }`}>
                    <Shield className={`w-4 h-4 ${isExpired ? "text-danger" : isExpiring ? "text-warn" : "text-sky"}`} />
                  </div>

                  {/* Title */}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-fg truncate">{c.title}</p>
                    {c.reference_number && (
                      <p className="font-mono text-[10px] text-fg-4 mt-0.5">{c.reference_number}</p>
                    )}
                  </div>

                  {/* Category */}
                  <p className="text-sm text-fg-2 capitalize">{c.category}</p>

                  {/* Issuing body */}
                  <p className="text-sm text-fg-2">{c.issuing_body}</p>

                  {/* Issued */}
                  <p className="font-mono text-xs text-fg-3">{fmtMonthYear(c.issued_date)}</p>

                  {/* Expires */}
                  <div className="flex items-center gap-2">
                    {c.expires_date ? (
                      <>
                        <span className="font-mono text-xs text-fg-2">{fmtDate(c.expires_date)}</span>
                        <ExpiryBadge iso={c.expires_date} />
                      </>
                    ) : (
                      <span className="inline-flex items-center h-[22px] px-2 rounded-[5px] font-mono text-[10px] font-medium tracking-wide border bg-surface-2 text-fg-3 border-border">
                        NO EXPIRY
                      </span>
                    )}
                  </div>

                  {/* Menu */}
                  <button className="w-7 h-7 flex items-center justify-center rounded-md text-fg-4 hover:text-fg hover:bg-surface-3 transition-colors">
                    <span className="text-lg leading-none">···</span>
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
