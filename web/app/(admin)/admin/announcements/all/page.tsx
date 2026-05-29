export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase/admin'
import { AdminPageHeader, Badge } from '@/components/admin/ui'
import Link from 'next/link'
import { ArrowLeft, Bell } from 'lucide-react'

function fmtDate(s: string | null) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })
}

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
  searchParams: Promise<{ status?: string }>
}) {
  const { status = 'all' } = await searchParams
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

  let q = db
    .from('announcements')
    .select('id, title, body, status, channels, schedule_mode, sent_at, created_at, segments ( name )')
    .order('created_at', { ascending: false })
    .limit(100)

  if (status !== 'all') q = q.eq('status', status)

  const { data: rows } = await q

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

  const announcements = (rows ?? []) as unknown as AnnRow[]

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

      {/* Filter tabs */}
      <div className="flex gap-1.5 mb-5 mt-5">
        {TABS.map(tab => (
          <Link
            key={tab.value}
            href={`/admin/announcements/all${tab.value !== 'all' ? `?status=${tab.value}` : ''}`}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm border text-xs font-medium transition-colors
              ${status === tab.value || (tab.value === 'all' && status === 'all')
                ? 'bg-sky/10 text-sky border-sky/30'
                : 'bg-surface text-fg-2 border-border hover:border-border-strong'}`}
          >
            {tab.label}
            <span className="font-mono text-[10px] opacity-70">{tab.count.toLocaleString()}</span>
          </Link>
        ))}
      </div>

      {/* Table */}
      <div className="bg-surface border border-border rounded-md overflow-hidden">
        {announcements.length === 0 ? (
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
              {announcements.map((ann, i) => (
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
    </div>
  )
}
