'use client'

import { useState } from 'react'

interface Props {
  jumpIds: string[]
  jumperName?: string
}

export default function ExportPdfButton({ jumpIds, jumperName }: Props) {
  const [open, setOpen]       = useState(false)
  const [loading, setLoading] = useState<'single' | 'ten' | null>(null)
  const [error, setError]     = useState<string | null>(null)

  async function handleExport(layout: 'single' | 'ten') {
    setLoading(layout)
    setError(null)
    try {
      const res = await fetch('/api/export/logbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jumpIds, layout }),
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `HTTP ${res.status}`)
      }
      const blob     = await res.blob()
      const url      = URL.createObjectURL(blob)
      const filename = res.headers.get('Content-Disposition')
        ?.match(/filename="?([^"]+)"?/)?.[1]
        ?? 'logbook.pdf'
      const a = document.createElement('a')
      a.href     = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      setOpen(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setLoading(null)
    }
  }

  return (
    <>
      <button
        onClick={() => { setOpen(true); setError(null) }}
        disabled={jumpIds.length === 0}
        className="inline-flex items-center gap-2 rounded-md border border-[#D8D4C8] bg-[#FAFAF7] px-4 py-2 text-sm font-medium text-[#0A1220] transition hover:bg-[#F5F3EE] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <svg className="h-4 w-4 text-[#7F8B9D]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0-3-3m3 3 3-3M3 17V7a2 2 0 0 1 2-2h6l2 2h4a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        </svg>
        Export as PDF
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div className="w-full max-w-md rounded-xl border border-[#D8D4C8] bg-[#FAFAF7] shadow-2xl">

            {/* Header */}
            <div className="flex items-start justify-between border-b border-[#D8D4C8] px-6 py-5">
              <div>
                <h2 className="text-base font-semibold tracking-tight text-[#0A1220]">Export as PDF</h2>
                <p className="mt-0.5 text-sm text-[#7F8B9D]">
                  {jumpIds.length} {jumpIds.length === 1 ? 'jump' : 'jumps'} selected
                  {jumperName && <> · {jumperName}</>}
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="ml-4 text-[#B6BCC6] hover:text-[#0A1220] transition"
                aria-label="Close"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Options */}
            <div className="flex gap-4 p-6">

              {/* 1-per-page option */}
              <button
                onClick={() => handleExport('single')}
                disabled={loading !== null}
                className="group flex-1 rounded-lg border-2 border-[#D8D4C8] bg-white p-4 text-left transition hover:border-[#0A1220] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {/* Mini page preview */}
                <div className="mb-3 flex h-20 w-full items-start justify-center overflow-hidden rounded border border-[#D8D4C8] bg-[#F5F3EE] p-2">
                  <div className="w-full space-y-1.5">
                    <div className="flex justify-between">
                      <div className="h-1.5 w-14 rounded bg-[#0A1220]" />
                      <div className="h-1.5 w-8 rounded bg-[#B6BCC6]" />
                    </div>
                    <div className="h-5 w-8 rounded bg-[#0A1220]" />
                    <div className="h-1.5 w-24 rounded bg-[#B6BCC6]" />
                    <div className="mt-2 grid grid-cols-3 gap-1">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-3 rounded bg-[#D8D4C8]" />
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-sm font-semibold text-[#0A1220]">
                  {loading === 'single' ? 'Generating…' : '1 jump per page'}
                </p>
                <p className="mt-0.5 text-xs text-[#7F8B9D]">Classic formal. Full detail — data grid, notes, instructor block, signature.</p>
                {loading === 'single' && (
                  <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-[#D8D4C8]">
                    <div className="h-full animate-pulse rounded-full bg-[#0A1220]" />
                  </div>
                )}
              </button>

              {/* 10-per-page option */}
              <button
                onClick={() => handleExport('ten')}
                disabled={loading !== null}
                className="group flex-1 rounded-lg border-2 border-[#D8D4C8] bg-white p-4 text-left transition hover:border-[#0A1220] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {/* Mini page preview */}
                <div className="mb-3 flex h-20 w-full items-start justify-center overflow-hidden rounded border border-[#D8D4C8] bg-[#F5F3EE] p-2">
                  <div className="w-full space-y-1">
                    <div className="flex justify-between">
                      <div className="h-1.5 w-14 rounded bg-[#0A1220]" />
                      <div className="h-1.5 w-8 rounded bg-[#B6BCC6]" />
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      {[...Array(8)].map((_, i) => (
                        <div key={i} className="h-5 rounded border border-[#D8D4C8] bg-white p-1">
                          <div className="h-1 w-4 rounded bg-[#0A1220]" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-sm font-semibold text-[#0A1220]">
                  {loading === 'ten' ? 'Generating…' : '10 jumps per page'}
                </p>
                <p className="mt-0.5 text-xs text-[#7F8B9D]">Journal cards. Compact overview — great for printing a full logbook.</p>
                {loading === 'ten' && (
                  <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-[#D8D4C8]">
                    <div className="h-full animate-pulse rounded-full bg-[#0A1220]" />
                  </div>
                )}
              </button>

            </div>

            {/* Error */}
            {error && (
              <div className="mx-6 mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Footer note */}
            <div className="border-t border-[#D8D4C8] px-6 py-4">
              <p className="text-xs text-[#B6BCC6]">
                A verification URL will be printed on each page at{' '}
                <span className="font-mono">jumplogs.com/v/…</span>
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
