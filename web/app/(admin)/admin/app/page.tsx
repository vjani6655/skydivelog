import { createAdminClient } from '@/lib/supabase/admin'
import AppConfigClient from '@/components/admin/AppConfigClient'
import { Smartphone } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AppConfigPage() {
  const db = createAdminClient()

  // Ensure the singleton row exists (first time after migration)
  const { data } = await db
    .from('app_config')
    .select('*')
    .eq('id', 'singleton')
    .maybeSingle()

  const config = data ?? {
    id: 'singleton',
    force_upgrade_enabled: false,
    minimum_version: '0.0.0',
    upgrade_title: 'Update Required',
    upgrade_message: 'A new version of Jump Logs is available. Please update to continue.',
    ios_store_url: null,
    android_store_url: null,
    updated_at: new Date().toISOString(),
    updated_by_email: null,
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-9 h-9 rounded-lg bg-sky/10 border border-sky/20 flex items-center justify-center">
          <Smartphone size={16} className="text-sky" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-fg">Force Upgrade</h1>
          <p className="text-xs text-fg-3 mt-0.5">
            Block older app versions in real time — changes take effect instantly without any app restart.
          </p>
        </div>
      </div>

      <AppConfigClient initial={config} />
    </div>
  )
}
