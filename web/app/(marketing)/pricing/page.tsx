import Link from "next/link"
import { Check } from "lucide-react"

const FEATURES = [
  "Unlimited jump logs",
  "Full statistics & currency tracking",
  "Gear & repack tracking",
  "Certificates & medicals",
  "PDF & CSV export",
  "iOS & Android apps",
  "Offline support",
  "Your data, always exportable",
]

const FAQ = [
  {
    q: "What happens when my trial ends?",
    a: "We\'ll remind you a few days before. You can subscribe for $12/year or export your data and leave — no pressure.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancel from your subscription page. Your data stays accessible until the end of your billing period, then you can export it.",
  },
  {
    q: "Is my data safe?",
    a: "Yes. We use Supabase (backed by AWS) with row-level security. We never sell your data.",
  },
  {
    q: "What if I already have a paper logbook?",
    a: "You can add historical jumps manually. Many users backfill their most recent jumps and start fresh from there.",
  },
]

export default function PricingPage() {
  return (
    <>
      <section
        className="pt-20 pb-14 px-5 text-center hero-gradient"
      >
        <div className="max-w-xl mx-auto">
          <p className="text-overline font-semibold tracking-widest uppercase text-fg-4 mb-3">Pricing</p>
          <h1 className="text-h1-lg font-bold text-fg tracking-tight mb-3">One price. Forever.</h1>
          <p className="text-base text-fg-3">No tiers, no add-ons, no surprise upgrade prompts.</p>
        </div>
      </section>

      <section className="py-16 px-5">
        <div className="max-w-md mx-auto">
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="px-6 pt-6 pb-5 border-b border-border">
              <p className="text-overline font-semibold tracking-widest uppercase text-fg-4 mb-1">
                Jump Logs Pro · Billed annually
              </p>
              <div className="flex items-baseline gap-1 mt-3 mb-1">
                <span className="text-display-sm font-bold text-fg">$12</span>
                <span className="text-lg text-fg-3">/ year</span>
              </div>
              <p className="text-xs text-fg-4">Less than a cup of coffee per year.</p>
            </div>

            <ul className="px-6 py-5 space-y-2.5 border-b border-border">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2.5">
                  <Check className="w-3.5 h-3.5 text-ok flex-shrink-0" />
                  <span className="text-sm text-fg-2">{f}</span>
                </li>
              ))}
            </ul>

            <div className="px-6 py-5">
              <Link
                href="/signup"
                className="block w-full text-center bg-sky text-on-sky font-semibold py-3 rounded-sm hover:bg-sky/90 transition-colors"
              >
                Subscribe — $12
              </Link>
              <p className="text-xs text-center text-fg-4 mt-3">Cancel any time · your data stays yours</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 px-5 border-t border-border">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-fg mb-8 text-center">Frequently asked</h2>
          <div className="space-y-4">
            {FAQ.map(({ q, a }) => (
              <div key={q} className="bg-surface border border-border rounded-lg p-5">
                <h3 className="text-sm font-semibold text-fg mb-2">{q}</h3>
                <p className="text-xs text-fg-3 leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
