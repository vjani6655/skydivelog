"use client"

/**
 * PrefsSyncer — runs on every account page load.
 * On mount it writes display-pref cookies (so the next SSR request picks them up)
 * and immediately applies the theme class to <html> — covering the case where
 * the user has DB prefs but no cookies yet (first login, cleared browser data).
 */
import { useEffect } from "react"

const ONE_YEAR = 60 * 60 * 24 * 365

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)};path=/;max-age=${ONE_YEAR};samesite=lax`
}

export default function PrefsSyncer({
  theme,
  dateFormat,
  altUnit,
}: {
  theme: string
  dateFormat: string
  altUnit: string
}) {
  useEffect(() => {
    // Persist prefs so every SSR page has them available via cookies()
    setCookie("pref_theme", theme)
    setCookie("pref_date_format", dateFormat)
    setCookie("pref_altitude_unit", altUnit)

    // Apply theme immediately without waiting for a page reload
    const html = document.documentElement
    if (theme === "light") {
      html.classList.add("light")
    } else if (theme === "dark") {
      html.classList.remove("light")
    } else {
      // "system"
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
      html.classList.toggle("light", !prefersDark)
    }
  }, [theme, dateFormat, altUnit])

  return null
}
