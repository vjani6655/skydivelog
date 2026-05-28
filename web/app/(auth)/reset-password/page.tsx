"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Lock, Eye, EyeOff, Check, X, AlertCircle } from "lucide-react"

function StrengthRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${ok ? "text-ok" : "text-fg-4"}`}>
      {ok ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
      {label}
    </span>
  )
}

export default function ResetPasswordPage() {
  const router = useRouter()
  const supabase = createClient()
  const [password, setPassword] = useState("")
  const [linkError, setLinkError] = useState<string | null>(null)
  const [sessionReady, setSessionReady] = useState(false)
  // True when arriving via implicit flow (#access_token in hash)
  const [awaitingRecovery, setAwaitingRecovery] = useState(false)

  useEffect(() => {
    // Check query params (PKCE error forwarded from callback)
    const qParams = new URLSearchParams(window.location.search)
    // Check hash (implicit flow direct redirect)
    const hParams = window.location.hash ? new URLSearchParams(window.location.hash.slice(1)) : null
    const errorCode = qParams.get("error_code") ?? hParams?.get("error_code") ?? null
    if (errorCode === "otp_expired") {
      setLinkError("Your password reset link has expired.")
    } else if (errorCode) {
      setLinkError("This reset link is invalid or has already been used.")
    }

    // If the hash contains an access_token it's an implicit-flow recovery redirect.
    // Wait for the PASSWORD_RECOVERY event before allowing form submission.
    if (hParams?.get("access_token") && hParams?.get("type") === "recovery") {
      setAwaitingRecovery(true)
    } else {
      // PKCE flow: session already set via callback cookie — form is ready immediately
      setSessionReady(true)
    }

    // Listen for PASSWORD_RECOVERY event (implicit flow: #access_token in hash)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setSessionReady(true)
    })
    return () => subscription.unsubscribe()
  // supabase is a stable createClient() instance — safe to omit from deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [confirm, setConfirm] = useState("")
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const checks = {
    length: password.length >= 8,
    mixedCase: /[a-z]/.test(password) && /[A-Z]/.test(password),
    numberOrSymbol: /[0-9!@#$%^&*()_+\-=[\]{};':"|,.<>/?]/.test(password),
  }
  const strength = Object.values(checks).filter(Boolean).length

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setError("Passwords do not match.")
      return
    }
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push("/dashboard")
      router.refresh()
    }
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-8">
      {linkError ? (
        <div className="text-center py-4">
          <div className="w-12 h-12 rounded-full bg-danger-bg flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6 text-danger" />
          </div>
          <h2 className="text-xl font-bold text-fg mb-2">Link expired.</h2>
          <p className="text-sm text-fg-3 mb-6">
            {linkError} Reset links are only valid for 60 minutes.
          </p>
          <Link
            href="/forgot-password"
            className="inline-flex items-center justify-center w-full bg-sky text-on-sky font-semibold rounded-sm py-2.5 text-sm hover:bg-sky/90 transition-colors"
          >
            Request a new link
          </Link>
        </div>
      ) : awaitingRecovery && !sessionReady ? (
        <div className="text-center py-8">
          <p className="text-sm text-fg-3">Setting up your reset session…</p>
        </div>
      ) : (
        <>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-fg tracking-tight mb-1.5">Choose a new password.</h1>
          <p className="text-sm text-fg-3">At least 8 characters.</p>
        </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-overline font-semibold tracking-widest uppercase text-fg-3 mb-1.5">
            New password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-4" />
            <input
              type={showPass ? "text" : "password"}
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-surface-2 border border-border rounded-sm pl-9 pr-10 py-2.5 text-sm text-fg placeholder:text-fg-4 focus:outline-none focus:border-sky transition-colors"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-4 hover:text-fg-2"
            >
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Strength bar */}
        {password.length > 0 && (
          <div className="space-y-2">
            <div className="flex gap-1 h-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={`flex-1 rounded-full transition-colors ${
                    i < strength
                      ? strength === 1
                        ? "bg-danger"
                        : strength === 2
                        ? "bg-warn"
                        : "bg-ok"
                      : "bg-surface-3"
                  }`}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <StrengthRow ok={checks.length} label="8+ chars" />
              <StrengthRow ok={checks.mixedCase} label="Mixed case" />
              <StrengthRow ok={checks.numberOrSymbol} label="Number or symbol" />
            </div>
          </div>
        )}

        <div>
          <label className="block text-overline font-semibold tracking-widest uppercase text-fg-3 mb-1.5">
            Confirm password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-4" />
            <input
              type={showConfirm ? "text" : "password"}
              required
              minLength={8}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full bg-surface-2 border border-border rounded-sm pl-9 pr-10 py-2.5 text-sm text-fg placeholder:text-fg-4 focus:outline-none focus:border-sky transition-colors"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-4 hover:text-fg-2"
            >
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
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
          {loading ? "Updating…" : "Update password"}
        </button>
      </form>
        </>
      )}
    </div>
  )
}
