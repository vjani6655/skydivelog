import { NextRequest, NextResponse } from 'next/server'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateUserExports } from '@/lib/generate-user-exports'
import { sendEmailViaZoho }    from '@/lib/email'

export const dynamic     = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  // Admin-only
  const supabase = await createClient()
  const { data: { user: adminUser } } = await supabase.auth.getUser()
  if (!adminUser) return new Response('Unauthorized', { status: 401 })

  const db = createAdminClient()
  const { data: adminRow } = await db
    .from('admins')
    .select('id')
    .eq('email', adminUser.email!)
    .eq('active', true)
    .maybeSingle()
  if (!adminRow) return new Response('Forbidden', { status: 403 })

  const { email } = await req.json().catch(() => ({}))
  if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 })

  // Look up the target user by email
  const { data: { users }, error: listErr } = await db.auth.admin.listUsers({ perPage: 1000 })
  if (listErr) return NextResponse.json({ error: listErr.message }, { status: 500 })

  const target = users.find(u => u.email?.toLowerCase() === email.toLowerCase())
  if (!target) return NextResponse.json({ error: `No user found with email: ${email}` }, { status: 404 })

  const today = new Date().toISOString().split('T')[0]

  try {
    const exports = await generateUserExports(target.id, db)

    await sendEmailViaZoho({
      to:      target.email!,
      subject: '[TEST] Your Jump Logs export — account deleted',
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
      <tr><td style="padding:12px 40px;background:#2A1A00;border-radius:16px 16px 0 0;border-bottom:1px solid #4A3000;">
        <p style="margin:0;font-size:12px;font-weight:600;color:#FFB347;">TEST EMAIL &mdash; account was NOT deleted</p>
      </td></tr>
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
      attachments: exports.jumpCount > 0 ? [
        { filename: `${exports.slug}-logbook-single-${today}.pdf`,  content: exports.singlePdf,  contentType: 'application/pdf' },
        { filename: `${exports.slug}-logbook-compact-${today}.pdf`, content: exports.tenPdf,     contentType: 'application/pdf' },
        { filename: `${exports.slug}-logbook-${today}.csv`,         content: exports.csvBuffer,  contentType: 'text/csv' },
      ] : [],
    })

    return NextResponse.json({
      ok:        true,
      email:     target.email,
      jumpCount: exports.jumpCount,
      userName:  exports.userName,
    })
  } catch (err) {
    console.error('[test-delete-email]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
