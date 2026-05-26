import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

function decodeJwt(token: string): { sub?: string; exp?: number } | null {
  try {
    const payload = token.split(".")[1]
    const decoded = Buffer.from(payload, "base64url").toString("utf8")
    return JSON.parse(decoded)
  } catch {
    return null
  }
}

function fmtSeconds(s: number | null) {
  if (!s) return ""
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, "0")}`
}

function csvEscape(val: string | number | null | undefined): string {
  if (val == null) return ""
  const str = String(val)
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export async function GET(request: Request) {
  // Auth: cookie (web) or Bearer token (mobile)
  let userId: string | null = null
  const admin = createAdminClient()

  const bearerToken = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ?? null
  if (bearerToken) {
    const claims = decodeJwt(bearerToken)
    if (!claims?.sub) return new Response("Unauthorized", { status: 401 })
    if (claims.exp && claims.exp < Math.floor(Date.now() / 1000)) {
      return new Response("Token expired", { status: 401 })
    }
    userId = claims.sub
  } else {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return new Response("Unauthorized", { status: 401 })
    userId = user.id
  }

  const { searchParams } = new URL(request.url)
  const format = searchParams.get("format") ?? "csv"

  const { data: jumps } = await admin
    .from("jumps")
    .select(`
      jump_number, date, jump_type, jumper_type,
      aircraft_type, aircraft_rego,
      exit_altitude_ft, pull_altitude_ft,
      freefall_seconds, canopy_seconds,
      landing_accuracy_value, landing_accuracy_unit,
      is_favourite, notes,
      dropzones ( name, region ),
      signatures ( signer_name, signer_licence_number )
    `)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("jump_number", { ascending: true })

  if (format === "csv") {
    const headers = [
      "Jump #", "Date", "Dropzone", "Region",
      "Aircraft", "Rego", "Jump Type", "Jumper Type",
      "Exit Alt (ft)", "Pull Alt (ft)",
      "Freefall", "Canopy Time",
      "Landing Accuracy", "Signed By", "Favourite", "Notes",
    ]

    const rows = (jumps ?? []).map((j) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dz = (j as any).dropzones as { name: string; region: string } | null
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sig = ((j as any).signatures as Array<{ signer_name: string; signer_licence_number: string }>)?.[0]
      const acc = j.landing_accuracy_value != null
        ? `${j.landing_accuracy_value} ${j.landing_accuracy_unit ?? ""}`
        : ""
      return [
        j.jump_number, j.date?.slice(0, 10), dz?.name, dz?.region,
        j.aircraft_type, j.aircraft_rego, j.jump_type, j.jumper_type,
        j.exit_altitude_ft, j.pull_altitude_ft,
        fmtSeconds(j.freefall_seconds), fmtSeconds(j.canopy_seconds),
        acc.trim(), sig ? `${sig.signer_name} (${sig.signer_licence_number})` : "",
        j.is_favourite ? "Yes" : "", j.notes,
      ].map(csvEscape).join(",")
    })

    const csv = [headers.map(csvEscape).join(","), ...rows].join("\n")
    const today = new Date().toISOString().split("T")[0]

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="jumplogs-${today}.csv"`,
      },
    })
  }

  return new Response("Unsupported format", { status: 400 })
}
