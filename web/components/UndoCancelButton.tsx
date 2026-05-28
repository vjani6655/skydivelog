"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { undoCancelAction } from "@/app/(account)/subscription/actions"

export default function UndoCancelButton() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleUndo = async () => {
    setLoading(true)
    setError(null)
    const result = await undoCancelAction()
    if (result.ok) {
      router.refresh()
    } else {
      setError(result.error ?? "Something went wrong")
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <button
        onClick={handleUndo}
        disabled={loading}
        className="w-full h-11 px-4 rounded-lg bg-sky text-on-sky text-sm font-semibold hover:bg-sky/90 disabled:opacity-50 transition-colors"
      >
        {loading ? "Restoring…" : "Undo cancellation"}
      </button>
      {error && <p className="text-xs text-danger text-center">{error}</p>}
    </div>
  )
}
