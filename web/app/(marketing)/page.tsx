import Link from "next/link"
import Image from "next/image"
import { createAdminClient } from "@/lib/supabase/admin"
import { BookOpen, BarChart2, Package, Award, Download, Shield } from "lucide-react"

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
  const [stats, appBannerUrl] = await Promise.all([
    getStats(),
    getMedia('marketing_app_banner'),
  ])

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section
        className="pt-24 pb-20 px-5 hero-gradient"
      >
        <div className="max-w-3xl mx-auto">
          <div className="mb-6">
            <span className="inline-flex items-center gap-2 border border-border rounded-pill px-3 py-1 text-overline font-semibold tracking-widest text-fg-3 uppercase">
              V 2.4 · iOS &amp; Android
            </span>
          </div>

          <h1 className="text-hero font-bold tracking-tight mb-5 leading-none">
            <span className="text-fg block">Every jump.</span>
            <span className="text-fg-3 block">Forever logged.</span>
          </h1>

          <p className="text-base text-fg-3 mb-8 max-w-sm leading-relaxed">
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
          <p className="text-overline text-fg-4 tracking-widest uppercase">$12 / year · Cancel any time</p>
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
              height: 280,
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
      <section className="py-12 px-5 border-t border-border flex items-center justify-center gap-4">
        <a href="#" className="flex items-center gap-3 border border-border rounded-lg px-4 py-2.5 hover:bg-surface-2 transition-colors">
          <svg className="w-5 h-5 text-fg-2" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
          </svg>
          <div>
            <p className="text-micro font-semibold tracking-widest uppercase text-fg-4">Download on</p>
            <p className="text-sm font-semibold text-fg">App Store</p>
          </div>
        </a>
        <a href="#" className="flex items-center gap-3 border border-border rounded-lg px-4 py-2.5 hover:bg-surface-2 transition-colors">
          <svg className="w-5 h-5 text-fg-2" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3.18 23.76c.37.21.8.22 1.2.03l11.4-6.37-2.5-2.5-10.1 8.84zM.5 1.6C.19 1.99.01 2.56.01 3.27v17.46c0 .71.18 1.28.49 1.67l.09.08 9.78-9.78v-.23L.59 1.52.5 1.6zM20.12 9.82l-2.64-1.47L14.92 11l2.56 2.56 2.64-1.48c.75-.42.75-1.84 0-2.26zm-17-8.02l10.1 8.84 2.5-2.5L4.38.03c-.4-.19-.83-.18-1.2.03l-.06-.26z"/>
          </svg>
          <div>
            <p className="text-micro font-semibold tracking-widest uppercase text-fg-4">Available on</p>
            <p className="text-sm font-semibold text-fg">Google Play</p>
          </div>
        </a>
      </section>
    </>
  )
}
