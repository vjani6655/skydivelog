import Link from "next/link"
import Image from "next/image"
import { createAdminClient } from "@/lib/supabase/admin"

async function getTeamPhoto(): Promise<string | null> {
  try {
    const db = createAdminClient()
    const { data } = await db
      .from("app_media")
      .select("url")
      .eq("slot", "about-team")
      .maybeSingle()
    return data?.url ?? null
  } catch {
    return null
  }
}

export default async function AboutPage() {
  const teamPhotoUrl = await getTeamPhoto()

  return (
    <>
      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="pt-20 pb-14 px-5">
        <div className="max-w-5xl mx-auto">
          <p className="text-overline font-semibold tracking-widest uppercase text-fg-4 mb-4">About</p>
          <h1 className="text-h1-lg font-bold text-fg tracking-tight mb-5 max-w-2xl">
            A logbook by jumpers, for jumpers.
          </h1>
          <p className="text-base text-fg-3 max-w-xl leading-relaxed">
            We started JumpLogs after carrying a soggy paper logbook through too many wet manifests.
            The idea was simple: build something we&apos;d want on the DZ — fast, honest, no marketing junk.
          </p>
        </div>
      </section>

      {/* ── Two-column: team photo + Built in the open ────────────────── */}
      <section className="pb-20 px-5">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-start">

          {/* Team photo */}
          <div
            className="w-full rounded-xl overflow-hidden border border-border relative"
            style={{ aspectRatio: "4/3" }}
          >
            {teamPhotoUrl ? (
              <Image
                src={teamPhotoUrl}
                alt="Jump Logs team at the dropzone"
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <div
                className="absolute inset-0 flex items-end p-4"
                style={{
                  background: "repeating-linear-gradient(135deg, #1A2740 0 8px, #121C2E 8px 16px)",
                }}
              >
                <span className="font-mono text-[10px] text-fg-4 tracking-widest uppercase">
                  Team · Candid DZ Photo
                </span>
              </div>
            )}
          </div>

          {/* Built in the open */}
          <div className="space-y-5">
            <div>
              <h2 className="text-2xl font-bold text-fg mb-3">Built in the open.</h2>
              <p className="text-sm text-fg-3 leading-relaxed">
                Two people. Both jumpers. We publish a public roadmap, ship every two weeks, and
                answer support emails ourselves.
              </p>
            </div>
            <p className="text-sm text-fg-3 leading-relaxed">
              We do not raise venture capital. We are not for sale. The price is $12 and it will stay
              that way.
            </p>

            {/* Commitments */}
            <div className="bg-surface border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <p className="text-overline font-semibold tracking-widest uppercase text-fg-4 text-[10px]">
                  Our commitments
                </p>
              </div>
              <div className="divide-y divide-border">
                {[
                  { label: "No ads",       detail: "Anywhere. Ever." },
                  { label: "No data sale", detail: "Your jumps are yours." },
                  { label: "Open export",  detail: "PDF + CSV, always free." },
                  { label: "Open API",     detail: "Public, documented, rate-limited." },
                ].map(({ label, detail }) => (
                  <div key={label} className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm font-medium text-fg">{label}</span>
                    <span className="text-xs text-fg-3">{detail}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Why $12 + Contact ─────────────────────────────────────────── */}
      <section className="border-t border-border py-16 px-5">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">
          <div>
            <h2 className="text-xl font-bold text-fg mb-3">Why $12?</h2>
            <p className="text-sm text-fg-3 leading-relaxed">
              We keep the price low because we want every jumper to have access to a proper logbook,
              regardless of how many jumps they have. Twelve dollars covers hosting, development, and
              support — nothing more.
            </p>
          </div>
          <div>
            <h2 className="text-xl font-bold text-fg mb-3">Get in touch.</h2>
            <p className="text-sm text-fg-3 leading-relaxed mb-4">
              Questions, feedback, or just want to say hi?
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center gap-1 text-sm font-medium text-sky hover:text-sky/80 transition-colors"
            >
              Contact us →
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
