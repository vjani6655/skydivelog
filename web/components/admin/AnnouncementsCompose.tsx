'use client'

import { useState } from 'react'
import { Bell } from 'lucide-react'
import { Badge } from '@/components/admin/ui'
import { createClient } from '@/lib/supabase/client'

type RecentSend = {
  id: string
  title: string
  sent_at: string | null
  segments: { name: string } | null
}

type Segment = { id: string; name: string }

type RecipientCounts = {
  all: number
  active: number
  trial: number
  overdue: number
}

type Props = {
  recentSends: RecentSend[]
  segments: Segment[]
  recipientCounts: RecipientCounts
  adminId: string
}

type Channel  = 'Push' | 'In-app banner' | 'Email'
type Schedule = 'Send now' | 'Schedule' | 'Draft'

export default function AnnouncementsCompose({ recentSends, segments, recipientCounts, adminId }: Props) {
  const [channels,  setChannels]  = useState<Channel[]>(['Push'])
  const [title,     setTitle]     = useState('')
  const [body,      setBody]      = useState('')
  const [deepLink,  setDeepLink]  = useState('')
  const [schedule,  setSchedule]  = useState<Schedule>('Send now')
  const [segmentId, setSegmentId] = useState<string>('all')
  const [sending,   setSending]   = useState(false)
  const [sent,      setSent]      = useState(false)
  const [sentCount, setSentCount] = useState(0)
  const [sends,     setSends]     = useState<RecentSend[]>(recentSends)

  const toggleChannel = (c: Channel) =>
    setChannels(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])

  const SEGMENT_COUNTS: Record<string, number> = {
    all:    recipientCounts.all,
    active: recipientCounts.active,
    trial:  recipientCounts.trial,
    overdue: recipientCounts.overdue,
  }
  segments.forEach(s => {
    if (!(s.id in SEGMENT_COUNTS)) SEGMENT_COUNTS[s.id] = 0
  })

  const recipients = SEGMENT_COUNTS[segmentId] ?? 0

  async function handleSend() {
    if (!title.trim() || !body.trim()) { alert('Title and body are required.'); return }
    setSending(true)
    const scheduleMode = schedule === 'Send now' ? 'now' : schedule === 'Schedule' ? 'schedule' : 'draft'

    try {
      const res = await fetch('/api/admin/send-announcement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          body,
          channels,
          segment: segmentId,
          deepLink,
          scheduleMode,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(err.error ?? 'Failed to send announcement.')
        setSending(false)
        return
      }

      const result = await res.json()
      setSentCount(result.sent ?? 0)

      // Refresh recent sends list
      const sb = createClient()
      const { data } = await sb
        .from('announcements')
        .select('id, title, sent_at, segments(name)')
        .eq('status', 'sent')
        .order('sent_at', { ascending: false })
        .limit(8)
      setSends((data ?? []) as unknown as RecentSend[])

      setSent(true)
      setTitle('')
      setBody('')
      setTimeout(() => setSent(false), 4000)
    } finally {
      setSending(false)
    }
  }

  const BUILT_IN_SEGMENTS = [
    { id: 'all',     name: 'All users' },
    { id: 'active',  name: 'Active subs' },
    { id: 'trial',   name: 'Trial users' },
    { id: 'overdue', name: 'Overdue' },
  ]
  const allSegments = [...BUILT_IN_SEGMENTS, ...segments]

  return (
    <div>
      <div className="flex items-end justify-between mb-5">
        <div>
          <div className="font-mono text-[10px] text-fg-3 tracking-widest uppercase mb-1.5">
            COMPOSE · PUSH &amp; IN-APP
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-fg">Announcements</h1>
        </div>
        <Badge kind="warn">SENDS TO {recipients.toLocaleString()} USERS</Badge>
      </div>

      <div className="grid grid-cols-[3fr_2fr] gap-3.5">
        {/* Left: compose form */}
        <div className="flex flex-col gap-3.5">
          <div className="bg-surface border border-border rounded-md p-4">
            {/* Channel */}
            <div className="mb-4">
              <div className="font-mono text-[10px] text-fg-3 uppercase tracking-widest mb-2">CHANNEL</div>
              <div className="flex gap-1.5">
                {(['Push', 'In-app banner', 'Email'] as Channel[]).map(c => (
                  <button key={c} onClick={() => toggleChannel(c)}
                    className={`px-3 py-1.5 rounded-sm border text-xs font-medium transition-colors
                      ${channels.includes(c) ? 'bg-sky/10 text-sky border-sky/30' : 'bg-surface-2 text-fg-2 border-border'}`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div className="mb-4">
              <div className="font-mono text-[10px] text-fg-3 uppercase tracking-widest mb-2">TITLE</div>
              <input value={title} onChange={e => setTitle(e.target.value)} maxLength={65}
                placeholder="New feature · Gear module is live"
                className="w-full h-9 bg-surface-2 border border-border rounded-md px-3 text-sm text-fg outline-none focus:border-sky/50 placeholder:text-fg-3" />
              <div className="font-mono text-[10px] text-fg-3 mt-1 text-right">{title.length} / 65</div>
            </div>

            {/* Body */}
            <div className="mb-4">
              <div className="font-mono text-[10px] text-fg-3 uppercase tracking-widest mb-2">BODY</div>
              <textarea value={body} onChange={e => setBody(e.target.value)} rows={4} maxLength={240}
                placeholder="You can now log gear setups for each jump. Tap 'Gear' in the main tab bar to get started."
                className="w-full bg-surface-2 border border-border rounded-md px-3 py-2.5 text-xs text-fg placeholder:text-fg-3 outline-none resize-none focus:border-sky/50" />
              <div className="font-mono text-[10px] text-fg-3 mt-1 text-right">{body.length} / 240</div>
            </div>

            {/* Deep link */}
            <div className="mb-4">
              <div className="font-mono text-[10px] text-fg-3 uppercase tracking-widest mb-2">
                DEEP LINK <span className="opacity-50">(optional)</span>
              </div>
              <input value={deepLink} onChange={e => setDeepLink(e.target.value)}
                placeholder="jumplogs://gear"
                className="w-full h-9 bg-surface-2 border border-border rounded-md px-3 font-mono text-xs text-fg outline-none focus:border-sky/50 placeholder:text-fg-3" />
            </div>

            {/* Schedule */}
            <div className="mb-4">
              <div className="font-mono text-[10px] text-fg-3 uppercase tracking-widest mb-2">SCHEDULE</div>
              <div className="flex gap-1.5">
                {(['Send now', 'Schedule', 'Draft'] as Schedule[]).map(s => (
                  <button key={s} onClick={() => setSchedule(s)}
                    className={`px-3 py-1.5 rounded-sm border text-xs font-medium transition-colors
                      ${schedule === s ? 'bg-sky/10 text-sky border-sky/30' : 'bg-surface-2 text-fg-2 border-border'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Segment */}
            <div className="mb-4">
              <div className="font-mono text-[10px] text-fg-3 uppercase tracking-widest mb-2">SEGMENT</div>
              <div className="grid grid-cols-2 gap-2">
                {allSegments.map(s => (
                  <button key={s.id} onClick={() => setSegmentId(s.id)}
                    className={`flex items-center justify-between px-3 py-2 rounded-md border text-xs text-left transition-colors
                      ${segmentId === s.id ? 'border-sky bg-sky/10 text-sky' : 'border-border bg-surface-2 text-fg-2 hover:border-border-strong'}`}>
                    <span className="font-medium">{s.name}</span>
                    <span className="font-mono text-[10px] opacity-70">{(SEGMENT_COUNTS[s.id] ?? 0).toLocaleString()}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Recipient stats */}
            <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border">
              {[
                ['RECIPIENTS',    recipients.toLocaleString()],
                ['EST. DELIVERY', '~3 min'],
                ['COST',          'Free'],
              ].map(([k, v]) => (
                <div key={k}>
                  <div className="font-mono text-[10px] text-fg-3 uppercase tracking-widest mb-0.5">{k}</div>
                  <div className="font-mono text-sm font-semibold text-fg">{v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          {sent ? (
            <div className="px-4 py-3 bg-ok/10 border border-ok/20 rounded-md text-xs text-ok font-medium text-center">
              {sentCount > 0
                ? `Push sent to ${sentCount.toLocaleString()} device${sentCount === 1 ? '' : 's'}.`
                : 'Announcement saved. No push tokens matched the selected segment.'}
            </div>
          ) : (
            <div className="flex gap-2.5">
              <button className="px-4 py-2 bg-surface border border-border rounded-sm text-xs text-fg-2 hover:bg-surface-2 transition-colors">
                Save draft
              </button>
              <button className="px-4 py-2 bg-surface border border-border rounded-sm text-xs text-fg-2 hover:bg-surface-2 transition-colors">
                Send test to me
              </button>
              <button onClick={handleSend} disabled={sending || !title.trim() || !body.trim()}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-sky text-on-sky rounded-sm text-xs font-semibold disabled:opacity-40 hover:bg-sky/90 transition-colors">
                <Bell size={12} />
                {sending ? 'Sending…' : `Send to ${recipients.toLocaleString()}`}
              </button>
            </div>
          )}
        </div>

        {/* Right: preview + recent sends */}
        <div className="flex flex-col gap-3.5">
          {/* iOS push preview */}
          <div className="bg-surface border border-border rounded-md p-4">
            <div className="font-mono text-[10px] text-fg-3 uppercase tracking-widest mb-3">PREVIEW · IOS PUSH</div>
            <div className="mx-auto bg-[#1A1A1A] rounded-[28px] p-2 border-2 border-[#2A2A2A] w-52">
              <div className="bg-[#121212] rounded-[20px] p-3 min-h-40 flex flex-col">
                <div className="flex justify-between items-center mb-3 px-1">
                  <span className="font-mono text-[9px] text-[#666]">9:41</span>
                  <span className="font-mono text-[9px] text-[#666]">●●●</span>
                </div>
                <div className="bg-[#1E1E1E] rounded-xl px-3 py-2.5 flex gap-2.5 items-start">
                  <div className="w-6 h-6 rounded-[8px] bg-sky flex items-center justify-center shrink-0 mt-0.5">
                    <Bell size={12} className="text-on-sky" />
                  </div>
                  <div className="flex-1">
                    <div className="text-[11px] font-semibold text-white mb-0.5 leading-tight">
                      {title || 'Notification title'}
                    </div>
                    <div className="text-[10px] text-[#999] leading-snug">
                      {body ? body.slice(0, 80) + (body.length > 80 ? '…' : '') : 'Notification body text appears here…'}
                    </div>
                    <div className="font-mono text-[9px] text-[#666] mt-1">Jump Logs · now</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent sends */}
          <div className="bg-surface border border-border rounded-md p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="font-mono text-[10px] text-fg-3 uppercase tracking-widest">RECENT SENDS</div>
              <button className="font-mono text-[10px] text-sky hover:underline">View all →</button>
            </div>
            {sends.length === 0 && (
              <div className="text-xs text-fg-3 italic py-2">No announcements sent yet.</div>
            )}
            {sends.map((s, i) => (
              <div key={s.id ?? i} className="py-2.5 border-b border-dashed border-border last:border-0">
                <div className="flex items-center justify-between mb-0.5">
                  <div className="text-xs font-medium text-fg truncate pr-2">{s.title}</div>
                  <span className="font-mono text-[10px] text-fg-3 shrink-0">
                    {s.sent_at ? new Date(s.sent_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) : '—'}
                  </span>
                </div>
                <div className="font-mono text-[10px] text-fg-3">
                  {s.segments?.name ?? 'All users'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
