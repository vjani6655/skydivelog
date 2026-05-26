"use client"

import { useState } from "react"
import { FileDown, Loader2 } from "lucide-react"

export default function ExportJumpPdfButton({
  jumpId,
  jumpNumber,
}: {
  jumpId: string
  jumpNumber: number
}) {
  const [loading, setLoading] = useState(false)

  const handleExport = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/export/logbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jumpIds: [jumpId], layout: "single" }),
      })
      if (!res.ok) throw new Error("Export failed")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `jump-${jumpNumber}.pdf`
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
    <button
      onClick={handleExport}
      disabled={loading}
      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-sm bg-sky text-on-sky font-semibold text-sm hover:bg-sky/90 disabled:opacity-60 transition-colors"
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <FileDown className="w-3.5 h-3.5" />
      )}
      Export PDF
    </button>
  )
}
