"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Lock, Eye, EyeOff, Check, X, AlertCircle, ShieldCheck } from "lucide-react"

function StrengthRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${ok ? "text-ok" : "text-fg-4"}`}>
      {ok ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
      {label}
    </span>
  )
}

export default function ResetPasswordPage() {
  const supabase = createClient()
  const [password, setPassword] = useState("")
  const [linkError, setLinkError] = useState<string | null>(null)
  const [sessionReady, setSessionReady] = useState(false)
  const [awaitingRecovery, setAwaitingRecovery] = useState(false)
  // MFA state
  const [needsMfa, setNeedsMfa] = useState(false)
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null)
  const [mfaCode, setMfaCode] = useState("")
  const [mfaError, setMfaError] = useState<string | null>(null)
  const [mfaLoading, setMfaLoading] = useState(false)

  const checkMfaRequired = async () => {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    if (aal && aal.nextLevel === 'aal2' && aal.currentLevel !== 'aal2') {
      // User has MFA enabled — need to verify before password update
      const { data: factors } = await supabase.auth.mfa.listFactors()
      const totp = factors?.totp?.[0]
      if (totp) {
        setMfaFactorId(totp.id)
        setNeedsMfa(true)
      }
    }
  }

  useEffect(() => {
    const qParams = new URLSearchParams(window.location.search)
    const hParams = window.location.hash ? new URLSearchParams(window.location.hash.slice(1)) : null
    const errorCode = qParams.get("error_code") ?? hParams?.get("error_code") ?? null
    if (errorCode === "otp_expired") {
      setLinkError("Your password reset link has expired.")
    } else if (errorCode) {
      setLinkError("This reset link is invalid or has already been used.")
    }

    if (hParams?.get("access_token") && hParams?.get("type") === "recovery") {
      setAwaitingRecovery(true)
    } else {
      setSessionReady(true)
      checkMfaRequired()
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true)
        checkMfaRequired()
      }
    })
    return () => subscription.unsubscribe()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleMfaVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!mfaFactorId) return
    setMfaLoading(true)
    setMfaError(null)
    const { data: challenge } = await supabase.auth.mfa.challenge({ factorId: mfaFactorId })
    if (!challenge) {
      setMfaError("Failed to start MFA challenge. Please try again.")
      setMfaLoading(false)
      return
    }
    const { error } = await supabase.auth.mfa.verify({
      factorId: mfaFactorId,
      challengeId: challenge.id,
      code: mfaCode.trim(),
    })
    if (error) {
      setMfaError("Invalid code. Please try again.")
      setMfaLoading(false)
    } else {
      setNeedsMfa(false)
      setMfaLoading(false)
    }
  }

  const [confirm, setConfirm] = useState("")
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const checks = {
    length: password.length >= 8,
    mixedCase: /[a-z]/.test(password) && /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    symbol: /[!@#$%^&*()_+\-=[\]{};':"|,.<>/?]/.test(password),
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
      await supabase.auth.signOut()
      setDone(true)
    }
  }

  if (done) {
    return (
      <div className="bg-surface border border-border rounded-xl p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-ok/10 flex items-center justify-center mx-auto mb-4">
          <Check className="w-6 h-6 text-ok" />
        </div>
        <h2 className="text-2xl font-bold text-fg mb-2">Password updated.</h2>
        <p className="text-sm text-fg-3 mb-1">
          Your password has been changed successfully.
        </p>
        <p className="text-sm text-fg-3 mb-6">
          Open the <strong className="text-fg">JumpLogs app</strong> on your device and sign in with your new password.
        </p>
        <p className="text-xs text-fg-4">You can close this page.</p>
      </div>
    )
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
      ) : needsMfa ? (
        <>
          <div className="mb-8">
            <div className="w-12 h-12 rounded-full bg-sky/10 flex items-center justify-center mb-4">
              <ShieldCheck className="w-6 h-6 text-sky" />
            </div>
            <h1 className="text-3xl font-bold text-fg tracking-tight mb-1.5">Verify your identity.</h1>
            <p className="text-sm text-fg-3">Your account has two-factor authentication enabled. Enter your authenticator code to continue.</p>
          </div>
          <form onSubmit={handleMfaVerify} className="space-y-4">
            <div>
              <label className="block text-overline font-semibold tracking-widest uppercase text-fg-3 mb-1.5">
                Authenticator code
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                required
                autoFocus
                autoComplete="one-time-code"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-surface-2 border border-border rounded-sm px-4 py-2.5 text-sm text-fg placeholder:text-fg-4 focus:outline-none focus:border-sky transition-colors tracking-widest text-center font-mono text-lg"
                placeholder="000000"
              />
            </div>
            {mfaError && (
              <p className="text-xs text-danger bg-danger-bg border border-danger/20 rounded-sm px-3 py-2">
                {mfaError}
              </p>
            )}
            <button
              type="submit"
              disabled={mfaLoading || mfaCode.length < 6}
              className="w-full bg-sky text-on-sky font-semibold rounded-sm py-2.5 text-sm hover:bg-sky/90 disabled:opacity-50 transition-colors"
            >
              {mfaLoading ? "Verifying…" : "Verify"}
            </button>
          </form>
        </>
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
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`flex-1 rounded-full transition-colors ${
                    i < strength
                      ? strength <= 1
                        ? "bg-danger"
                        : strength <= 3
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
              <StrengthRow ok={checks.number} label="Number" />
              <StrengthRow ok={checks.symbol} label="Symbol" />
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
