export const dynamic = 'force-dynamic'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.jumplogs.com'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const tokenHash = searchParams.get('t')

  if (!tokenHash) {
    return Response.redirect(`${APP_URL}/reset-password?error_code=otp_expired`)
  }

  // Only allow the 'recovery' type to prevent misuse
  const type = 'recovery'
  const redirectTo = `${APP_URL}/reset-password`

  // Construct the Supabase verify URL from the token hash
  const verifyUrl =
    `${SUPABASE_URL}/auth/v1/verify` +
    `?token=${encodeURIComponent(tokenHash)}` +
    `&type=${type}` +
    `&redirect_to=${encodeURIComponent(redirectTo)}`

  // Base64-encode the verify URL so it is NOT a plain href in the email.
  // Email security scanners follow plain href links and can consume single-use
  // Supabase tokens before the user clicks. Encoding the URL and decoding it
  // via JavaScript (which scanners don't execute) prevents pre-consumption.
  const encoded = Buffer.from(verifyUrl).toString('base64')

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
    <button id="btn">Continue to reset password</button>
  </div>
  <script>
    document.getElementById('btn').addEventListener('click', function () {
      this.disabled = true;
      this.textContent = 'Redirecting\u2026';
      window.location.href = atob('${encoded}');
    });
  </script>
</body>
</html>`

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
