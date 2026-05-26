import { createAdminClient } from '@/lib/supabase/admin'
import SupportInbox from '@/components/admin/SupportInbox'

export default async function AdminSupportPage() {
  const db = createAdminClient()

  const [
    { data: tickets },
    { count: openCount },
    { count: waitingCount },
    { count: closedCount },
  ] = await Promise.all([
    db.from('support_tickets')
      .select('id, user_id, subject, category, status, severity, created_at, users(full_name)')
      .not('status', 'eq', 'closed')
      .order('created_at', { ascending: false })
      .limit(50),
    db.from('support_tickets').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    db.from('support_tickets').select('*', { count: 'exact', head: true }).eq('status', 'waiting'),
    db.from('support_tickets').select('*', { count: 'exact', head: true }).eq('status', 'closed'),
  ])

  return (
    <SupportInbox
      initialTickets={(tickets ?? []) as unknown as Parameters<typeof SupportInbox>[0]['initialTickets']}
      openCount={openCount ?? 0}
      waitingCount={waitingCount ?? 0}
      closedCount={closedCount ?? 0}
    />
  )
}
