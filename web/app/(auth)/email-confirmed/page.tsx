import Link from "next/link"
import { CheckCircle, Smartphone, LogIn } from "lucide-react"

export default function EmailConfirmedPage() {
  return (
    <div className="bg-surface border border-border rounded-xl p-8 text-center">
      {/* Icon */}
      <div className="w-14 h-14 rounded-full bg-ok-bg flex items-center justify-center mx-auto mb-6">
        <CheckCircle className="w-7 h-7 text-ok" />
      </div>

      <h1 className="text-3xl font-bold text-fg tracking-tight mb-1.5">Email confirmed.</h1>
      <p className="text-sm text-fg-3 mb-8">You&apos;re all set. Use the app or web to log in.</p>

      {/* Get the app */}
      <div className="bg-surface-2 border border-border rounded-lg p-5 text-left mb-4">
        <div className="flex items-start gap-3 mb-3">
          <Smartphone className="w-5 h-5 text-sky mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold tracking-widest uppercase text-fg-3 mb-0.5">Recommended: Get the app.</p>
            <p className="text-sm text-fg-2">Your logbook lives on your phone. Web is read-only.</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 mt-4">
          <a
            href="https://apps.apple.com/us/app/jump-logs/id6773196009"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 bg-fg text-bg font-semibold text-sm rounded-sm py-2.5 hover:bg-fg/90 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
            </svg>
            App Store
          </a>
          <a
            href="https://play.google.com/store/apps/details?id=app.skydivelog"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 bg-surface-3 border border-border text-fg font-semibold text-sm rounded-sm py-2.5 hover:bg-surface-3/80 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3.18 23.76A1.5 1.5 0 0 1 1.5 22.5V1.5A1.5 1.5 0 0 1 3.18.24l11.5 10.13a1.5 1.5 0 0 1 0 2.26L3.18 23.76zM5 4.12v15.76L14.3 12 5 4.12zM17.68 15.09l-2.5-2.2 2.5-2.2 2.5 2.2-2.5 2.2z" />
            </svg>
            Google Play
          </a>
        </div>
      </div>

      {/* Web login */}
      <div className="bg-surface-2 border border-border rounded-lg p-5 text-left">
        <div className="flex items-start gap-3">
          <LogIn className="w-5 h-5 text-fg-3 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-semibold tracking-widest uppercase text-fg-3 mb-0.5">Or continue on web.</p>
            <p className="text-sm text-fg-2 mb-3">Access your read-only logbook in the browser.</p>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 bg-surface-3 border border-border text-fg font-semibold text-sm rounded-sm px-4 py-2 hover:bg-surface-3/80 transition-colors"
            >
              Log in to web
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
