export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase/admin'
import ReleasesClient from './ReleasesClient'

export default async function AdminReleasesPage() {
  const db = createAdminClient()
  let { data: releases, error } = await db
    .from('releases')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  // sort_order column may not exist yet — fall back to created_at ordering
  if (error) {
    ;({ data: releases } = await db
      .from('releases')
      .select('*')
      .order('created_at', { ascending: false }))
  }

  return <ReleasesClient initialReleases={(releases ?? []) as any} />
}
