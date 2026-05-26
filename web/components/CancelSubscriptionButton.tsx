"use client"

import { useState } from "react"

export default function CancelSubscriptionButton() {
  const [loading, setLoading] = useState(false)

  const handleCancel = async () => {
    setLoading(true)
    const res = await fetch("/api/stripe/portal", { method: "POST" })
    const data = await res.json()
    if (data.url) {
      window.location.href = data.url
    } else {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleCancel}
      disabled={loading}
      className="w-full h-11 px-4 rounded-lg border border-border text-sm text-fg-2 hover:bg-surface-2 transition-colors disabled:opacity-50"
    >
      {loading ? "Loading…" : "Cancel subscription"}
    </button>
  )
}
