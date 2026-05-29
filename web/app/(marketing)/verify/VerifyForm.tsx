"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Search, Loader2 } from "lucide-react"

export default function VerifyForm({ initialCode }: { initialCode?: string }) {
  const [code, setCode] = useState(initialCode ?? "")
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const clean = code.trim().replace(/[^a-fA-F0-9]/g, "")
    if (clean.length >= 8) {
      router.push(`/verify?code=${clean}`)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 w-full max-w-md">
      <input
        ref={inputRef}
        type="text"
        value={code}
        onChange={e => setCode(e.target.value.replace(/[^a-fA-F0-9\-]/g, ""))}
        placeholder="e.g. 4a2f8c1e32"
        maxLength={12}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        className="flex-1 font-mono text-sm bg-surface border border-border rounded-sm px-4 py-2.5 text-fg placeholder:text-fg-4 focus:outline-none focus:border-sky transition-colors tracking-wider uppercase"
      />
      <button
        type="submit"
        disabled={code.replace(/[^a-fA-F0-9]/g, "").length < 8}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-sm bg-sky text-on-sky font-semibold text-sm hover:bg-sky/90 disabled:opacity-50 transition-colors"
      >
        <Search className="w-3.5 h-3.5" />
        Verify
      </button>
    </form>
  )
}
