export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  // Verify the caller is an admin
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const db = createAdminClient()
  const { data: adminRow } = await db.from('admins').select('user_id').eq('user_id', user.id).maybeSingle()
  if (!adminRow) return new Response('Forbidden', { status: 403 })

  // Parse query params from the request URL
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') ?? 'all'
  const q = searchParams.get('q') ?? ''
  const sort = searchParams.get('sort') ?? 'seen'

  // Fetch subs for filtering
  const { data: allSubs } = await db.from('subscriptions').select('user_id, status')
  const subscribedIds  = allSubs?.map(s => s.user_id) ?? []
  const activeIds      = allSubs?.filter(s => s.status === 'active').map(s => s.user_id) ?? []
  const overdueIds     = allSubs?.filter(s => s.status === 'overdue').map(s => s.user_id) ?? []
  const cancelledIds   = allSubs?.filter(s => s.status === 'cancelled').map(s => s.user_id) ?? []
  const trialCutoff    = new Date(); trialCutoff.setDate(trialCutoff.getDate() - 14)

  let filterIds: string[] | null = null
  if (status === 'active')    filterIds = activeIds
  else if (status === 'overdue')   filterIds = overdueIds
  else if (status === 'cancelled') filterIds = cancelledIds
  else if (status === 'trial') {
    let tq = db.from('users').select('id').gte('created_at', trialCutoff.toISOString())
    if (subscribedIds.length > 0) tq = tq.not('id', 'in', `(${subscribedIds.join(',')})`)
    const { data: tUsers } = await tq
    filterIds = tUsers?.map(u => u.id) ?? []
  }

  let usersQuery = db
    .from('users')
    .select('id, email, full_name, licence_number, licence_rating, country, created_at, last_sign_in_at, subscriptions(status, renews_at, price_at_signup)')
    .order(sort === 'seen' ? 'last_sign_in_at' : sort === 'name' ? 'full_name' : 'created_at', { ascending: sort === 'name' })
    .limit(5000)

  if (q) usersQuery = usersQuery.or(`email.ilike.%${q}%,full_name.ilike.%${q}%`)
  if (filterIds !== null) {
    usersQuery = filterIds.length > 0
      ? usersQuery.in('id', filterIds)
      : usersQuery.in('id', ['00000000-0000-0000-0000-000000000000'])
  }

  const { data: users } = await usersQuery

  // Fetch jump counts
  const userIds = (users ?? []).map(u => u.id)
  const { data: jumpRows } = await db.from('jumps').select('user_id').in('user_id', userIds).is('deleted_at', null)
  const jumpMap: Record<string, number> = {}
  jumpRows?.forEach(j => { jumpMap[j.user_id] = (jumpMap[j.user_id] ?? 0) + 1 })

  // Build CSV
  const headers = ['Email', 'Full Name', 'Licence #', 'Rating', 'Country', 'Status', 'Jumps', 'Sub Renews', 'Joined', 'Last Seen']
  const fmtDate = (s: string | null) => s ? new Date(s).toLocaleDateString('en-AU') : ''
  const escape  = (v: string | null | undefined) => {
    const s = String(v ?? '')
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
  }

  const subMap: Record<string, { status: string; renews_at: string | null }> = {}
  allSubs?.forEach(s => { subMap[s.user_id] = s })

  const csvRows = (users ?? []).map(u => {
    const sub = Array.isArray(u.subscriptions) ? u.subscriptions[0] : u.subscriptions
    const trialEnd = new Date(u.created_at); trialEnd.setDate(trialEnd.getDate() + 14)
    const inTrial  = !sub && Date.now() < trialEnd.getTime()
    const subStatus = inTrial ? 'trial' : (sub as any)?.status ?? 'expired'
    return [
      escape(u.email),
      escape(u.full_name),
      escape(u.licence_number),
      escape((u as any).licence_rating),
      escape((u as any).country),
      escape(subStatus),
      String(jumpMap[u.id] ?? 0),
      escape(fmtDate((sub as any)?.renews_at ?? null)),
      escape(fmtDate(u.created_at)),
      escape(fmtDate(u.last_sign_in_at)),
    ].join(',')
  })

  const csv = [headers.join(','), ...csvRows].join('\n')
  const filename = `users_${new Date().toISOString().slice(0, 10)}.csv`

  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
