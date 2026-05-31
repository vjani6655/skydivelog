import type { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import { createAdminClient } from "@/lib/supabase/admin"
import { BookOpen, BarChart2, Package, Award, Download, Shield } from "lucide-react"
import AppStoreButtons from "@/components/marketing/AppStoreButtons"
import HomeJsonLd from "@/components/HomeJsonLd"

export const metadata: Metadata = {
  title: "Jump Logs — The Skydiving Logbook App",
  description: "Track every jump, manage gear repacks, monitor currency, and export your logbook as PDF. The modern skydiving logbook for iOS & Android.",
  alternates: { canonical: "https://jumplogs.com" },
  openGraph: {
    url: "https://jumplogs.com",
    title: "Jump Logs — The Skydiving Logbook App",
    description: "Track every jump, manage gear repacks, monitor currency, and export your logbook as PDF. The modern skydiving logbook for iOS & Android.",
  },
}

async function getMedia(slot: string): Promise<string | null> {
  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from("app_media")
      .select("url")
      .eq("slot", slot)
      .maybeSingle()
    return data?.url ?? null
  } catch {
    return null
  }
}

async function getStats() {
  try {
    const supabase = createAdminClient()
    const [jumpsRes, usersRes, ffRes, dzRes] = await Promise.all([
      supabase.from("jumps").select("*", { count: "exact", head: true }).is("deleted_at", null),
      supabase.from("users").select("*", { count: "exact", head: true }),
      supabase.from("jumps").select("freefall_seconds").is("deleted_at", null),
      supabase.from("jumps").select("dropzone_id").is("deleted_at", null).not("dropzone_id", "is", null),
    ])
    const totalJumps = jumpsRes.count ?? 0
    const totalUsers = usersRes.count ?? 0
    const totalFF = (ffRes.data ?? []).reduce((s: number, j: { freefall_seconds: number | null }) => s + (j.freefall_seconds ?? 0), 0)
    const hoursFF = Math.floor(totalFF / 3600)
    const uniqueDZs = new Set((dzRes.data ?? []).map((r: { dropzone_id: string }) => r.dropzone_id)).size
    return { totalJumps, totalUsers, hoursFF, uniqueDZs }
  } catch {
    return { totalJumps: 0, totalUsers: 0, hoursFF: 0, uniqueDZs: 0 }
  }
}

function fmtNumber(n: number) {
  return n.toLocaleString()
}

const FEATURES = [
  { icon: BookOpen,  title: "Sign jumps on the dropzone",   body: "Step-by-step entry, instructor sign-off via QR. Works offline." },
  { icon: BarChart2, title: "Track currency & progress",    body: "Auto-rolling 30-day window, custom alerts, never lapse without warning." },
  { icon: Package,   title: "Gear & repack tracking",       body: "AAD service, reserve repacks, jumps per canopy. Alerts before you need them." },
  { icon: Award,     title: "Certificates & medicals",      body: "Licences, ratings, medicals — expiry tracking with multi-stage warnings." },
  { icon: Download,  title: "Export your logbook",          body: "PDF (1-per-page or 10-per-page) and CSV. Your data, always yours." },
  { icon: Shield,    title: "Yours, forever",               body: "Cancel any time — keep a full export. We never sell data." },
]

export default async function HomePage() {
  const [stats, appBannerUrl, heroBgUrl] = await Promise.all([
    getStats(),
    getMedia('marketing_app_banner'),
    getMedia('hero-bg'),
  ])

  return (
    <>
      <HomeJsonLd />
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="force-dark relative pt-24 pb-20 px-5 overflow-hidden hero-gradient">
        {/* Background photo + gradient overlay */}
        {heroBgUrl && (
          <>
            <Image
              src={heroBgUrl}
              alt=""
              fill
              className="object-cover object-left md:object-center"
              unoptimized
              priority
            />
            {/* Solid bg left → transparent right — text sits fully in the solid zone */}
            <div
              className="absolute inset-0"
              style={{ background: "linear-gradient(to right, var(--c-bg) 45%, rgba(var(--c-bg-raw), 0.85) 55%, transparent 72%)" }}
            />
          </>
        )}
        <div className="relative max-w-5xl ml-[6%] mr-auto">
          {/* Left column — all text stays within this so it never touches the photo */}
          <div className="max-w-[520px]">
            <div className="mb-6 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 border border-border rounded-pill px-3 py-1 text-overline font-semibold tracking-widest text-fg-3 uppercase">
                V 2.4 · iOS &amp; Android
              </span>
              <span className="inline-flex items-center gap-2 border border-sky/40 bg-sky/5 rounded-pill px-3 py-1 text-overline font-bold tracking-widest uppercase text-sky">
                <span className="w-1.5 h-1.5 rounded-full bg-sky animate-pulse" />
                App launching June 2026
              </span>
            </div>

            <h1 className="text-hero font-bold tracking-tight mb-5 leading-none">
              <span className="text-fg block">Every jump.</span>
              <span className="text-fg-3 block">Forever logged.</span>
            </h1>

            <p className="text-base text-fg-3 mb-8 leading-relaxed">
              Jump Logs is the digital logbook built for licensed jumpers. Sign every jump in your pocket, track gear and currency, never miss a repack.
            </p>

            <div className="flex items-center gap-3 flex-wrap mb-4">
              <Link href="/signup" className="bg-sky text-on-sky font-semibold px-5 py-2.5 rounded-sm text-sm hover:bg-sky/90 transition-colors">
                Start free trial
              </Link>
              <Link href="/features" className="border border-border-strong text-fg-2 font-medium px-5 py-2.5 rounded-sm text-sm hover:bg-surface-2 hover:text-fg transition-colors">
                See features
              </Link>
            </div>
            <p className="text-overline text-fg-4 tracking-widest uppercase mb-5">$12 / year · Cancel any time</p>

            {/* ── App store buttons ── */}
            <AppStoreButtons />
          </div>{/* end left column */}
        </div>
      </section>

      {/* ── Stats bar ────────────────────────────────────────────────── */}
      <section className="border-y border-border bg-surface">
        <div className="max-w-5xl mx-auto px-5 py-6 flex items-center justify-between gap-4 flex-wrap">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 flex-1">
            {[
              { label: "Total jumps logged",   sublabel: "across the platform",  value: fmtNumber(stats.totalJumps) },
              { label: "Registered jumpers",   sublabel: "126 countries",         value: fmtNumber(stats.totalUsers) },
              { label: "Hours of freefall",    sublabel: "and counting",          value: fmtNumber(stats.hoursFF) },
              { label: "DZs represented",      sublabel: "from 10 to 1,500",      value: fmtNumber(stats.uniqueDZs) },
            ].map(({ label, sublabel, value }) => (
              <div key={label}>
                <p className="text-overline font-semibold tracking-widest uppercase text-fg-4 mb-1">{label}</p>
                <p className="text-3xl font-bold text-fg tracking-tight">{value}</p>
                <p className="text-xs text-fg-4 mt-0.5">{sublabel}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-ok" />
            <span className="text-overline font-semibold tracking-widest uppercase text-ok">Live</span>
          </div>
        </div>
      </section>

      {/* ── The App section ──────────────────────────────────────────── */}
      <section className="py-20 px-5">
        <div className="max-w-5xl mx-auto">
          <p className="text-overline font-semibold tracking-widest uppercase text-fg-4 mb-4">The app</p>
          <h2 className="text-h1-lg font-bold text-fg tracking-tight mb-3 max-w-xl">Built like cockpit instruments.</h2>
          <p className="text-base text-fg-3 mb-10 max-w-md">Clear at a glance. Honest about your data. No gimmicks, no ads, no upsells.</p>
          <div
            className="w-full rounded-xl overflow-hidden border border-border relative"
            style={{
              height: 480,
              background: appBannerUrl ? undefined : "repeating-linear-gradient(135deg, #1A2740 0 8px, #121C2E 8px 16px)",
            }}
          >
            {appBannerUrl ? (
              <Image
                src={appBannerUrl}
                alt="Jump Logs app screens"
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="flex items-end justify-center h-full pb-4">
                <span className="text-overline font-semibold tracking-widest text-fg-4 uppercase">3 Phone mockups · Log · Stats · Gear</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Feature grid ─────────────────────────────────────────────── */}
      <section className="pb-20 px-5">
        <div className="max-w-5xl mx-auto">
          <p className="text-overline font-semibold tracking-widest uppercase text-fg-4 mb-3">What&apos;s in it</p>
          <h2 className="text-h1-lg font-bold text-fg tracking-tight mb-10">One subscription. Every feature.</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="bg-surface border border-border rounded-lg p-5">
                <div className="w-8 h-8 rounded-sm bg-sky/10 flex items-center justify-center mb-4">
                  <Icon className="w-4 h-4 text-sky" />
                </div>
                <h3 className="text-sm font-semibold text-fg mb-1">{title}</h3>
                <p className="text-xs text-fg-3 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing CTA ──────────────────────────────────────────────── */}
      <section className="py-14 px-5 border-t border-border bg-surface-2">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-8 flex-wrap">
          <div>
            <p className="text-overline font-semibold tracking-widest uppercase text-fg-4 mb-2">Pricing</p>
            <p className="text-display-sm font-bold text-fg mb-2">$12 a year.</p>
            <p className="text-sm text-fg-3 max-w-xs">
              That&apos;s it. Same price for every feature. One-tap to cancel. Renewal reminder a month before.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <Link href="/signup" className="bg-sky text-on-sky font-semibold px-5 py-2.5 rounded-sm text-sm hover:bg-sky/90 transition-colors whitespace-nowrap">
              Get Jump Logs
            </Link>
            <Link href="/pricing" className="border border-border text-fg-2 font-medium px-5 py-2.5 rounded-sm text-sm hover:bg-surface hover:text-fg transition-colors whitespace-nowrap">
              Compare to others
            </Link>
          </div>
        </div>
      </section>

      {/* ── App Store downloads ──────────────────────────────────────── */}
      <section className="py-14 px-5 border-t border-border">
        <div className="max-w-5xl mx-auto flex flex-col items-center gap-4 text-center">
          <p className="text-overline font-semibold tracking-widest uppercase text-fg-4">Coming soon</p>
          <h3 className="text-h2 font-bold text-fg">The app is launching June 2026</h3>
          <p className="text-sm text-fg-3 max-w-xs">Be first to know when it drops — enter your email and we&apos;ll notify you at launch.</p>
          <AppStoreButtons />
        </div>
      </section>
    </>
  )
}
