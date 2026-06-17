export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase/admin'
import { AdminPageHeader } from '@/components/admin/ui'
import Link from 'next/link'
import { ArrowLeft, Smartphone } from 'lucide-react'

const PAGE_SIZE = 25

export default async function AllTokenHoldersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string; page?: string }>
}) {
  const { q = '', filter = 'all', page: pageStr = '1' } = await searchParams
  const page = Math.max(1, parseInt(pageStr, 10) || 1)
  const db = createAdminClient()

  const { data: rows } = await db
    .from('notification_preferences')
    .select('user_id, push_token, announcements, users(email, full_name)')
    .not('push_token', 'is', null)

  type RawRow = {
    user_id: string
    push_token: string
    announcements: boolean
    users: { email: string; full_name: string | null } | { email: string; full_name: string | null }[] | null
  }

  const allHolders = (rows ?? [] as RawRow[]).map((r: RawRow) => {
    const u = Array.isArray(r.users) ? r.users[0] : r.users
    return {
      userId:        r.user_id,
      email:         u?.email ?? r.user_id,
      fullName:      u?.full_name ?? null,
      token:         r.push_token,
      announcements: r.announcements,
    }
  })

  // Filter by opted-in status
  let filtered = allHolders
  if (filter === 'in')  filtered = allHolders.filter(h => h.announcements)
  if (filter === 'out') filtered = allHolders.filter(h => !h.announcements)

  // Filter by search query
  if (q.trim()) {
    const lq = q.toLowerCase()
    filtered = filtered.filter(h =>
      h.email.toLowerCase().includes(lq) ||
      (h.fullName ?? '').toLowerCase().includes(lq) ||
      h.token.toLowerCase().includes(lq)
    )
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage   = Math.min(page, totalPages)
  const paged      = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  function pageUrl(p: number) {
    const params = new URLSearchParams()
    if (q)           params.set('q', q)
    if (filter !== 'all') params.set('filter', filter)
    if (p > 1)       params.set('page', String(p))
    const qs = params.toString()
    return `/admin/announcements/tokens${qs ? `?${qs}` : ''}`
  }

  const FILTER_TABS = [
    { label: 'All',       value: 'all', count: allHolders.length },
    { label: 'Opted in',  value: 'in',  count: allHolders.filter(h => h.announcements).length },
    { label: 'Opted out', value: 'out', count: allHolders.filter(h => !h.announcements).length },
  ]

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/announcements" className="flex items-center gap-1.5 text-xs text-fg-3 hover:text-fg transition-colors">
          <ArrowLeft size={12} />
          Back to compose
        </Link>
      </div>

      <AdminPageHeader
        title="Push Token Holders"
        sub={`${allHolders.length} registered device${allHolders.length !== 1 ? 's' : ''}`}
      />

      {/* Search + filter */}
      <div className="flex items-center gap-3 mt-5 mb-4">
        <form method="GET" action="/admin/announcements/tokens" className="flex-1 flex items-center gap-2 px-3 py-2 bg-surface border border-border rounded-md max-w-md">
          <Smartphone size={12} className="text-fg-3 shrink-0" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search by name, email or token…"
            className="flex-1 bg-transparent text-xs text-fg outline-none placeholder:text-fg-3"
          />
          {filter !== 'all' && <input type="hidden" name="filter" value={filter} />}
        </form>
        <div className="flex gap-1.5">
          {FILTER_TABS.map(tab => (
            <Link
              key={tab.value}
              href={`/admin/announcements/tokens?${new URLSearchParams({ ...(q ? { q } : {}), ...(tab.value !== 'all' ? { filter: tab.value } : {}) }).toString()}`}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm border text-xs font-medium transition-colors
                ${filter === tab.value
                  ? 'bg-sky/10 text-sky border-sky/30'
                  : 'bg-surface text-fg-2 border-border hover:border-border-strong'}`}
            >
              {tab.label}
              <span className="font-mono text-[10px] opacity-70">{tab.count}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface border border-border rounded-md overflow-hidden">
        {paged.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-fg-3">
            <Smartphone size={28} className="mb-3 opacity-30" />
            <p className="text-sm">No token holders found.</p>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-surface-2">
                <th className="text-left font-mono text-[10px] text-fg-3 uppercase tracking-widest px-4 py-2.5">User</th>
                <th className="text-left font-mono text-[10px] text-fg-3 uppercase tracking-widest px-4 py-2.5">Token</th>
                <th className="text-left font-mono text-[10px] text-fg-3 uppercase tracking-widest px-4 py-2.5">Announcements</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((h, i) => (
                <tr key={h.userId} className={`border-b border-dashed border-border last:border-0 hover:bg-surface-2 transition-colors ${i % 2 === 0 ? '' : 'bg-surface-2/40'}`}>
                  <td className="px-4 py-3">
                    <Link href={`/admin/users/${h.userId}`} className="font-medium text-fg hover:text-sky transition-colors">
                      {h.fullName || h.email}
                    </Link>
                    {h.fullName && <div className="font-mono text-[10px] text-fg-3 mt-0.5">{h.email}</div>}
                  </td>
                  <td className="px-4 py-3 font-mono text-[10px] text-fg-3 max-w-xs truncate">{h.token}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 font-mono text-[10px] px-2 py-0.5 rounded-sm ${h.announcements ? 'bg-ok/10 text-ok' : 'bg-surface-2 text-fg-3 border border-border'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${h.announcements ? 'bg-ok' : 'bg-fg-3'}`} />
                      {h.announcements ? 'Opted in' : 'Opted out'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="font-mono text-[10px] text-fg-3">
            {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <div className="flex gap-1.5">
            {safePage > 1 && (
              <Link href={pageUrl(safePage - 1)} className="px-3 py-1.5 text-xs font-mono border border-border rounded-sm hover:bg-surface-2 transition-colors">← Prev</Link>
            )}
            <span className="px-3 py-1.5 text-xs font-mono bg-sky/10 text-sky border border-sky/30 rounded-sm">
              {safePage} / {totalPages}
            </span>
            {safePage < totalPages && (
              <Link href={pageUrl(safePage + 1)} className="px-3 py-1.5 text-xs font-mono border border-border rounded-sm hover:bg-surface-2 transition-colors">Next →</Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
