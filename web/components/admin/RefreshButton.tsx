'use client'

import { useState } from 'react'
import { RefreshCw } from 'lucide-react'

export default function RefreshButton() {
  const [spinning, setSpinning] = useState(false)

  const handleRefresh = () => {
    setSpinning(true)
    window.location.reload()
  }

  return (
    <button
      onClick={handleRefresh}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-border rounded-sm text-xs text-fg-2 font-medium hover:text-fg transition-colors"
      title="Refresh data"
    >
      <RefreshCw size={12} className={spinning ? 'animate-spin' : ''} />
      Refresh
    </button>
  )
}
