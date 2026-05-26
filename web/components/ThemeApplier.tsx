"use client"

import { useEffect } from "react"

type ThemeValue = "dark" | "light" | "system"

export default function ThemeApplier({ theme }: { theme: ThemeValue }) {
  useEffect(() => {
    apply(theme)

    if (theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)")
      const handler = (e: MediaQueryListEvent) => {
        document.documentElement.classList.toggle("light", !e.matches)
      }
      mq.addEventListener("change", handler)
      return () => mq.removeEventListener("change", handler)
    }
  }, [theme])

  return null
}

function apply(theme: ThemeValue) {
  const html = document.documentElement
  if (theme === "light") {
    html.classList.add("light")
  } else if (theme === "dark") {
    html.classList.remove("light")
  } else {
    // system
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    html.classList.toggle("light", !prefersDark)
  }
}
