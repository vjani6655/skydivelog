'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, Search, X, Check } from 'lucide-react'
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

type UserRow = { id: string; full_name: string; email: string; licence_number: string | null }

type Props = {
  recentSends: RecentSend[]
  segments: Segment[]
  recipientCounts: RecipientCounts
  adminId: string
}

type Channel  = 'Push' | 'In-app banner' | 'Email'
type Schedule = 'Send now' | 'Schedule' | 'Draft'

export default function AnnouncementsCompose({ recentSends, segments, recipientCounts }: Omit<Props, 'adminId'> & { adminId?: string }) {
  const [channels,       setChannels]       = useState<Channel[]>(['Push'])
  const [title,          setTitle]          = useState('')
  const [body,           setBody]           = useState('')
  const [deepLink,       setDeepLink]       = useState('')
  const [schedule,       setSchedule]       = useState<Schedule>('Send now')
  const [segmentId,      setSegmentId]      = useState<string>('all')
  const [sending,        setSending]        = useState(false)
  const [sent,           setSent]           = useState(false)
  const [sentCount,      setSentCount]      = useState(0)
  const [sends,          setSends]          = useState<RecentSend[]>(recentSends)

  // Specific user picker state
  const [userQuery,      setUserQuery]      = useState('')
  const [userResults,    setUserResults]    = useState<UserRow[]>([])
  const [selectedUsers,  setSelectedUsers]  = useState<UserRow[]>([])
  const [userSearching,  setUserSearching]  = useState(false)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounced user search
  useEffect(() => {
    if (segmentId !== 'specific') return
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(async () => {
      setUserSearching(true)
      try {
        const res = await fetch(`/api/admin/users/search?q=${encodeURIComponent(userQuery)}`)
        if (res.ok) setUserResults(await res.json())
      } finally {
        setUserSearching(false)
      }
    }, 300)
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current) }
  }, [userQuery, segmentId])

  // Load initial list when switching to specific
  useEffect(() => {
    if (segmentId === 'specific' && userResults.length === 0) {
      fetch('/api/admin/users/search?q=').then(r => r.json()).then(setUserResults).catch(() => {})
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segmentId])

  const toggleUser = (u: UserRow) => {
    setSelectedUsers(prev =>
      prev.find(x => x.id === u.id) ? prev.filter(x => x.id !== u.id) : [...prev, u]
    )
  }

  const removeUser = (id: string) => setSelectedUsers(prev => prev.filter(u => u.id !== id))

  const toggleChannel = (c: Channel) =>
    setChannels(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])

  const SEGMENT_COUNTS: Record<string, number> = {
    all:      recipientCounts.all,
    active:   recipientCounts.active,
    trial:    recipientCounts.trial,
    overdue:  recipientCounts.overdue,
    specific: selectedUsers.length,
  }
  segments.forEach(s => {
    if (!(s.id in SEGMENT_COUNTS)) SEGMENT_COUNTS[s.id] = 0
  })

  const recipients = SEGMENT_COUNTS[segmentId] ?? 0

  async function handleSend() {
    if (!title.trim() || !body.trim()) { alert('Title and body are required.'); return }
    if (segmentId === 'specific' && selectedUsers.length === 0) {
      alert('Select at least one user for specific targeting.')
      return
    }
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
          userIds: segmentId === 'specific' ? selectedUsers.map(u => u.id) : undefined,
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
    { id: 'all',      name: 'All users' },
    { id: 'active',   name: 'Active subs' },
    { id: 'trial',    name: 'Trial users' },
    { id: 'overdue',  name: 'Overdue' },
    { id: 'specific', name: 'Specific users' },
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
                    <span className="font-mono text-[10px] opacity-70">
                      {s.id === 'specific' ? selectedUsers.length.toLocaleString() : (SEGMENT_COUNTS[s.id] ?? 0).toLocaleString()}
                    </span>
                  </button>
                ))}
              </div>

              {/* User picker — shown when "Specific users" is selected */}
              {segmentId === 'specific' && (
                <div className="mt-3 border border-border rounded-md overflow-hidden">
                  {/* Search input */}
                  <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-surface-2">
                    <Search size={12} className="text-fg-3 shrink-0" />
                    <input
                      type="text"
                      value={userQuery}
                      onChange={e => setUserQuery(e.target.value)}
                      placeholder="Search by name, email or licence…"
                      className="flex-1 bg-transparent text-xs text-fg outline-none placeholder:text-fg-3"
                    />
                    {userSearching && (
                      <span className="font-mono text-[10px] text-fg-3">searching…</span>
                    )}
                  </div>

                  {/* Selected chips */}
                  {selectedUsers.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 px-3 py-2 border-b border-border bg-sky/5">
                      {selectedUsers.map(u => (
                        <span key={u.id}
                          className="inline-flex items-center gap-1 text-[10px] font-medium bg-sky/10 text-sky border border-sky/20 rounded-sm px-1.5 py-0.5">
                          {u.full_name || u.email}
                          <button onClick={() => removeUser(u.id)} className="hover:text-danger transition-colors">
                            <X size={9} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Result list */}
                  <div className="max-h-52 overflow-y-auto">
                    {userResults.length === 0 && !userSearching && (
                      <p className="text-xs text-fg-3 italic px-3 py-3">No users found.</p>
                    )}
                    {userResults.map(u => {
                      const isSelected = selectedUsers.some(x => x.id === u.id)
                      return (
                        <button
                          key={u.id}
                          onClick={() => toggleUser(u)}
                          className={`w-full flex items-center gap-3 px-3 py-2 text-left border-b border-dashed border-border last:border-0 hover:bg-surface-2 transition-colors ${isSelected ? 'bg-sky/5' : ''}`}
                        >
                          <div className={`w-4 h-4 rounded-sm border flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-sky border-sky' : 'border-border bg-surface'}`}>
                            {isSelected && <Check size={10} className="text-on-sky" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-fg truncate">{u.full_name || '(no name)'}</p>
                            <p className="font-mono text-[10px] text-fg-3 truncate">
                              {u.email}{u.licence_number ? ` · ${u.licence_number}` : ''}
                            </p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
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
              <button onClick={handleSend} disabled={sending || !title.trim() || !body.trim() || (segmentId === 'specific' && selectedUsers.length === 0)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-sky text-on-sky rounded-sm text-xs font-semibold disabled:opacity-40 hover:bg-sky/90 transition-colors">
                <Bell size={12} />
                {sending ? 'Sending…' : segmentId === 'specific'
                  ? `Send to ${selectedUsers.length} user${selectedUsers.length === 1 ? '' : 's'}`
                  : `Send to ${recipients.toLocaleString()}`}
              </button>
            </div>
          )}
        </div>

        {/* Right: preview + recent sends */}
        <div className="flex flex-col gap-3.5">
          {/* iOS push preview */}
          <div className="bg-surface border border-border rounded-md p-4">
            <div className="font-mono text-[10px] text-fg-3 uppercase tracking-widest mb-4">PREVIEW · IOS PUSH</div>

            {/* Phone shell */}
            <div className="mx-auto w-[220px]">
              {/* Outer frame */}
              <div className="relative bg-[#111] rounded-[44px] p-[3px] shadow-[0_0_0_1px_#2a2a2a,0_8px_32px_rgba(0,0,0,0.6)]">
                {/* Side buttons */}
                <div className="absolute -left-[3px] top-[80px] w-[3px] h-7 bg-[#2a2a2a] rounded-l-sm" />
                <div className="absolute -left-[3px] top-[116px] w-[3px] h-10 bg-[#2a2a2a] rounded-l-sm" />
                <div className="absolute -left-[3px] top-[162px] w-[3px] h-10 bg-[#2a2a2a] rounded-l-sm" />
                <div className="absolute -right-[3px] top-[110px] w-[3px] h-14 bg-[#2a2a2a] rounded-r-sm" />

                {/* Screen */}
                <div className="bg-[#000] rounded-[42px] overflow-hidden">
                  {/* Dynamic island */}
                  <div className="flex justify-center pt-3 pb-1">
                    <div className="w-24 h-7 bg-[#111] rounded-full" />
                  </div>

                  {/* Lock screen wallpaper area */}
                  <div className="bg-gradient-to-b from-[#0f1b2d] to-[#1a2740] px-4 pb-5 min-h-[340px]">
                    {/* Time */}
                    <div className="text-center pt-3 pb-4">
                      <div className="text-[42px] font-thin text-white leading-none tracking-tight">9:41</div>
                      <div className="text-[13px] text-white/60 mt-1">Friday, 29 May</div>
                    </div>

                    {/* Notification card */}
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl px-3 py-2.5 flex gap-2.5 items-start border border-white/10">
                      <div className="w-8 h-8 rounded-[10px] bg-sky flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                        <Bell size={14} className="text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[10px] font-medium text-white/50 uppercase tracking-wide">Jump Logs</span>
                          <span className="text-[10px] text-white/40">now</span>
                        </div>
                        <div className="text-[12px] font-semibold text-white leading-snug mb-0.5">
                          {title || 'Notification title'}
                        </div>
                        <div className="text-[11px] text-white/70 leading-snug line-clamp-2">
                          {body || 'Notification body text appears here…'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Home indicator */}
                  <div className="bg-[#000] flex justify-center py-2">
                    <div className="w-28 h-1 bg-white/30 rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent sends */}
          <div className="bg-surface border border-border rounded-md p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="font-mono text-[10px] text-fg-3 uppercase tracking-widest">RECENT SENDS</div>
              <a href="/admin/announcements/all" className="font-mono text-[10px] text-sky hover:underline">View all →</a>
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
