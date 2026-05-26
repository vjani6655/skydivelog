"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { updateDisplayPrefs, type DisplayPrefs } from "./actions"
import { Monitor } from "lucide-react"

function OptionGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="block text-overline font-semibold tracking-widest uppercase text-fg-4 mb-2">
        {label}
      </label>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`px-3 py-1.5 rounded-sm text-sm border transition-colors ${
              value === o.value
                ? "bg-sky/10 border-sky/40 text-sky font-medium"
                : "bg-surface-2 border-border text-fg-2 hover:border-border-strong hover:text-fg"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function SettingsDisplayForm({
  data,
  userId,
}: {
  data: DisplayPrefs
  userId: string
}) {
  const router = useRouter()
  const [prefs, setPrefs] = useState<DisplayPrefs>(data)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const set = (key: keyof DisplayPrefs) => (v: string) =>
    setPrefs((p) => ({ ...p, [key]: v }))

  function applyThemeNow(theme: string) {
    const html = document.documentElement
    if (theme === "light") {
      html.classList.add("light")
    } else if (theme === "dark") {
      html.classList.remove("light")
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
      html.classList.toggle("light", !prefersDark)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaved(false)
    startTransition(async () => {
      const res = await updateDisplayPrefs(userId, prefs)
      if (res?.error) {
        setError(res.error)
      } else {
        applyThemeNow(prefs.theme)
        router.refresh()
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Monitor className="w-3.5 h-3.5 text-fg-3" />
          <h2 className="text-sm font-semibold text-fg">Display</h2>
        </div>
        <p className="text-xs text-fg-4">Customise how Logbook looks and presents data.</p>
      </div>

      <section className="space-y-6">
        <OptionGroup
          label="Theme"
          value={prefs.theme}
          onChange={set("theme")}
          options={[
            { value: "dark",   label: "Dark" },
            { value: "light",  label: "Light" },
            { value: "system", label: "System" },
          ]}
        />

        <OptionGroup
          label="Altitude unit"
          value={prefs.preferred_altitude_unit}
          onChange={set("preferred_altitude_unit")}
          options={[
            { value: "ft", label: "Feet (ft)" },
            { value: "m",  label: "Metres (m)" },
          ]}
        />

        <OptionGroup
          label="Date format"
          value={prefs.date_format}
          onChange={set("date_format")}
          options={[
            { value: "DD MMM YYYY", label: "26 May 2026" },
            { value: "MM/DD/YYYY",  label: "05/26/2026" },
            { value: "YYYY-MM-DD",  label: "2026-05-26" },
          ]}
        />
      </section>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="bg-sky text-on-sky font-semibold text-sm px-5 py-2.5 rounded-sm hover:bg-sky/90 disabled:opacity-50 transition-colors"
        >
          {isPending ? "Saving…" : "Save changes"}
        </button>
        <button
          type="button"
          onClick={() => setPrefs(data)}
          className="text-sm text-fg-3 hover:text-fg px-4 py-2.5 rounded-sm border border-border hover:border-border-strong transition-colors"
        >
          Cancel
        </button>
        {saved && <span className="text-xs text-ok">✓ Saved</span>}
        {error && <span className="text-xs text-danger">{error}</span>}
      </div>
    </form>
  )
}
