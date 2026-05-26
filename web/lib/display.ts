/**
 * User-preference-aware display formatting utilities.
 * Pass the user's saved preferences (from cookie or DB) to each function.
 */

/** Format a YYYY-MM-DD ISO date string according to the user's date format preference. */
export function fmtDate(iso: string | null, format: string): string {
  if (!iso) return "—"
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number)
  const d = new Date(Date.UTC(year, month - 1, day))

  switch (format) {
    case "MM/DD/YYYY":
      return d.toLocaleDateString("en-US", {
        month: "2-digit", day: "2-digit", year: "numeric", timeZone: "UTC",
      })
    case "YYYY-MM-DD":
      return iso.slice(0, 10)
    case "DD MMM YYYY":
    default:
      return d.toLocaleDateString("en-AU", {
        day: "2-digit", month: "short", year: "numeric", timeZone: "UTC",
      })
  }
}

/** Format an altitude (stored in feet) according to the user's unit preference. */
export function fmtAltitude(ft: number | null, unit: string): string {
  if (ft == null) return "—"
  if (unit === "m") {
    return `${Math.round(ft * 0.3048).toLocaleString()} m`
  }
  return `${ft.toLocaleString()} ft`
}

/** Short altitude for table cells, e.g. "14.0k ft" */
export function fmtAltitudeShort(ft: number | null, unit: string): string {
  if (ft == null) return "—"
  if (unit === "m") {
    const m = Math.round(ft * 0.3048)
    return `${(m / 1000).toFixed(1)}k m`
  }
  return `${(ft / 1000).toFixed(1)}k ft`
}
