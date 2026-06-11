"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import { Check, Loader2 } from "lucide-react"

const FEATURES = [
  "Unlimited jump logs",
  "Full statistics & currency tracking",
  "Gear & repack tracking",
  "Certificates & medicals",
  "PDF & CSV export",
  "iOS & Android apps",
  "Offline support",
]

export default function SubscribePage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCheckout = async () => {
    setCheckoutLoading(true)
    setError(null)
    const res = await fetch("/api/stripe/create-checkout", { method: "POST" })
    const data = await res.json()
    if (data.url) {
      window.location.href = data.url
    } else {
      setError(data.error ?? "Something went wrong. Please try again.")
      setCheckoutLoading(false)
    }
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const loggedIn = !!data.user
      setIsLoggedIn(loggedIn)
      setLoading(false)
      if (loggedIn) {
        handleCheckout()
      }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading || (isLoggedIn && !error)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-fg-4 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-5 py-20">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-overline font-semibold tracking-widest uppercase text-fg-4 mb-2">Subscribe</p>
          <h1 className="text-3xl font-bold text-fg tracking-tight mb-2">Jump Logs Pro</h1>
          <p className="text-2xl font-semibold text-sky">$12 <span className="text-base font-normal text-fg-3">/ year</span></p>
        </div>

        <div className="bg-surface border border-border rounded-xl p-6 mb-6">
          <ul className="space-y-3">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-3 text-sm text-fg-2">
                <Check className="w-4 h-4 text-green-500 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        {error && (
          <p className="text-xs text-danger bg-danger-bg border border-danger/20 rounded-sm px-3 py-2 mb-4">{error}</p>
        )}

        {isLoggedIn ? (
          <button
            onClick={handleCheckout}
            disabled={checkoutLoading}
            className="w-full bg-sky text-on-sky font-semibold rounded-md py-3 text-sm hover:bg-sky/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {checkoutLoading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Redirecting to checkout…</>
              : "Subscribe now · $12/yr"}
          </button>
        ) : (
          <div className="space-y-3">
            <Link
              href="/login?next=/subscribe"
              className="w-full bg-sky text-on-sky font-semibold rounded-md py-3 text-sm hover:bg-sky/90 transition-colors flex items-center justify-center"
            >
              Sign in to subscribe
            </Link>
            <Link
              href="/signup?next=/subscribe"
              className="w-full bg-surface border border-border text-fg font-medium rounded-md py-3 text-sm hover:border-fg-3 transition-colors flex items-center justify-center"
            >
              Create an account
            </Link>
          </div>
        )}

        <p className="text-center text-xs text-fg-4 mt-4">
          Cancel anytime · Secure payment via Stripe
        </p>
      </div>
    </div>
  )
}
