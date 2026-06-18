import { createAdminClient } from '@/lib/supabase/admin'
import SettingsTabs from '@/components/admin/SettingsTabs'
import { AdminCard, AdminPageHeader } from '@/components/admin/ui'
import ResetRevenueButton from '@/components/admin/ResetRevenueButton'

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
    <div>
      <SettingsTabs
        admins={adminsWithSignIn as Parameters<typeof SettingsTabs>[0]['admins']}
        auditEntries={(auditEntries ?? []) as unknown as Parameters<typeof SettingsTabs>[0]['auditEntries']}
      />

      <div className="mt-6">
        <AdminPageHeader title="Danger zone" sub="Irreversible operations — super-admin only" />
        <AdminCard title="DATA TOOLS">
          <div className="flex items-center justify-between py-2.5">
            <div>
              <div className="text-sm font-medium text-fg">Reset revenue data</div>
              <div className="font-mono text-[10px] text-fg-3 mt-0.5">Zeroes price_at_signup on all subscriptions — affects MRR / ARR figures</div>
            </div>
            <ResetRevenueButton />
          </div>
        </AdminCard>
      </div>
    </div>
  )
}
