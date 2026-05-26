"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { updateTwoFactor, signOutAllSessions } from "./actions"
import { Shield, Key, LogOut, Smartphone } from "lucide-react"

interface SecurityData {
  two_factor_enabled: boolean
  last_sign_in_at: string | null
  last_sign_in_platform: string | null
  last_ip: string | null
}

export default function SettingsSecurityForm({
  data,
  userId,
}: {
  data: SecurityData
  userId: string
}) {
  const [twoFA, setTwoFA] = useState(data.two_factor_enabled)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

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
        <p className="text-xs text-fg-3">
          We&apos;ll send a reset link to your email address. You&apos;ll be signed out after changing your password.
        </p>
        <Link
          href="/forgot-password"
          className="inline-block text-xs font-medium text-sky hover:text-sky/80 border border-sky/30 rounded-sm px-3 py-2 transition-colors hover:border-sky/60"
        >
          Send reset link →
        </Link>
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
