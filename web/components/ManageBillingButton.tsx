"use client"

import { useState } from "react"

export default function ManageBillingButton({ label = "Manage billing" }: { label?: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleManage = async () => {
    setLoading(true)
    setError(null)
    const res = await fetch("/api/stripe/portal", { method: "POST" })
    const data = await res.json()
    if (data.url) {
      window.location.href = data.url
    } else {
      setError(data.error ?? "Something went wrong.")
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        onClick={handleManage}
        disabled={loading}
        className="w-full h-11 px-4 rounded-lg bg-sky text-on-sky text-sm font-medium hover:bg-sky/90 transition-colors disabled:opacity-50"
      >
        {loading ? "Loading…" : label}
      </button>
      {error && <p className="text-xs text-danger mt-1">{error}</p>}
    </div>
  )
}
