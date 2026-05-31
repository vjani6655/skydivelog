"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { updateTwoFactor, signOutAllSessions } from "./actions"
import { Shield, Key, LogOut, Smartphone, Eye, EyeOff, Check, X } from "lucide-react"

interface SecurityData {
  two_factor_enabled: boolean
  last_sign_in_at: string | null
  last_sign_in_platform: string | null
  last_ip: string | null
}

function StrengthRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${ok ? "text-ok" : "text-fg-4"}`}>
      {ok ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
      {label}
    </span>
  )
}

export default function SettingsSecurityForm({
  data,
  userId,
}: {
  data: SecurityData
  userId: string
}) {
  const supabase = createClient()
  const [twoFA, setTwoFA] = useState(data.two_factor_enabled)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  // ── Change password state ────────────────────────────────────────────────
  const [pwOpen, setPwOpen] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [pwError, setPwError] = useState<string | null>(null)
  const [pwLoading, setPwLoading] = useState(false)
  // OTP step
  const [otpStep, setOtpStep] = useState(false)
  const [otp, setOtp] = useState("")
  const [otpError, setOtpError] = useState<string | null>(null)
  const [otpLoading, setOtpLoading] = useState(false)
  const [pwDone, setPwDone] = useState(false)

  const pwChecks = {
    length: newPassword.length >= 8,
    mixedCase: /[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword),
    number: /[0-9]/.test(newPassword),
    symbol: /[!@#$%^&*()_+\-=[\]{};':"|,.<>/?]/.test(newPassword),
  }
  const strength = Object.values(pwChecks).filter(Boolean).length

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwError(null)
    if (newPassword !== confirmPassword) {
      setPwError("Passwords do not match.")
      return
    }
    setPwLoading(true)
    // Trigger reauthentication OTP email
    const { error } = await supabase.auth.reauthenticate()
    setPwLoading(false)
    if (error) {
      setPwError(error.message)
    } else {
      setOtpStep(true)
    }
  }

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setOtpError(null)
    setOtpLoading(true)
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
      nonce: otp.trim(),
    })
    setOtpLoading(false)
    if (error) {
      setOtpError(error.message)
    } else {
      await supabase.auth.signOut()
      setPwDone(true)
    }
  }

  // ── 2FA + session ────────────────────────────────────────────────────────
  const toggle2FA = (val: boolean) => {
    setTwoFA(val)
    setError(null)
    startTransition(async () => {
      const res = await updateTwoFactor(userId, val)
      if (res?.error) { setError(res.error); setTwoFA(!val) }
      else { setSaved(true); setTimeout(() => setSaved(false), 3000) }
    })
  }

  const handleSignOutAll = () => {
    startTransition(async () => {
      await signOutAllSessions()
      router.push("/login")
    })
  }

  const fmtDate = (s: string | null) =>
    s ? new Date(s).toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" }) : "Never"

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-sm font-semibold text-fg mb-1">Security</h2>
        <p className="text-xs text-fg-4 mb-6">Manage your password and sign-in security.</p>
      </div>

      {/* Password */}
      <section className="border border-border rounded-sm p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Key className="w-3.5 h-3.5 text-fg-3" />
          <span className="text-sm font-semibold text-fg">Password</span>
        </div>

        {pwDone ? (
          <div className="p-3 bg-ok/5 border border-ok/20 rounded-sm">
            <p className="text-xs text-ok">✓ Password updated. You&apos;ve been signed out — please sign back in.</p>
          </div>
        ) : !pwOpen ? (
          <>
            <p className="text-xs text-fg-3">Update your password directly, or send a reset link to your email.</p>
            <div className="flex gap-2">
              <button
                onClick={() => setPwOpen(true)}
                className="inline-block text-xs font-medium text-sky hover:text-sky/80 border border-sky/30 rounded-sm px-3 py-2 transition-colors hover:border-sky/60"
              >
                Change password
              </button>
            </div>
          </>
        ) : otpStep ? (
          <form onSubmit={handleOtpSubmit} className="space-y-3">
            <div className="p-3 bg-sky/5 border border-sky/20 rounded-sm">
              <p className="text-xs text-sky">A 6-digit verification code has been sent to your email address. Enter it below to confirm the change.</p>
            </div>
            <div>
              <label className="block text-[10px] font-semibold tracking-widest uppercase text-fg-3 mb-1.5">Verification code</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                required
                autoFocus
                autoComplete="one-time-code"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                className="w-full bg-surface-2 border border-border rounded-sm px-4 py-2 text-sm text-fg placeholder:text-fg-4 focus:outline-none focus:border-sky transition-colors tracking-widest text-center font-mono text-lg"
                placeholder="00000000"
              />
            </div>
            {otpError && <p className="text-xs text-danger bg-danger-bg border border-danger/20 rounded-sm px-3 py-2">{otpError}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={otpLoading || otp.length < 8}
                className="text-xs font-medium bg-sky text-on-sky rounded-sm px-3 py-2 hover:bg-sky/90 disabled:opacity-50 transition-colors"
              >
                {otpLoading ? "Verifying…" : "Confirm"}
              </button>
              <button
                type="button"
                onClick={() => { setOtpStep(false); setOtp(""); setOtpError(null) }}
                className="text-xs font-medium text-fg-3 border border-border rounded-sm px-3 py-2 hover:text-fg transition-colors"
              >
                Back
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handlePasswordSubmit} className="space-y-3">
            <div>
              <label className="block text-[10px] font-semibold tracking-widest uppercase text-fg-3 mb-1.5">New password</label>
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-surface-2 border border-border rounded-sm pl-3 pr-9 py-2 text-sm text-fg placeholder:text-fg-4 focus:outline-none focus:border-sky transition-colors"
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-fg-4 hover:text-fg-2">
                  {showNew ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              {newPassword.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  <div className="flex gap-1 h-1">
                    {[0,1,2,3].map(i => (
                      <div key={i} className={`flex-1 rounded-full transition-colors ${i < strength ? strength <= 1 ? "bg-danger" : strength <= 2 ? "bg-warn" : strength <= 3 ? "bg-warn" : "bg-ok" : "bg-surface-3"}`} />
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1">
                    <StrengthRow ok={pwChecks.length} label="8+ chars" />
                    <StrengthRow ok={pwChecks.mixedCase} label="Mixed case" />
                    <StrengthRow ok={pwChecks.number} label="Number" />
                    <StrengthRow ok={pwChecks.symbol} label="Symbol" />
                  </div>
                </div>
              )}
            </div>
            <div>
              <label className="block text-[10px] font-semibold tracking-widest uppercase text-fg-3 mb-1.5">Confirm password</label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-surface-2 border border-border rounded-sm pl-3 pr-9 py-2 text-sm text-fg placeholder:text-fg-4 focus:outline-none focus:border-sky transition-colors"
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-fg-4 hover:text-fg-2">
                  {showConfirm ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            {pwError && <p className="text-xs text-danger bg-danger-bg border border-danger/20 rounded-sm px-3 py-2">{pwError}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={pwLoading || strength < 4}
                className="text-xs font-medium bg-sky text-on-sky rounded-sm px-3 py-2 hover:bg-sky/90 disabled:opacity-50 transition-colors"
              >
                {pwLoading ? "Sending code…" : "Continue"}
              </button>
              <button
                type="button"
                onClick={() => { setPwOpen(false); setNewPassword(""); setConfirmPassword(""); setPwError(null) }}
                className="text-xs font-medium text-fg-3 border border-border rounded-sm px-3 py-2 hover:text-fg transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </section>

      {/* 2FA */}
      <section className="border border-border rounded-sm p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-3">
            <Smartphone className="w-3.5 h-3.5 text-fg-3 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-fg">Two-factor authentication</p>
              <p className="text-xs text-fg-3 mt-0.5">
                Add an extra layer of security. You&apos;ll be prompted for a code on sign-in.
              </p>
            </div>
          </div>
          <button
            onClick={() => toggle2FA(!twoFA)}
            disabled={isPending}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-50 ${
              twoFA ? "bg-sky" : "bg-border"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${
                twoFA ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
        {twoFA && (
          <div className="mt-3 p-3 bg-sky/5 border border-sky/20 rounded-sm">
            <p className="text-xs text-sky">
              2FA preference saved. Full TOTP setup coming soon — you&apos;ll be guided through pairing an authenticator app.
            </p>
          </div>
        )}
      </section>

      {/* Active session */}
      <section className="border border-border rounded-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-3.5 h-3.5 text-fg-3" />
          <span className="text-sm font-semibold text-fg">Active session</span>
        </div>
        <div className="space-y-1.5 text-xs text-fg-3 mb-4">
          <div className="flex gap-3">
            <span className="w-24 text-fg-4 font-mono uppercase tracking-wide text-[10px]">Last seen</span>
            <span className="text-fg-2">{fmtDate(data.last_sign_in_at)}</span>
          </div>
          {data.last_sign_in_platform && (
            <div className="flex gap-3">
              <span className="w-24 text-fg-4 font-mono uppercase tracking-wide text-[10px]">Platform</span>
              <span className="text-fg-2">{data.last_sign_in_platform}</span>
            </div>
          )}
          {data.last_ip && (
            <div className="flex gap-3">
              <span className="w-24 text-fg-4 font-mono uppercase tracking-wide text-[10px]">IP address</span>
              <span className="text-fg-2 font-mono">{data.last_ip}</span>
            </div>
          )}
        </div>
        <button
          onClick={handleSignOutAll}
          disabled={isPending}
          className="flex items-center gap-1.5 text-xs font-medium text-danger border border-danger/30 rounded-sm px-3 py-2 hover:border-danger/60 hover:bg-danger-bg transition-colors disabled:opacity-50"
        >
          <LogOut className="w-3 h-3" />
          Sign out all devices
        </button>
      </section>

      {saved && <p className="text-xs text-ok">✓ Saved</p>}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}
