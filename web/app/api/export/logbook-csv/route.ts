import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  const { data: jumps, error } = await supabase
    .from("jumps")
    .select(
      "jump_number, date, jump_type, aircraft_type, aircraft_rego, exit_altitude_ft, freefall_seconds, canopy_seconds, notes, dropzones(name)"
    )
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .order("jump_number", { ascending: true })

  if (error) {
    return new NextResponse("Failed to fetch logbook", { status: 500 })
  }

  const header = [
    "Jump #",
    "Date",
    "Type",
    "Dropzone",
    "Aircraft",
    "Rego",
    "Exit Alt (ft)",
    "Freefall (s)",
    "Canopy (s)",
    "Notes",
  ]

  const rows = (jumps ?? []).map((j) => {
    const dz = (Array.isArray(j.dropzones) ? j.dropzones[0] : j.dropzones as { name: string } | null)?.name ?? ""
    const dateStr = j.date ? new Date(j.date).toISOString().slice(0, 10) : ""
    const notes = (j.notes ?? "").replace(/"/g, '""')
    return [
      j.jump_number ?? "",
      dateStr,
      j.jump_type ?? "",
      dz,
      j.aircraft_type ?? "",
      j.aircraft_rego ?? "",
      j.exit_altitude_ft ?? "",
      j.freefall_seconds ?? "",
      j.canopy_seconds ?? "",
      `"${notes}"`,
    ]
  })

  const csv = [header.join(","), ...rows.map((r) => r.join(","))].join("\n")
  const today = new Date().toISOString().split("T")[0]

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="logbook_${today}.csv"`,
    },
  })
}
