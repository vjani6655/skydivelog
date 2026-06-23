import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Track last IP for authenticated users (fire-and-forget, only on non-API routes)
  if (user && !request.nextUrl.pathname.startsWith('/api/')) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
              ?? request.headers.get('x-real-ip')
              ?? null
    if (ip) {
      const { createAdminClient } = await import('@/lib/supabase/admin')
      createAdminClient().from('users').update({ last_ip: ip }).eq('id', user.id).then(() => {})
    }
  }

  const { pathname } = request.nextUrl

  // Routes that require auth AND an active subscription (trial or paid)
  const gatedRoutes   = ["/dashboard", "/logbook", "/settings"]
  // Routes that require auth only (no subscription check — needed to subscribe/manage billing)
  const authOnlyRoutes = ["/subscription", "/billing", "/delete-account"]
  const isAdminRoute   = pathname.startsWith("/admin")
  const isGated        = gatedRoutes.some((r) => pathname.startsWith(r))
  const isAuthOnly     = authOnlyRoutes.some((r) => pathname.startsWith(r))

  // Redirect unauthenticated users to login
  if (!user && (isGated || isAuthOnly || isAdminRoute)) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = "/login"
    return NextResponse.redirect(redirectUrl)
  }

  // Admin route: verify the logged-in user is in the admins table and active
  if (user && isAdminRoute) {
    const adminDb = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!,
      { auth: { persistSession: false } }
    )
    const { data: adminRow } = await adminDb
      .from('admins')
      .select('id')
      .eq('email', user.email!)
      .eq('active', true)
      .maybeSingle()
    if (!adminRow) {
      // Rewrite to the not-found page — full render pipeline, same timing and appearance
      // as any genuinely missing URL. The browser URL stays as /admin/... so nothing is revealed.
      return NextResponse.rewrite(new URL('/not-found', request.url))
    }
  }

  // Redirect authenticated users away from auth pages
  if (user && (pathname === "/login" || pathname === "/signup")) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = "/dashboard"
    return NextResponse.redirect(redirectUrl)
  }

  // Subscription gate: gated routes require an active subscription or active trial
  if (user && isGated) {
    // Free trial: 14 days from account creation, extendable via admin (stored in user_metadata)
    const trialEnd = user.user_metadata?.trial_ends_at
      ? new Date(user.user_metadata.trial_ends_at as string)
      : new Date(new Date(user.created_at).getTime() + 14 * 86400000)
    const inTrial = Date.now() < trialEnd.getTime()

    if (!inTrial) {
      // Admins (any role) always get full app access without a subscription
      const adminDb = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SECRET_KEY!,
        { auth: { persistSession: false } }
      )
      const { data: adminRow } = await adminDb
        .from('admins')
        .select('id')
        .eq('email', user.email!)
        .eq('active', true)
        .maybeSingle()
      if (adminRow) return supabaseResponse

      // Check for a paid active subscription
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("status, renews_at")
        .eq("user_id", user.id)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      const isCancelledInGrace =
        sub?.status === 'cancelled' &&
        sub?.renews_at != null &&
        new Date(sub.renews_at) > new Date()

      const isActive =
        (sub?.status === "active" &&
        sub?.renews_at != null &&
        new Date(sub.renews_at) > new Date()) ||
        isCancelledInGrace

      if (!isActive) {
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = "/subscription"
        return NextResponse.redirect(redirectUrl)
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    // Exclude static assets AND all /api/ routes (to preserve Authorization headers for mobile)
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
