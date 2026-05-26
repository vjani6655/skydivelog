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
      className="text-xs text-danger border border-danger/30 hover:bg-danger-bg px-3 py-1.5 rounded-sm transition-colors disabled:opacity-50"
    >
      {loading ? "Loading…" : "Cancel subscription"}
    </button>
  )
}
