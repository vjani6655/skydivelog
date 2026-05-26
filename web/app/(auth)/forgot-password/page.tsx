"use client"

import { useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Mail, ArrowLeft, CheckCircle } from "lucide-react"

export default function ForgotPasswordPage() {
  const supabase = createClient()
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSent(true)
    }
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-8">
      {sent ? (
        <div className="text-center py-4">
          <div className="w-12 h-12 rounded-full bg-ok-bg flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-6 h-6 text-ok" />
          </div>
          <h2 className="text-xl font-bold text-fg mb-2">Check your inbox.</h2>
          <p className="text-sm text-fg-3 mb-6">
            We sent a reset link to <span className="text-fg">{email}</span>.
          </p>
          <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-sky hover:text-sky/80">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to sign in
          </Link>
        </div>
      ) : (
        <>
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-fg tracking-tight mb-1.5">Forgot password?</h1>
            <p className="text-sm text-fg-3">We&apos;ll send a reset link to your inbox.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-overline font-semibold tracking-widest uppercase text-fg-3 mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-4" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-surface-2 border border-border rounded-sm pl-9 pr-4 py-2.5 text-sm text-fg placeholder:text-fg-4 focus:outline-none focus:border-sky transition-colors"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            {error && (
              <p className="text-xs text-danger bg-danger-bg border border-danger/20 rounded-sm px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-sky text-on-sky font-semibold rounded-sm py-2.5 text-sm hover:bg-sky/90 disabled:opacity-50 transition-colors"
            >
              {loading ? "Sending…" : "Send reset link"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-sky hover:text-sky/80">
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to sign in
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
