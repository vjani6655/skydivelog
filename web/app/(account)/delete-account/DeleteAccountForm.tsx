"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, Download } from "lucide-react"
import { Lock } from "lucide-react"

export default function DeleteAccountForm({ jumpCount }: { jumpCount: number }) {
  const router = useRouter()
  const [confirmText, setConfirmText] = useState("")
  const [password, setPassword] = useState("")
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault()
    if (confirmText !== "DELETE") {
      setError('Type DELETE in the confirmation field.')
      return
    }
    if (!agreed) {
      setError("You must check the confirmation checkbox.")
      return
    }
    setLoading(true)
    setError(null)

    const res = await fetch("/api/account/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? "Deletion failed. Please try again.")
      setLoading(false)
    } else {
      router.push("/")
    }
  }

  return (
    <div className="space-y-5">
      {/* Warning */}
      <div className="bg-danger-bg border border-danger/30 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-danger mb-1">This is permanent.</p>
            <p className="text-xs text-fg-2">
              All {jumpCount > 0 ? jumpCount.toLocaleString() : "your"} jumps, gear records, certificates
              and notes will be permanently deleted immediately.
            </p>
          </div>
        </div>
      </div>

      {/* Export */}
      <div className="bg-surface border border-border rounded-lg p-5">
        <p className="text-sm font-semibold text-fg mb-1">Before you go — export your logbook</p>
        <p className="text-xs text-fg-4 mb-4">Download a copy of your data before deleting.</p>
        <div className="flex gap-2">
          <a
            href="/api/logbook/export?format=pdf"
            className="inline-flex items-center gap-1.5 border border-border text-sm text-fg-2 px-3 py-2 rounded-sm hover:bg-surface-2 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Download PDF
          </a>
          <a
            href="/api/logbook/export?format=csv"
            className="inline-flex items-center gap-1.5 border border-border text-sm text-fg-2 px-3 py-2 rounded-sm hover:bg-surface-2 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Download CSV
          </a>
        </div>
      </div>

      {/* Confirmation form */}
      <div className="bg-surface border border-border rounded-lg p-5">
        <form onSubmit={handleDelete} className="space-y-4">
          <div>
            <label className="block text-overline font-semibold tracking-widest uppercase text-fg-4 mb-1.5">
              Type <span className="font-mono font-bold text-fg">DELETE</span> to confirm
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full bg-surface-2 border border-border rounded-sm px-3 py-2.5 text-sm text-fg font-mono placeholder:text-fg-4 focus:outline-none focus:border-danger transition-colors"
              placeholder="DELETE"
              autoComplete="off"
              autoCapitalize="off"
            />
          </div>

          <div>
            <label className="block text-overline font-semibold tracking-widest uppercase text-fg-4 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-4" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-surface-2 border border-border rounded-sm pl-9 pr-4 py-2.5 text-sm text-fg placeholder:text-fg-4 focus:outline-none focus:border-sky transition-colors"
                placeholder="Your current password"
                autoComplete="current-password"
              />
            </div>
          </div>

          <label className="flex items-start gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 w-3.5 h-3.5 flex-shrink-0 accent-danger"
            />
            <span className="text-xs text-fg-3 leading-relaxed">
              I understand my data will be permanently deleted immediately and cannot be recovered.
            </span>
          </label>

          {error && (
            <p className="text-xs text-danger bg-danger-bg border border-danger/20 rounded-sm px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <a
              href="/settings"
              className="flex-1 text-center border border-border text-sm text-fg-2 py-2.5 rounded-sm hover:bg-surface-2 transition-colors"
            >
              Cancel
            </a>
            <button
              type="submit"
              disabled={loading || confirmText !== "DELETE" || !agreed}
              className="flex-1 bg-danger text-white text-sm font-semibold py-2.5 rounded-sm hover:bg-danger/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Deleting…" : "Delete account permanently"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
