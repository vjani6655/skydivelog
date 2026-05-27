import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-bg text-fg flex flex-col items-center justify-center px-5">
      {/* Parachute icon */}
      <div className="mb-8 text-[72px] select-none" aria-hidden>🪂</div>

      {/* Status code */}
      <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-sky mb-4">
        Error 404
      </p>

      {/* Headline */}
      <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-center mb-4 leading-tight">
        Uh oh — malfunction.
      </h1>

      {/* Subline */}
      <p className="text-base text-fg-3 text-center max-w-sm mb-10 leading-relaxed">
        This page doesn&apos;t exist. Time to pull your reserve and head somewhere safe.
      </p>

      {/* CTA */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 bg-sky text-white text-sm font-semibold px-5 py-2.5 rounded-sm hover:bg-sky/90 transition-colors"
      >
        Deploy reserve →
      </Link>
    </div>
  )
}
