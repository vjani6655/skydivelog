import { createAdminClient } from '@/lib/supabase/admin'
import SettingsTabs from '@/components/admin/SettingsTabs'

export default async function AdminSettingsPage() {
  const db = createAdminClient()

  const [
    { data: admins },
    { data: auditEntries },
  ] = await Promise.all([
    // Service-role client needed here — admin RLS only allows reading own row
    db.from('admins').select('id, name, email, role, last_sign_in_at, active').order('role').order('name'),
    db.from('audit_log')
      .select('id, action, target, reason, created_at, admins(name)')
      .order('created_at', { ascending: false })
      .limit(8),
  ])

  return (
    <SettingsTabs
      admins={(admins ?? []) as Parameters<typeof SettingsTabs>[0]['admins']}
      auditEntries={(auditEntries ?? []) as unknown as Parameters<typeof SettingsTabs>[0]['auditEntries']}
    />
  )
}
