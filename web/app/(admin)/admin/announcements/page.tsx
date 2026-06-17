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
    { data: tokenRows },
  ] = await Promise.all([
    db.from('announcements')
      .select('id, title, sent_at, segment_key, segments(name)')
      .eq('status', 'sent')
      .order('sent_at', { ascending: false })
      .limit(100),
    db.from('segments').select('id, name').order('name'),
    db.from('users').select('*', { count: 'exact', head: true }),
    db.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    db.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'trial'),
    db.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'overdue'),
    db.from('admins').select('id, email').limit(100),
    db.from('notification_preferences')
      .select('user_id, push_token, announcements, users(email, full_name)')
      .not('push_token', 'is', null),
  ])

  const adminId = adminRows?.[0]?.id ?? ''

  const pushTokenHolders = (tokenRows ?? []).map((r: {
    user_id: string
    push_token: string
    announcements: boolean
    users: { email: string; full_name: string | null } | { email: string; full_name: string | null }[] | null
  }) => {
    const u = Array.isArray(r.users) ? r.users[0] : r.users
    return {
      userId:        r.user_id,
      email:         u?.email ?? r.user_id,
      fullName:      u?.full_name ?? null,
      token:         r.push_token,
      announcements: r.announcements,
    }
  })

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
      pushTokenHolders={pushTokenHolders}
    />
  )
}
