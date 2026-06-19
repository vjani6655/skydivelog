'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

const APP_STORE_URL = 'https://apps.apple.com/us/app/jump-logs/id6773196009'

export default function AppStoreButtons() {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setState('loading')
    setErrorMsg('')
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const json = await res.json()
      if (!res.ok) {
        setErrorMsg(json.error ?? 'Something went wrong.')
        setState('error')
      } else {
        setState('done')
      }
    } catch {
      setErrorMsg('Network error. Please try again.')
      setState('error')
    }
  }

  return (
    <>
      {/* ── Store buttons ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <a
          href={APP_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 border border-border rounded-lg px-4 py-2.5 hover:bg-surface-2 transition-colors"
        >
          <svg className="w-5 h-5 text-fg-2 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
          </svg>
          <div className="text-left">
            <p className="text-micro font-semibold tracking-widest uppercase text-fg-4">Download on</p>
            <p className="text-sm font-semibold text-fg">App Store</p>
          </div>
        </a>
        <button
          onClick={() => { setOpen(true); setState('idle'); setEmail(''); setErrorMsg('') }}
          className="flex items-center gap-3 border border-border rounded-lg px-4 py-2.5 hover:bg-surface-2 transition-colors"
        >
          <svg className="w-5 h-5 text-fg-2 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3.18 23.76c.37.21.8.22 1.2.03l11.4-6.37-2.5-2.5-10.1 8.84zM.5 1.6C.19 1.99.01 2.56.01 3.27v17.46c0 .71.18 1.28.49 1.67l.09.08 9.78-9.78v-.23L.59 1.52.5 1.6zM20.12 9.82l-2.64-1.47L14.92 11l2.56 2.56 2.64-1.48c.75-.42.75-1.84 0-2.26zm-17-8.02l10.1 8.84 2.5-2.5L4.38.03c-.4-.19-.83-.18-1.2.03l-.06-.26z"/>
          </svg>
          <div className="text-left">
            <p className="text-micro font-semibold tracking-widest uppercase text-fg-4">Coming soon</p>
            <p className="text-sm font-semibold text-fg">Google Play</p>
          </div>
        </button>
      </div>

      {/* ── Android waitlist modal ── */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/70 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative bg-surface border border-border rounded-xl p-8 max-w-sm w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 text-fg-4 hover:text-fg transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            {state === 'done' ? (
              <div className="text-center py-4">
                <div className="w-12 h-12 rounded-full bg-ok/10 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-ok" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-fg mb-2">You&apos;re on the list!</h3>
                <p className="text-sm text-fg-3">We&apos;ll email you the moment Jump Logs hits Google Play.</p>
              </div>
            ) : (
              <>
                <div className="inline-flex items-center gap-2 border border-sky/30 bg-sky/5 rounded-pill px-3 py-1 mb-5">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky animate-pulse" />
                  <span className="text-overline font-semibold tracking-widest uppercase text-sky">Android Coming Soon</span>
                </div>

                <h3 className="text-xl font-bold text-fg mb-2">Android is on the way</h3>
                <p className="text-sm text-fg-3 mb-6 leading-relaxed">
                  Jump Logs is live on iOS — Android is coming soon. Enter your email and we&apos;ll notify you when it hits Google Play.
                </p>

                <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                  <input
                    type="email"
                    required
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-surface-2 border border-border rounded-sm px-4 py-2.5 text-sm text-fg placeholder-fg-4 focus:outline-none focus:border-sky transition-colors"
                  />
                  {state === 'error' && (
                    <p className="text-xs text-error">{errorMsg}</p>
                  )}
                  <button
                    type="submit"
                    disabled={state === 'loading'}
                    className="w-full bg-sky text-on-sky font-semibold px-5 py-2.5 rounded-sm text-sm hover:bg-sky/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {state === 'loading' ? 'Signing up…' : 'Notify me at launch'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
