"use client"

/**
 * Renders a jump timestamp (timestamptz ISO string) in the browser's local
 * timezone — avoids server/client hydration mismatch since timezone is not
 * known during SSR.
 *
 * SSR output: date only (e.g. "SAT 24 MAY 2026")
 * After hydration: full datetime (e.g. "SAT 24 MAY 2026 · 16:42")
 */
import { useEffect, useState } from "react"

const DAYS   = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN",
                "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]

export default function JumpDateDisplay({ iso }: { iso: string }) {
  const [localStr, setLocalStr] = useState<string>("")

  useEffect(() => {
    const d = new Date(iso)
    const dow = DAYS[d.getDay()]
    const day = d.getDate()
    const mon = MONTHS[d.getMonth()]
    const yr  = d.getFullYear()
    const hh  = String(d.getHours()).padStart(2, "0")
    const mm  = String(d.getMinutes()).padStart(2, "0")
    setLocalStr(`${dow} ${day} ${mon} ${yr} · ${hh}:${mm}`)
  }, [iso])

  if (!localStr) {
    // SSR / before hydration: show date from UTC (consistent, no mismatch)
    const d = new Date(iso)
    const dow = DAYS[d.getUTCDay()]
    const day = d.getUTCDate()
    const mon = MONTHS[d.getUTCMonth()]
    const yr  = d.getUTCFullYear()
    return <>{dow} {day} {mon} {yr}</>
  }

  return <>{localStr}</>
}

/** Renders only the HH:MM time in local timezone */
export function LocalTime({ iso }: { iso: string }) {
  const [time, setTime] = useState<string>("")
  useEffect(() => {
    const d = new Date(iso)
    const hh = String(d.getHours()).padStart(2, "0")
    const mm = String(d.getMinutes()).padStart(2, "0")
    setTime(`${hh}:${mm}`)
  }, [iso])
  return <>{time || "—"}</>
}
