import Link from "next/link"

export default function AboutPage() {
  return (
    <>
      <section
        className="pt-20 pb-14 px-5 text-center"
        style={{ background: "radial-gradient(ellipse at 50% -10%, #132A50 0%, #0A1220 60%)" }}
      >
        <div className="max-w-2xl mx-auto">
          <p className="text-overline font-semibold tracking-widest uppercase text-fg-4 mb-3">About</p>
          <h1 className="text-h1-lg font-bold text-fg tracking-tight mb-4 text-balance">
            A logbook by jumper, for jumpers.
          </h1>
          <p className="text-base text-fg-3 max-w-lg mx-auto">
            Jump Logs was built out of frustration with paper logbooks, USB sticks, and spreadsheets that don&apos;t travel.
          </p>
        </div>
      </section>

      <section className="py-16 px-5">
        <div className="max-w-3xl mx-auto space-y-12">
          <div>
            <h2 className="text-xl font-bold text-fg mb-4">Built in the open.</h2>
            <p className="text-sm text-fg-3 leading-relaxed mb-6">
              We believe your logbook data belongs to you — always. That means no lock-in, no paywalled exports, and no
              selling your information to third parties.
            </p>

            <div className="bg-surface border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-4 py-3 text-overline font-semibold tracking-widest text-fg-4">Commitment</th>
                    <th className="px-4 py-3 text-overline font-semibold tracking-widest text-fg-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[
                    { label: "No ads", status: "Always" },
                    { label: "No data sale", status: "Always" },
                    { label: "Open export", status: "PDF + CSV" },
                    { label: "Open API", status: "Planned" },
                  ].map(({ label, status }) => (
                    <tr key={label}>
                      <td className="px-4 py-3 text-fg">{label}</td>
                      <td className="px-4 py-3 text-ok font-medium text-xs">{status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold text-fg mb-3">Why $12?</h2>
            <p className="text-sm text-fg-3 leading-relaxed">
              We keep the price low because we want every jumper to have access to a proper logbook, regardless of how many
              jumps they have. Twelve dollars covers hosting, development, and support — nothing more.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-fg mb-3">Get in touch.</h2>
            <p className="text-sm text-fg-3 leading-relaxed mb-4">
              Questions, feedback, or just want to say hi?
            </p>
            <Link href="/contact" className="text-sm text-sky hover:text-sky/80">
              Contact us →
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
