export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase/admin'
import { AdminPageHeader, Badge } from '@/components/admin/ui'
import Link from 'next/link'
import { ArrowLeft, Bell, Search } from 'lucide-react'

const PAGE_SIZE = 25

function fmtDateTime(s: string | null) {
  if (!s) return '—'
  return new Date(s).toLocaleString('en-AU', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const STATUS_KIND: Record<string, 'ok' | 'sky' | 'warn' | 'muted'> = {
  sent:     'ok',
  draft:    'muted',
  schedule: 'sky',
}

export default async function AllAnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>
}) {
  const { status = 'all', q = '', page: pageStr = '1' } = await searchParams
  const page = Math.max(1, parseInt(pageStr, 10) || 1)
  const db = createAdminClient()

  const [
    { count: sentCount },
    { count: draftCount },
    { count: scheduledCount },
  ] = await Promise.all([
    db.from('announcements').select('*', { count: 'exact', head: true }).eq('status', 'sent'),
    db.from('announcements').select('*', { count: 'exact', head: true }).eq('status', 'draft'),
    db.from('announcements').select('*', { count: 'exact', head: true }).eq('status', 'schedule'),
  ])

  let dbQuery = db
    .from('announcements')
    .select('id, title, body, status, channels, schedule_mode, sent_at, created_at, segments ( name )')
    .order('created_at', { ascending: false })
    .limit(500)

  if (status !== 'all') dbQuery = dbQuery.eq('status', status)

  const { data: rows } = await dbQuery

  type AnnRow = {
    id: string
    title: string
    body: string
    status: string
    channels: string[]
    schedule_mode: string
    sent_at: string | null
    created_at: string
    segments: { name: string } | null
  }

  let announcements = (rows ?? []) as unknown as AnnRow[]

  // Client-side text filter (title / body)
  if (q.trim()) {
    const lq = q.toLowerCase()
    announcements = announcements.filter(a =>
      a.title.toLowerCase().includes(lq) || a.body.toLowerCase().includes(lq)
    )
  }

  const totalPages = Math.max(1, Math.ceil(announcements.length / PAGE_SIZE))
  const safePage   = Math.min(page, totalPages)
  const paged      = announcements.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  function pageUrl(p: number) {
    const params = new URLSearchParams()
    if (status !== 'all') params.set('status', status)
    if (q)               params.set('q', q)
    if (p > 1)           params.set('page', String(p))
    const qs = params.toString()
    return `/admin/announcements/all${qs ? `?${qs}` : ''}`
  }

  const TABS = [
    { label: 'All',       value: 'all',      count: (sentCount ?? 0) + (draftCount ?? 0) + (scheduledCount ?? 0) },
    { label: 'Sent',      value: 'sent',     count: sentCount ?? 0 },
    { label: 'Drafts',    value: 'draft',    count: draftCount ?? 0 },
    { label: 'Scheduled', value: 'schedule', count: scheduledCount ?? 0 },
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
        title="All announcements"
        sub={`${(sentCount ?? 0).toLocaleString()} SENT`}
      />

      {/* Filter bar */}
      <div className="flex items-center gap-3 mt-5 mb-4">
        <form method="GET" action="/admin/announcements/all" className="flex-1 flex items-center gap-2 px-3 py-2 bg-surface border border-border rounded-md max-w-md">
          <Search size={12} className="text-fg-3 shrink-0" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search title or body…"
            className="flex-1 bg-transparent text-xs text-fg outline-none placeholder:text-fg-3"
          />
          {status !== 'all' && <input type="hidden" name="status" value={status} />}
        </form>
        <div className="flex gap-1.5">
          {TABS.map(tab => (
            <Link
              key={tab.value}
              href={`/admin/announcements/all?${new URLSearchParams({ ...(q ? { q } : {}), ...(tab.value !== 'all' ? { status: tab.value } : {}) }).toString()}`}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm border text-xs font-medium transition-colors
                ${status === tab.value
                  ? 'bg-sky/10 text-sky border-sky/30'
                  : 'bg-surface text-fg-2 border-border hover:border-border-strong'}`}
            >
              {tab.label}
              <span className="font-mono text-[10px] opacity-70">{tab.count.toLocaleString()}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface border border-border rounded-md overflow-hidden">
        {paged.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-fg-3">
            <Bell size={28} className="mb-3 opacity-30" />
            <p className="text-sm">No announcements found.</p>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-surface-2">
                <th className="text-left font-mono text-[10px] text-fg-3 uppercase tracking-widest px-4 py-2.5">Title</th>
                <th className="text-left font-mono text-[10px] text-fg-3 uppercase tracking-widest px-4 py-2.5">Segment</th>
                <th className="text-left font-mono text-[10px] text-fg-3 uppercase tracking-widest px-4 py-2.5">Channels</th>
                <th className="text-left font-mono text-[10px] text-fg-3 uppercase tracking-widest px-4 py-2.5">Status</th>
                <th className="text-left font-mono text-[10px] text-fg-3 uppercase tracking-widest px-4 py-2.5">Sent / Created</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((ann, i) => (
                <tr key={ann.id} className={`border-b border-dashed border-border last:border-0 hover:bg-surface-2 transition-colors ${i % 2 === 0 ? '' : 'bg-surface-2/40'}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-fg">{ann.title}</p>
                    <p className="text-fg-3 mt-0.5 line-clamp-1 max-w-xs">{ann.body}</p>
                  </td>
                  <td className="px-4 py-3 text-fg-2">
                    {ann.segments?.name ?? 'All users'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(ann.channels ?? []).map(c => (
                        <span key={c} className="font-mono text-[10px] bg-surface border border-border text-fg-3 px-1.5 py-0.5 rounded-sm capitalize">
                          {c.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge kind={STATUS_KIND[ann.status] ?? 'muted'}>
                      {ann.status.toUpperCase()}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-mono text-fg-3">
                    {fmtDateTime(ann.sent_at ?? ann.created_at)}
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
            {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, announcements.length)} of {announcements.length}
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
