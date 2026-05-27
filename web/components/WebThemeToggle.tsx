'use client'

import { useState, useEffect } from 'react'
import { Sun, Moon } from 'lucide-react'

type Theme = 'dark' | 'light'
const ONE_YEAR = 60 * 60 * 24 * 365

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)};path=/;max-age=${ONE_YEAR};samesite=lax`
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('light', theme === 'light')
}

export default function WebThemeToggle() {
  const [theme, setTheme] = useState<Theme>('dark')

  useEffect(() => {
    const match = document.cookie.match(/(?:^|; )pref_theme=([^;]*)/)
    const saved = match ? decodeURIComponent(match[1]) : 'dark'
    const resolved: Theme = saved === 'light' ? 'light' : 'dark'
    setTheme(resolved)
  }, [])

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    setCookie('pref_theme', next)
    applyTheme(next)
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      className="w-8 h-8 flex items-center justify-center rounded-md text-fg-3 hover:text-fg hover:bg-surface-2 transition-colors"
    >
      {theme === 'dark' ? <Moon size={15} /> : <Sun size={15} />}
    </button>
  )
}

