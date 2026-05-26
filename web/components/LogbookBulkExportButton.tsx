"use client"

import { useState, useRef, useEffect } from "react"
import { Download, Loader2, X, FileText, LayoutGrid } from "lucide-react"

export default function LogbookBulkExportButton({
  jumpIds,
}: {
  jumpIds: string[]
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  const handleExport = async (layout: "single" | "ten") => {
    setOpen(false)
    setLoading(true)
    try {
      const res = await fetch("/api/export/logbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jumpIds, layout }),
      })
      if (!res.ok) throw new Error("Export failed")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `logbook-${new Date().toISOString().slice(0, 10)}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      alert("PDF export failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={loading || jumpIds.length === 0}
        className="flex items-center gap-2 border border-border rounded-sm px-4 py-2 text-sm text-fg-2 hover:bg-surface-2 hover:text-fg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        {loading ? "Exporting…" : "Export PDF"}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-50 bg-surface border border-border rounded-lg shadow-lg w-60 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
            <p className="text-[10px] font-semibold tracking-widest uppercase text-fg-4">
              Export {jumpIds.length} jump{jumpIds.length !== 1 ? "s" : ""} as PDF
            </p>
            <button onClick={() => setOpen(false)} className="text-fg-4 hover:text-fg transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Options */}
          <div className="p-1.5 space-y-0.5">
            <button
              onClick={() => handleExport("single")}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-sm hover:bg-surface-2 transition-colors text-left"
            >
              <FileText className="w-4 h-4 text-fg-3 shrink-0" />
              <div>
                <p className="text-sm font-medium text-fg leading-none mb-0.5">1 jump per page</p>
                <p className="text-xs text-fg-4">Full detail, signature &amp; notes</p>
              </div>
            </button>
            <button
              onClick={() => handleExport("ten")}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-sm hover:bg-surface-2 transition-colors text-left"
            >
              <LayoutGrid className="w-4 h-4 text-fg-3 shrink-0" />
              <div>
                <p className="text-sm font-medium text-fg leading-none mb-0.5">6 jumps per page</p>
                <p className="text-xs text-fg-4">Compact logbook grid</p>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
