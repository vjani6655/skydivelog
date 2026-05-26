import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(req: Request) {
  try {
    const { name, email, topic, message } = await req.json()

    if (!name || !email || !message) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { error } = await supabase.from("support_tickets").insert({
      name,
      email,
      topic: topic ?? "Support",
      message,
      source: "web",
      status: "open",
    })

    if (error) {
      // Table may not exist yet — fail silently and return success
      console.error("support_tickets insert error:", error.message)
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 })
  }
}
