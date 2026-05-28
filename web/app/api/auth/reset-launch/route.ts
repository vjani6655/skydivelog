export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.jumplogs.com'

// ---------------------------------------------------------------------------
// POST — called when the user clicks "Continue to reset password" on the page
// below. Form submits are never pre-fetched by email link scanners, so the
// single-use token is only consumed when a real user actually clicks.
// ---------------------------------------------------------------------------
export async function POST(request: Request) {
  const formData = await request.formData()
  const tokenHash = formData.get('t') as string | null

  if (!tokenHash) {
    return NextResponse.redirect(`${APP_URL}/reset-password?error_code=otp_expired`, { status: 303 })
  }

  const cookieStore = await cookies()
  // Build the redirect we'll return on success so we can attach cookies to it.
  const successResponse = NextResponse.redirect(`${APP_URL}/reset-password`, { status: 303 })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
            successResponse.cookies.set(name, value, options)
          })
        },
      },
    },
  )

  const { error } = await supabase.auth.verifyOtp({
    type: 'recovery',
    token_hash: tokenHash,
  })

  if (error) {
    return NextResponse.redirect(`${APP_URL}/reset-password?error_code=otp_expired`, { status: 303 })
  }

  return successResponse
}

// ---------------------------------------------------------------------------
// GET — email links here. Returns a simple HTML page so scanners only see a
// form with no actionable href; the token is never exposed as a plain link.
// ---------------------------------------------------------------------------
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const tokenHash = searchParams.get('t')

  if (!tokenHash) {
    return NextResponse.redirect(`${APP_URL}/reset-password?error_code=otp_expired`)
  }

  // Escape for HTML attribute safety
  const safeToken = tokenHash.replace(/[&"<>]/g, '')

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset your password – JumpLogs</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      display: flex; align-items: center; justify-content: center;
      min-height: 100vh; margin: 0;
      background: #0a0a0a; color: #e5e5e5;
    }
    .card {
      background: #111; border: 1px solid #222; border-radius: 14px;
      padding: 2.5rem 2rem; max-width: 380px; width: 90%; text-align: center;
    }
    h1 { font-size: 1.4rem; font-weight: 700; margin: 0 0 0.5rem; }
    p  { color: #888; font-size: 0.875rem; margin: 0 0 1.75rem; line-height: 1.5; }
    button {
      background: #0ea5e9; color: #fff; border: none; border-radius: 8px;
      padding: 0.75rem 1.5rem; font-size: 0.875rem; font-weight: 600;
      cursor: pointer; width: 100%; transition: background 0.15s;
    }
    button:hover { background: #0284c7; }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Reset your password</h1>
    <p>Click below to choose a new password for your JumpLogs account.</p>
    <form method="POST" action="/api/auth/reset-launch" onsubmit="var b=this.querySelector('button');b.disabled=true;b.textContent='Redirecting\u2026';">
      <input type="hidden" name="t" value="${safeToken}" />
      <button type="submit">Continue to reset password</button>
    </form>
  </div>
</body>
</html>`

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
