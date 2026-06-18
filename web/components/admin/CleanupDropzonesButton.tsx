'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'

export default function CleanupDropzonesButton() {
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle')
  const [result, setResult] = useState<{ deleted: number; names: string[] } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleCleanup = async () => {
    if (!confirm('Delete all dropzones not used by any jump or user? This cannot be undone.')) return
    setState('loading')
    setError(null)
    try {
      const res = await fetch('/api/admin/cleanup/orphaned-dropzones', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      setResult(data)
      setState('done')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
      setState('idle')
    }
  }

  if (state === 'done' && result) {
    return (
      <span className="font-mono text-[11px] text-ok">
        ✓ {result.deleted === 0 ? 'No orphans found' : `Deleted ${result.deleted} dropzone${result.deleted !== 1 ? 's' : ''}`}
      </span>
    )
  }

  return (
    <div className="flex items-center gap-2">
      {error && <span className="font-mono text-[11px] text-danger">{error}</span>}
      <button
        onClick={handleCleanup}
        disabled={state === 'loading'}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-border rounded-sm text-xs text-fg-3 font-medium hover:text-danger hover:border-danger/40 transition-colors disabled:opacity-50"
        title="Delete dropzones not used by any jump or user"
      >
        <Trash2 size={12} />
        {state === 'loading' ? 'Cleaning…' : 'Clean orphaned DZs'}
      </button>
    </div>
  )
}
