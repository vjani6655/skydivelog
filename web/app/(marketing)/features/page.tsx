import Link from "next/link"
import { BookOpen, BarChart2, Package, Award, Download } from "lucide-react"

const SECTIONS = [
  {
    label: "Logbook",
    icon: BookOpen,
    title: "Sign every jump in 30 seconds.",
    body: "Pre-fill DZ and aircraft. Tap-to-add tags. Draw your signature on the manifest line. Hand to your instructor for QR sign-off. Works offline — syncs when you're back in range.",
    illustration: "LOG · TEXTURE ILLUSTRATION",
    features: ["Aircraft & altitude", "Freefall & canopy times", "Drop zone & GPS", "Instructor QR sign-off", "Photos & notes", "Offline, auto-sync"],
  },
  {
    label: "Currency",
    icon: BarChart2,
    title: "Currency you can trust.",
    body: "A 30-day rolling window with custom thresholds for B, C, D and instructor ratings. Get a warning a week before you lapse — not after.",
    illustration: "CHART · FEATURE ILLUSTRATION",
    features: ["30-day rolling window", "Per-discipline tracking", "Custom thresholds", "Warning before lapse", "Dashboard overview"],
  },
  {
    label: "Gear",
    icon: Package,
    title: "Track every component.",
    body: "Rigs, canopies, AADs, reserves. Jumps-on, hours, repack and service due. Notifications fire 14 days before a repack — adjustable in settings.",
    illustration: "PARACHUTE · TEXTURE ILLUSTRATION",
    features: ["Container & canopy tracking", "Reserve & AAD history", "Repack reminders", "Wing loading calculator", "Service log"],
  },
  {
    label: "Certificates",
    icon: Award,
    title: "Certificates that never lapse silently.",
    body: "Add licences, ratings, and medicals. Multi-stage expiry warnings: 30d, 7d, day-of. Attach scanned PDFs for verification.",
    illustration: "CERT · TEXTURE ILLUSTRATION",
    features: ["All licence types", "Ratings & medicals", "30/7/1 day warnings", "Scan & attach PDFs", "Issuing body records"],
  },
  {
    label: "Export",
    icon: Download,
    title: "Your data, exportable forever.",
    body: "One-tap PDF in APF, USPA, CSPA or BPA layout. CSV for whatever else. Even cancelled accounts can still export for 30 days.",
    illustration: "CERT · TEXTURE ILLUSTRATION",
    features: ["APF, USPA, CSPA, BPA PDF", "Full CSV export", "Export after cancellation", "No lock-in, ever"],
  },
]

export default function FeaturesPage() {
  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section
        className="pt-20 pb-14 px-5"
        style={{ background: "radial-gradient(ellipse at 50% -10%, #132A50 0%, #0A1220 60%)" }}
      >
        <div className="max-w-3xl mx-auto">
          <p className="text-overline font-semibold tracking-widest uppercase text-fg-4 mb-4">Features</p>
          <h1 className="text-h1-lg font-bold text-fg tracking-tight mb-4 max-w-xl">Designed for licensed jumpers.</h1>
          <p className="text-base text-fg-3 max-w-lg">
            Built with feedback from APF, USPA and BPA jumpers. Every feature earns its keep — no filler.
          </p>
        </div>
      </section>

      {/* ── Feature sections ─────────────────────────────────────────── */}
      <section className="py-20 px-5">
        <div className="max-w-5xl mx-auto space-y-28">
          {SECTIONS.map(({ label, icon: Icon, title, body, illustration, features }, idx) => (
            <div key={label} className={`grid grid-cols-1 md:grid-cols-2 gap-10 items-center ${idx % 2 === 1 ? "md:grid-flow-dense" : ""}`}>
              {/* Illustration */}
              <div
                className={`rounded-xl border border-border overflow-hidden ${idx % 2 === 1 ? "md:col-start-2" : ""}`}
                style={{ height: 260, background: "repeating-linear-gradient(135deg, #1A2740 0 8px, #121C2E 8px 16px)" }}
              >
                <div className="flex items-end justify-center h-full pb-4">
                  <span className="text-overline font-semibold tracking-widest text-fg-4 uppercase">{illustration}</span>
                </div>
              </div>

              {/* Text */}
              <div className={idx % 2 === 1 ? "md:col-start-1 md:row-start-1" : ""}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 rounded-sm bg-sky/10 flex items-center justify-center">
                    <Icon className="w-3.5 h-3.5 text-sky" />
                  </div>
                  <p className="text-overline font-semibold tracking-widest uppercase text-sky">{label}</p>
                </div>
                <h2 className="text-h1 font-bold text-fg tracking-tight mb-3">{title}</h2>
                <p className="text-sm text-fg-3 leading-relaxed mb-6">{body}</p>
                <ul className="space-y-2">
                  {features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5">
                      <span className="text-ok text-xs font-bold">✓</span>
                      <span className="text-sm text-fg-2">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section className="py-16 px-5 bg-surface border-t border-border">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-8 flex-wrap">
          <div>
            <h2 className="text-h1 font-bold text-fg tracking-tight mb-2">Ready to jump in?</h2>
            <p className="text-sm text-fg-3">14-day free trial. No card required.</p>
          </div>
          <Link href="/signup" className="bg-sky text-on-sky font-semibold px-5 py-2.5 rounded-sm text-sm hover:bg-sky/90 transition-colors whitespace-nowrap">
            Start free trial
          </Link>
        </div>
      </section>
    </>
  )
}
