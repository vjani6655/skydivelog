'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Calendar, Download, ChevronDown } from 'lucide-react'
import { useState } from 'react'

const RANGES = [
  { label: '7 days',    value: '7d' },
  { label: '30 days',   value: '30d' },
  { label: '90 days',   value: '90d' },
  { label: '12 months', value: '12m' },
]

export default function DashboardControls() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [open, setOpen] = useState(false)
  const [exporting, setExporting] = useState(false)

  const current = searchParams.get('range') ?? '30d'
  const currentLabel = RANGES.find(r => r.value === current)?.label ?? '30 days'

  const days = current === '7d' ? 7 : current === '90d' ? 90 : current === '12m' ? 365 : 30
  const fromDate = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10)

  function selectRange(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('range', value)
    router.push(`${pathname}?${params.toString()}`)
    setOpen(false)
  }

  async function handleExport() {
    setExporting(true)
    try {
      const res = await fetch('/api/admin/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataset: 'users',
          fields: ['id', 'email', 'name', 'created_at', 'subscription_status', 'plan', 'jump_count'],
          filters: { fromDate },
        }),
      })
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `signups-${current}-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      alert('Export failed. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex gap-2">
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-border rounded-sm text-xs text-fg-2 font-medium hover:text-fg transition-colors"
        >
          <Calendar size={12} />
          Last {currentLabel}
          <ChevronDown size={10} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute right-0 top-full mt-1 z-20 bg-surface border border-border rounded-sm shadow-lg w-36 overflow-hidden">
              {RANGES.map(r => (
                <button
                  key={r.value}
                  onClick={() => selectRange(r.value)}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-surface-2 transition-colors ${
                    current === r.value ? 'text-sky font-medium' : 'text-fg-2'
                  }`}
                >
                  Last {r.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <button
        onClick={handleExport}
        disabled={exporting}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-sky text-on-sky rounded-sm text-xs font-semibold disabled:opacity-60 transition-opacity"
      >
        <Download size={12} />
        {exporting ? 'Exporting…' : 'Export'}
      </button>
    </div>
  )
}
