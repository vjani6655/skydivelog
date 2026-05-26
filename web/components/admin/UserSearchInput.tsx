'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'

export function UserSearchInput({ defaultValue }: { defaultValue: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [value, setValue] = useState(defaultValue)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const push = useCallback((q: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (q) params.set('q', q)
    else params.delete('q')
    params.delete('page') // reset pagination
    router.push(`/admin/users?${params.toString()}`)
  }, [router, searchParams])

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => push(value), 250)
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="h-9 flex-1 min-w-60 bg-surface border border-border rounded-md flex items-center px-2.5 gap-2">
      <svg className="w-3.5 h-3.5 text-fg-3 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="6" cy="6" r="4"/><path d="m14 14-3.5-3.5"/>
      </svg>
      <input
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder="Search users by name, email, licence, ID…"
        className="bg-transparent text-xs text-fg placeholder:text-fg-3 outline-none flex-1"
        autoComplete="off"
      />
      {value && (
        <button onClick={() => setValue('')} className="text-fg-3 hover:text-fg transition-colors leading-none">
          ✕
        </button>
      )}
    </div>
  )
}
