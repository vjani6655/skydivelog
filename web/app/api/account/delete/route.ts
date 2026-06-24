import { NextRequest, NextResponse } from "next/server"
import { createClient }      from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { verifyBearerToken } from "@/lib/supabase/bearer"
import { generateUserExports } from "@/lib/generate-user-exports"
import { sendEmailViaZoho }    from "@/lib/email"

export const dynamic     = 'force-dynamic'
export const maxDuration = 60

const BCC_DELETE = 'deleteaccount@jumplogs.com'

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

    const adminClient = createAdminClient()
    const today       = new Date().toISOString().split('T')[0]

    // Generate exports and email them (best-effort — never block deletion if this fails)
    try {
      const exports = await generateUserExports(user.id, adminClient)

      if (exports.jumpCount > 0) {
        await sendEmailViaZoho({
          to:      user.email!,
          bcc:     BCC_DELETE,
          subject: 'Your Jump Logs export — account deleted',
          html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Your Jump Logs export</title></head>
<body style="margin:0;padding:0;background:#0A1220;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#0A1220;">
  <tr><td align="center" style="padding:48px 20px 40px;">

    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:520px;">
      <tr><td align="center" style="padding-bottom:28px;">
        <span style="font-size:22px;font-weight:800;color:#E8EEF8;letter-spacing:-0.5px;">Jump<span style="color:#4A9EFF;">Logs</span></span>
      </td></tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:520px;background:#121C2E;border-radius:16px;border:1px solid #243349;">
      <tr><td style="padding:40px 40px 32px;">

        <h1 style="margin:0 0 10px;font-size:24px;font-weight:700;color:#E8EEF8;letter-spacing:-0.3px;line-height:1.25;">Your logbook export is attached.</h1>
        <p style="margin:0 0 24px;font-size:15px;color:#8B9BB5;line-height:1.65;">
          Hi ${exports.userName}, your Jump Logs account has been deleted. We&apos;ve attached a complete copy of your jump history so it&apos;s always with you.
        </p>

        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:28px;">
          <tr><td style="background:#1A2740;border:1px solid #2F4060;border-radius:8px;padding:16px 20px;">
            <p style="margin:0 0 8px;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#5A6B85;">Attached files</p>
            <p style="margin:0 0 6px;font-size:13px;color:#C8D8F0;">&ndash;&nbsp; ${exports.slug}-logbook-single-${today}.pdf &mdash; full detail, 1 jump per page</p>
            <p style="margin:0 0 6px;font-size:13px;color:#C8D8F0;">&ndash;&nbsp; ${exports.slug}-logbook-compact-${today}.pdf &mdash; compact, 6 jumps per page</p>
            <p style="margin:0;font-size:13px;color:#C8D8F0;">&ndash;&nbsp; ${exports.slug}-logbook-${today}.csv &mdash; spreadsheet format</p>
          </td></tr>
        </table>

        <p style="margin:0;font-size:14px;color:#8B9BB5;line-height:1.65;">
          All your data has been permanently removed from our servers. Thank you for being part of the Jump Logs community &mdash; blue skies and soft landings.
        </p>

      </td></tr>
      <tr><td style="border-top:1px solid #243349;padding:18px 40px;border-radius:0 0 16px 16px;">
        <p style="margin:0;font-size:12px;color:#3D4E6A;line-height:1.6;">If you didn&apos;t request account deletion, please contact us immediately at <a href="mailto:support@jumplogs.com" style="color:#4A9EFF;text-decoration:none;">support@jumplogs.com</a>.</p>
      </td></tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:520px;margin-top:28px;">
      <tr><td align="center">
        <p style="margin:0;font-size:12px;color:#3D4E6A;line-height:1.8;">
          <a href="https://www.jumplogs.com" style="color:#5A6B85;text-decoration:none;">jumplogs.com</a> &nbsp;&middot;&nbsp;
          <a href="https://www.jumplogs.com/privacy" style="color:#5A6B85;text-decoration:none;">Privacy</a> &nbsp;&middot;&nbsp;
          <a href="https://www.jumplogs.com/terms" style="color:#5A6B85;text-decoration:none;">Terms</a>
        </p>
      </td></tr>
    </table>

  </td></tr>
</table>
</body>
</html>`,
          attachments: [
            { filename: `${exports.slug}-logbook-single-${today}.pdf`,   content: exports.singlePdf,  contentType: 'application/pdf' },
            { filename: `${exports.slug}-logbook-compact-${today}.pdf`,  content: exports.tenPdf,     contentType: 'application/pdf' },
            { filename: `${exports.slug}-logbook-${today}.csv`,          content: exports.csvBuffer,  contentType: 'text/csv' },
          ],
        })
      }
    } catch (exportErr) {
      console.error('[delete] export/email failed (continuing with deletion):', exportErr)
    }

    // Delete user — cascades to all data via FK constraints
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
