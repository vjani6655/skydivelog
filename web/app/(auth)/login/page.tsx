"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Eye, EyeOff, Mail, Lock } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPass, setShowPass] = useState(false)
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [emailError, setEmailError] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [loading, setLoading] = useState(false)

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  const [mfaRequired, setMfaRequired] = useState(false)
  const [mfaCode, setMfaCode] = useState("")
  const [mfaError, setMfaError] = useState<string | null>(null)
  const [mfaLoading, setMfaLoading] = useState(false)

  // Handle Supabase implicit-flow hash tokens (e.g. from admin impersonate links
  // when the redirectTo URL isn't whitelisted in Supabase's allowed redirect URLs).
  useEffect(() => {
    const hash = window.location.hash
    console.log('[login] hash on mount:', hash || '(empty)')
    if (!hash.includes('access_token')) return
    console.log('[login] access_token detected in hash — attempting to set session')
    const params = new URLSearchParams(hash.replace(/^#/, ''))
    const access_token = params.get('access_token')
    const refresh_token = params.get('refresh_token')
    const type = params.get('type')
    console.log('[login] token type:', type, '| access_token prefix:', access_token?.slice(0, 20))
    if (access_token) {
      supabase.auth.setSession({ access_token, refresh_token: refresh_token ?? '' })
        .then(({ data, error }) => {
          console.log('[login] setSession result:', { user: data?.user?.email, error })
          if (!error && data?.user) {
            console.log('[login] redirecting to /dashboard')
            window.location.href = '/dashboard'
          } else {
            console.error('[login] setSession failed:', error)
          }
        })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    // Client-side validation
    let valid = true
    if (!email.trim()) {
      setEmailError("Email is required"); valid = false
    } else if (!EMAIL_RE.test(email.trim())) {
      setEmailError("Enter a valid email address"); valid = false
    } else {
      setEmailError("")
    }
    if (!password) {
      setPasswordError("Password is required"); valid = false
    } else {
      setPasswordError("")
    }
    if (!valid) return

    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Check if MFA is required
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    if (aal?.nextLevel === 'aal2' && aal.nextLevel !== aal.currentLevel) {
      setMfaRequired(true)
      setLoading(false)
    } else {
      router.push("/dashboard")
      router.refresh()
    }
  }

  const handleMfaVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (mfaCode.length !== 6) return
    setMfaError(null)
    setMfaLoading(true)
    try {
      const { data: factors } = await supabase.auth.mfa.listFactors()
      const totp = factors?.totp?.find((f: { status: string }) => f.status === 'verified')
      if (!totp) { setMfaError('No authenticator found.'); return }
      const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId: totp.id })
      if (chErr || !ch) { setMfaError(chErr?.message ?? 'Challenge failed'); return }
      const { error: verErr } = await supabase.auth.mfa.verify({ factorId: totp.id, challengeId: ch.id, code: mfaCode })
      if (verErr) { setMfaError('Invalid code. Try again.'); return }
      router.push("/dashboard")
      router.refresh()
    } finally {
      setMfaLoading(false)
    }
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-8">
      {mfaRequired ? (
        <>
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-fg tracking-tight mb-1.5">Two-Factor Auth</h1>
            <p className="text-sm text-fg-3">Enter the 6-digit code from your authenticator app.</p>
          </div>
          <form onSubmit={handleMfaVerify} className="space-y-4">
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={mfaCode}
              onChange={e => { setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setMfaError(null) }}
              className="w-full bg-surface-2 border border-border rounded-sm px-4 py-3 text-center text-3xl font-mono tracking-[0.5em] text-fg focus:outline-none focus:border-sky"
              placeholder="000000"
              autoFocus
            />
            {mfaError && <p className="text-xs text-danger bg-danger-bg border border-danger/20 rounded-sm px-3 py-2">{mfaError}</p>}
            <button type="submit" disabled={mfaCode.length !== 6 || mfaLoading}
              className="w-full bg-sky text-on-sky font-semibold rounded-sm py-2.5 text-sm hover:bg-sky/90 disabled:opacity-50 transition-colors mt-2">
              {mfaLoading ? "Verifying…" : "Verify"}
            </button>
            <button type="button" onClick={() => { supabase.auth.signOut(); setMfaRequired(false) }}
              className="w-full text-xs text-fg-3 hover:text-fg-2 mt-2">
              Back to sign in
            </button>
          </form>
        </>
      ) : (
      <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-fg tracking-tight mb-1.5">Welcome back.</h1>
        <p className="text-sm text-fg-3">Sign in to your account.</p>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-overline font-semibold tracking-widest uppercase text-fg-3 mb-1.5">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-4" />
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); if (emailError) setEmailError("") }}
              className={`w-full bg-surface-2 border rounded-sm pl-9 pr-4 py-2.5 text-sm text-fg placeholder:text-fg-4 focus:outline-none transition-colors ${emailError ? "border-danger/60 focus:border-danger" : "border-border focus:border-sky"}`}
              placeholder="you@example.com"
            />
          </div>
          {emailError && <p className="mt-1 text-xs text-danger">{emailError}</p>}
        </div>

        <div>
          <label className="block text-overline font-semibold tracking-widest uppercase text-fg-3 mb-1.5">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-4" />
            <input
              type={showPass ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); if (passwordError) setPasswordError("") }}
              className={`w-full bg-surface-2 border rounded-sm pl-9 pr-10 py-2.5 text-sm text-fg placeholder:text-fg-4 focus:outline-none transition-colors ${passwordError ? "border-danger/60 focus:border-danger" : "border-border focus:border-sky"}`}
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
          {passwordError && <p className="mt-1 text-xs text-danger">{passwordError}</p>}
        </div>

        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="w-3.5 h-3.5 rounded-sm accent-sky"
            />
            <span className="text-xs text-fg-3">Keep me signed in</span>
          </label>
          <Link href="/forgot-password" className="text-xs text-sky hover:text-sky/80">
            Forgot password?
          </Link>
        </div>

        {error && (
          <p className="text-xs text-danger bg-danger-bg border border-danger/20 rounded-sm px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-sky text-on-sky font-semibold rounded-sm py-2.5 text-sm hover:bg-sky/90 disabled:opacity-50 transition-colors mt-2"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-xs text-center text-fg-3">
        New here?{" "}
        <Link href="/signup" className="text-sky hover:text-sky/80">
          Create an account
        </Link>
      </p>
      </>
      )}
    </div>
  )
}
