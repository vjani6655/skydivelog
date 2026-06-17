'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RotateCcw } from 'lucide-react'

export default function ResetRevenueButton() {
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleReset() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/revenue/reset', { method: 'POST' })
      if (!res.ok) throw new Error('Reset failed')
      setConfirming(false)
      router.refresh()
    } catch {
      alert('Reset failed — check console.')
    } finally {
      setLoading(false)
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-fg-3">Zero out all MRR/ARR?</span>
        <button
          onClick={handleReset}
          disabled={loading}
          className="flex items-center gap-1 px-3 py-1.5 bg-danger text-white rounded-sm text-xs font-semibold disabled:opacity-50"
        >
          {loading ? 'Resetting…' : 'Confirm'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="px-3 py-1.5 bg-surface border border-border rounded-sm text-xs text-fg-2 font-medium"
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-border rounded-sm text-xs text-fg-2 font-medium hover:text-fg transition-colors"
    >
      <RotateCcw size={12} /> Reset $
    </button>
  )
}
