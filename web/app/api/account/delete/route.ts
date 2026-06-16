import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { verifyBearerToken } from "@/lib/supabase/bearer"

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json()

    if (!password) {
      return NextResponse.json({ error: "Password is required." }, { status: 400 })
    }

    // Support both mobile Bearer token and web cookie-based auth
    const authHeader = req.headers.get("authorization")
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null

    let user: { id: string; email?: string } | null = null

    if (bearerToken) {
      const { data, error } = await verifyBearerToken(bearerToken)
      if (error || !data.user) {
        return NextResponse.json({ error: "Not authenticated." }, { status: 401 })
      }
      user = data.user
    } else {
      const supabase = await createClient()
      const { data, error: userError } = await supabase.auth.getUser()
      if (userError || !data.user) {
        return NextResponse.json({ error: "Not authenticated." }, { status: 401 })
      }
      user = data.user
    }

    // Verify password by re-authenticating with an anon client
    const { createClient: createAnonClient } = await import("@supabase/supabase-js")
    const anonClient = createAnonClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    )
    const { error: signInError } = await anonClient.auth.signInWithPassword({
      email: user.email!,
      password,
    })

    if (signInError) {
      return NextResponse.json({ error: "Incorrect password." }, { status: 400 })
    }

    // Delete user via admin client (cascades to all user data via FK constraints)
    const adminClient = createAdminClient()
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    // Sign out server-side session if using cookie auth
    if (!bearerToken) {
      const supabase = await createClient()
      await supabase.auth.signOut()
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 })
  }
}
