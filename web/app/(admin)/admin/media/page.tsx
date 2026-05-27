import { createAdminClient } from '@/lib/supabase/admin'
import MediaClient from './MediaClient'

export default async function AdminMediaPage() {
  const db = createAdminClient()
  const { data } = await db
    .from('app_media')
    .select('slot, label, description, url, updated_at')
    .order('slot')

  return <MediaClient initialSlots={(data ?? []) as Parameters<typeof MediaClient>[0]['initialSlots']} />
}
