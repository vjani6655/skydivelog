'use client'

import { useState, useEffect } from 'react'
import { Sun, Moon, Monitor } from 'lucide-react'

type Theme = 'dark' | 'light' | 'system'

const ONE_YEAR = 60 * 60 * 24 * 365

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)};path=/;max-age=${ONE_YEAR};samesite=lax`
}

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

function applyTheme(theme: Theme) {
  const html = document.documentElement
  if (theme === 'light') {
    html.classList.add('light')
  } else if (theme === 'dark') {
    html.classList.remove('light')
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    html.classList.toggle('light', !prefersDark)
  }
}

const OPTIONS: { value: Theme; Icon: typeof Sun; label: string }[] = [
  { value: 'dark',   Icon: Moon,    label: 'Dark'   },
  { value: 'light',  Icon: Sun,     label: 'Light'  },
  { value: 'system', Icon: Monitor, label: 'System' },
]

export default function AdminThemeToggle() {
  const [theme, setTheme] = useState<Theme>('dark')

  useEffect(() => {
    const saved = readCookie('pref_theme') as Theme | null
    if (saved && ['dark', 'light', 'system'].includes(saved)) setTheme(saved)
  }, [])

  function handleSet(t: Theme) {
    setTheme(t)
    setCookie('pref_theme', t)
    applyTheme(t)
  }

  return (
    <div className="flex items-center gap-0.5 p-1 bg-surface-2 rounded-lg border border-border">
      {OPTIONS.map(({ value, Icon, label }) => (
        <button
          key={value}
          type="button"
          onClick={() => handleSet(value)}
          title={label}
          className={`flex items-center justify-center w-7 h-7 rounded-md transition-colors ${
            theme === value
              ? 'bg-surface border border-border-strong text-fg'
              : 'text-fg-4 hover:text-fg-2'
          }`}
        >
          <Icon size={13} />
        </button>
      ))}
    </div>
  )
}
