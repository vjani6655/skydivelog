import { createServerClient } from '@supabase/ssr'
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
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
