import { createAdminClient } from '@/lib/supabase/admin'
import AnnouncementsCompose from '@/components/admin/AnnouncementsCompose'
export default async function AdminAnnouncementsPage() {
  const db = createAdminClient()

  const [
    { data: recentSends },
    { data: segments },
    { count: totalUsers },
    { count: activeUsers },
    { count: trialUsers },
    { count: overdueUsers },
    { data: adminRows },
  ] = await Promise.all([
    db.from('announcements')
      .select('id, title, sent_at, segments(name)')
      .eq('status', 'sent')
      .order('sent_at', { ascending: false })
      .limit(8),
    db.from('segments').select('id, name').order('name'),
    db.from('users').select('*', { count: 'exact', head: true }),
    db.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    db.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'trial'),
    db.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'overdue'),
    db.from('admins').select('id, email').limit(100),
  ])

  // We pass the full list of admin IDs so the client can pick the current one by email
  // (The client calls auth.getUser() then matches email)
  // For simplicity, pass the first admin id as fallback — client will resolve from email
  const adminId = adminRows?.[0]?.id ?? ''

  return (
    <AnnouncementsCompose
      recentSends={(recentSends ?? []) as unknown as Parameters<typeof AnnouncementsCompose>[0]['recentSends']}
      segments={(segments ?? []) as { id: string; name: string }[]}
      recipientCounts={{
        all:     totalUsers ?? 0,
        active:  activeUsers ?? 0,
        trial:   trialUsers ?? 0,
        overdue: overdueUsers ?? 0,
      }}
      adminId={adminId}
    />
  )
}
