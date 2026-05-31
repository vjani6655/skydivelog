import { createAdminClient } from '@/lib/supabase/admin'
import SettingsTabs from '@/components/admin/SettingsTabs'

export default async function AdminSettingsPage() {
  const db = createAdminClient()

  const [
    { data: admins },
    { data: auditEntries },
  ] = await Promise.all([
    db.from('admins').select('id, name, email, role, active').order('role').order('name'),
    db.from('audit_log')
      .select('id, action, target, reason, created_at, admins(name)')
      .order('created_at', { ascending: false })
      .limit(8),
  ])

  // Merge last_sign_in_at from auth.users (admins table column is never written to)
  const adminEmails = (admins ?? []).map(a => a.email)
  const { data: authList } = adminEmails.length
    ? await db.auth.admin.listUsers({ perPage: 1000 })
    : { data: { users: [] } }
  const authByEmail: Record<string, string | null> = {}
  ;(authList?.users ?? []).forEach(u => {
    if (u.email) authByEmail[u.email] = u.last_sign_in_at ?? null
  })

  const adminsWithSignIn = (admins ?? []).map(a => ({
    ...a,
    last_sign_in_at: authByEmail[a.email] ?? null,
  }))

  return (
    <SettingsTabs
      admins={adminsWithSignIn as Parameters<typeof SettingsTabs>[0]['admins']}
      auditEntries={(auditEntries ?? []) as unknown as Parameters<typeof SettingsTabs>[0]['auditEntries']}
    />
  )
}
