"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { cancelSubscriptionAction } from "@/app/(account)/subscription/actions"

export default function CancelSubscriptionButton() {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = async () => {
    setLoading(true)
    setError(null)
    const result = await cancelSubscriptionAction()
    if (result.ok) {
      router.refresh()
    } else {
      setError(result.error ?? "Something went wrong")
      setLoading(false)
      setConfirming(false)
    }
  }

  if (confirming) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm text-fg-2 text-center">Cancel your subscription?</p>
        <p className="text-xs text-fg-3 text-center">You&apos;ll keep access until the end of your billing period.</p>
        {error && <p className="text-xs text-red-500 text-center">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={() => setConfirming(false)}
            disabled={loading}
            className="flex-1 h-9 px-3 rounded-lg border border-border text-sm text-fg-2 hover:bg-surface-2 transition-colors disabled:opacity-50"
          >
            Keep
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 h-9 px-3 rounded-lg border border-red-500/40 text-sm text-red-500 hover:bg-red-500/5 transition-colors disabled:opacity-50"
          >
            {loading ? "Cancelling…" : "Yes, cancel"}
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="w-full h-11 px-4 rounded-lg border border-red-500/30 text-sm text-red-500 hover:bg-red-500/5 transition-colors"
    >
      Cancel subscription
    </button>
  )
}
