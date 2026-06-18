export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase/admin'
import ReleasesClient from './ReleasesClient'
import type { Release } from './ReleasesClient'

export default async function AdminReleasesPage() {
  const db = createAdminClient()
  const { data: releases, error } = await db
    .from('releases')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  // sort_order column may not exist yet — fall back to created_at ordering
  if (error) {
    const { data: fallback } = await db
      .from('releases')
      .select('*')
      .order('created_at', { ascending: false })
    return <ReleasesClient initialReleases={(fallback ?? []) as Release[]} />
  }

  return <ReleasesClient initialReleases={(releases ?? []) as Release[]} />
}
