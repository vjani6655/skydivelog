"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useTransition } from "react"
import { Search } from "lucide-react"

export default function LogbookSearch({ defaultValue }: { defaultValue: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [, startTransition] = useTransition()

  const handleChange = (value: string) => {
    const next = new URLSearchParams(params.toString())
    if (value) {
      next.set("q", value)
    } else {
      next.delete("q")
    }
    next.delete("page")
    startTransition(() => {
      router.replace(`${pathname}?${next.toString()}`)
    })
  }

  return (
    <div className="relative flex-1 max-w-sm">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-fg-4" />
      <input
        type="text"
        defaultValue={defaultValue}
        onChange={(e) => handleChange(e.target.value)}
        className="w-full bg-surface-2 border border-border rounded-sm pl-8 pr-4 py-2 text-sm text-fg placeholder:text-fg-4 focus:outline-none focus:border-sky transition-colors"
        placeholder="Search by DZ, type, number…"
      />
    </div>
  )
}
