'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { Bell, Search, X, Check, Smartphone } from 'lucide-react'
import { Badge } from '@/components/admin/ui'
import { createClient } from '@/lib/supabase/client'

type RecentSend = {
  id: string
  title: string
  sent_at: string | null
  segment_key: string | null
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

type PushTokenHolder = {
  userId: string
  email: string
  fullName: string | null
  token: string
  announcements: boolean
}

type Props = {
  recentSends: RecentSend[]
  segments: Segment[]
  recipientCounts: RecipientCounts
  adminId: string
  pushTokenHolders?: PushTokenHolder[]
}

type Channel  = 'Push' | 'In-app banner' | 'Email'
type Schedule = 'Send now' | 'Schedule' | 'Draft'

export default function AnnouncementsCompose({ recentSends, segments, recipientCounts, pushTokenHolders = [] }: Omit<Props, 'adminId'> & { adminId?: string }) {
  const [channels,       setChannels]       = useState<Channel[]>(['Push'])
  const [title,          setTitle]          = useState('')
  const [body,           setBody]           = useState('')
  const [deepLink,       setDeepLink]       = useState('')
  const [schedule,       setSchedule]       = useState<Schedule>('Send now')
  const [segmentId,      setSegmentId]      = useState<string>('all')
  const [sending,        setSending]        = useState(false)
  const [sent,           setSent]           = useState(false)
  const [sentCount,      setSentCount]      = useState(0)
  const [sentHasPush,    setSentHasPush]    = useState(true)
  const [sentTokenCount, setSentTokenCount] = useState(0)
  const [sentErrors,     setSentErrors]     = useState(0)
  const [sends,          setSends]          = useState<RecentSend[]>(recentSends)
  const [bottomTab,      setBottomTab]      = useState<'tokens' | 'sends'>('tokens')
  const [tokenFilter,    setTokenFilter]    = useState('')
  const [tokenPage,      setTokenPage]      = useState(1)
  const [sendsPage,      setSendsPage]      = useState(1)

  const TOKENS_PER_PAGE = 10
  const SENDS_PER_PAGE  = 5

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

  // Set of user IDs that have a push token AND are opted in — for green dots in the user picker
  const tokenUserIds = useMemo(
    () => new Set(pushTokenHolders.filter(h => h.announcements).map(h => h.userId)),
    [pushTokenHolders]
  )

  // Filtered token holders for the bottom panel
  const filteredTokenHolders = useMemo(() => {
    const q = tokenFilter.toLowerCase().trim()
    if (!q) return pushTokenHolders
    return pushTokenHolders.filter(h =>
      h.email.toLowerCase().includes(q) ||
      (h.fullName ?? '').toLowerCase().includes(q) ||
      h.token.toLowerCase().includes(q)
    )
  }, [pushTokenHolders, tokenFilter])

  // Reset to page 1 when filter changes
  useEffect(() => { setTokenPage(1) }, [tokenFilter])

  const tokenTotalPages = Math.max(1, Math.ceil(filteredTokenHolders.length / TOKENS_PER_PAGE))
  const pagedTokens = filteredTokenHolders.slice((tokenPage - 1) * TOKENS_PER_PAGE, tokenPage * TOKENS_PER_PAGE)

  const sendsTotalPages = Math.max(1, Math.ceil(sends.length / SENDS_PER_PAGE))
  const pagedSends = sends.slice((sendsPage - 1) * SENDS_PER_PAGE, sendsPage * SENDS_PER_PAGE)

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
      setSentHasPush(result.hasPush !== false)
      setSentTokenCount(result.tokenCount ?? -1)
      setSentErrors(result.errors ?? 0)

      // Refresh recent sends list
      const sb = createClient()
      const { data } = await sb
        .from('announcements')
        .select('id, title, sent_at, segment_key, segments(name)')
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
                      const hasToken = tokenUserIds.has(u.id)
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
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-medium text-fg truncate">{u.full_name || '(no name)'}</p>
                              {hasToken && <span className="w-1.5 h-1.5 rounded-full bg-ok shrink-0" title="Has push token" />}
                            </div>
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
            <div className={`px-4 py-3 border rounded-md text-xs font-medium text-center ${sentCount > 0 ? 'bg-ok/10 border-ok/20 text-ok' : sentErrors > 0 ? 'bg-danger/10 border-danger/20 text-danger' : 'bg-warn/10 border-warn/20 text-warn'}`}>
              {sentCount > 0
                ? `Push sent to ${sentCount.toLocaleString()} device${sentCount === 1 ? '' : 's'}.${sentErrors > 0 ? ` (${sentErrors} failed)` : ''}`
                : sentErrors > 0
                  ? `Announcement saved. Found ${sentTokenCount} token${sentTokenCount === 1 ? '' : 's'} but delivery failed — check Vercel logs for details.`
                  : sentHasPush
                    ? 'Announcement saved. No push tokens found for the selected segment.'
                    : 'Announcement saved.'}
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

        {/* Right: iOS preview only */}
        <div className="flex flex-col gap-3.5">
          {/* iOS preview — switches between push (lock screen) and in-app banner */}
          <div className="bg-surface border border-border rounded-md p-4">
            <div className="font-mono text-[10px] text-fg-3 uppercase tracking-widest mb-4">
              PREVIEW · {channels.includes('In-app banner') && !channels.includes('Push') ? 'IN-APP BANNER' : channels.includes('Push') && channels.includes('In-app banner') ? 'IOS PUSH + BANNER' : 'IOS PUSH'}
            </div>

            {/* iPhone 15 Pro proportions: 393×852pt → display at 270×585 */}
            <div className="mx-auto" style={{ width: 270 }}>
              {/* Outer frame */}
              <div className="relative bg-[#1a1a1a] rounded-[52px] p-[3.5px] shadow-[0_0_0_1px_#333,0_16px_48px_rgba(0,0,0,0.7)]" style={{ height: 585 }}>
                {/* Side buttons */}
                <div className="absolute -left-[4px] top-[90px] w-[4px] h-8 bg-[#333] rounded-l-sm" />
                <div className="absolute -left-[4px] top-[134px] w-[4px] h-12 bg-[#333] rounded-l-sm" />
                <div className="absolute -left-[4px] top-[186px] w-[4px] h-12 bg-[#333] rounded-l-sm" />
                <div className="absolute -right-[4px] top-[130px] w-[4px] h-16 bg-[#333] rounded-r-sm" />

                {/* Screen */}
                <div className="bg-[#000] rounded-[49px] overflow-hidden h-full flex flex-col">

                  {/* ── PUSH / LOCK SCREEN ── */}
                  {channels.includes('Push') && (
                    <div className="flex-1 bg-gradient-to-b from-[#0d1b35] via-[#0a1220] to-[#081530] flex flex-col relative overflow-hidden">
                      {/* Dynamic island */}
                      <div className="flex justify-center pt-3">
                        <div className="w-[100px] h-7 bg-black rounded-full" />
                      </div>
                      {/* Status bar */}
                      <div className="flex justify-between items-center px-6 pt-1 pb-0">
                        <span className="text-white text-[11px] font-semibold">9:41</span>
                        <div className="flex gap-1.5 items-center">
                          <svg width="14" height="9" viewBox="0 0 19 12" fill="white"><rect x="0" y="7.5" width="3.2" height="4.5" rx="0.7"/><rect x="4.8" y="5" width="3.2" height="7" rx="0.7"/><rect x="9.6" y="2.5" width="3.2" height="9.5" rx="0.7"/><rect x="14.4" y="0" width="3.2" height="12" rx="0.7"/></svg>
                          <svg width="13" height="9" viewBox="0 0 17 12" fill="white"><path d="M8.5 3.2C10.8 3.2 12.9 4.1 14.4 5.6L15.5 4.5C13.7 2.7 11.2 1.5 8.5 1.5C5.8 1.5 3.3 2.7 1.5 4.5L2.6 5.6C4.1 4.1 6.2 3.2 8.5 3.2Z"/><path d="M8.5 6.8C9.9 6.8 11.1 7.3 12 8.2L13.1 7.1C11.8 5.9 10.2 5.1 8.5 5.1C6.8 5.1 5.2 5.9 3.9 7.1L5 8.2C5.9 7.3 7.1 6.8 8.5 6.8Z"/><circle cx="8.5" cy="10.5" r="1.5"/></svg>
                          <svg width="20" height="10" viewBox="0 0 27 13" fill="none"><rect x="0.5" y="0.5" width="23" height="12" rx="3.5" stroke="white" strokeOpacity="0.4"/><rect x="2" y="2" width="20" height="9" rx="2" fill="white"/></svg>
                        </div>
                      </div>
                      {/* Lock time */}
                      <div className="text-center pt-5 pb-4">
                        <div className="text-[54px] font-thin text-white leading-none tracking-tight">9:41</div>
                        <div className="text-[13px] text-white/60 mt-1.5">Friday, 29 May</div>
                      </div>
                      {/* Push notification */}
                      <div className="px-3">
                        <div className="bg-white/10 backdrop-blur-md rounded-2xl px-3 py-2.5 flex gap-2.5 items-start border border-white/10">
                          <div className="w-8 h-8 rounded-[9px] bg-sky flex items-center justify-center shrink-0 mt-0.5">
                            <Bell size={13} className="text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-[10px] font-semibold text-white/50 uppercase tracking-wide">Jump Logs</span>
                              <span className="text-[10px] text-white/35">now</span>
                            </div>
                            <div className="text-[12px] font-semibold text-white leading-snug mb-0.5 truncate">{title || 'Notification title'}</div>
                            <div className="text-[11px] text-white/65 leading-snug line-clamp-2">{body || 'Notification body text appears here…'}</div>
                          </div>
                        </div>
                      </div>
                      {/* Home indicator */}
                      <div className="absolute bottom-2 left-0 right-0 flex justify-center">
                        <div className="w-24 h-1 bg-white/40 rounded-full" />
                      </div>
                    </div>
                  )}

                  {/* ── IN-APP BANNER (shown below push if both selected, or alone) ── */}
                  {channels.includes('In-app banner') && !channels.includes('Push') && (
                    <div className="flex-1 bg-[#0A1220] flex flex-col relative overflow-hidden">
                      {/* Dynamic island */}
                      <div className="flex justify-center pt-3">
                        <div className="w-[100px] h-7 bg-black rounded-full" />
                      </div>
                      {/* Status bar */}
                      <div className="flex justify-between items-center px-5 pt-1">
                        <span className="text-fg text-[11px] font-semibold">9:41</span>
                        <div className="flex gap-1.5 items-center opacity-70">
                          <svg width="14" height="9" viewBox="0 0 19 12" fill="#8B9BB5"><rect x="0" y="7.5" width="3.2" height="4.5" rx="0.7"/><rect x="4.8" y="5" width="3.2" height="7" rx="0.7"/><rect x="9.6" y="2.5" width="3.2" height="9.5" rx="0.7"/><rect x="14.4" y="0" width="3.2" height="12" rx="0.7"/></svg>
                        </div>
                      </div>
                      {/* App topbar */}
                      <div className="px-4 pt-2 pb-2 border-b border-white/5">
                        <div className="text-[18px] font-bold text-white">Jump Log</div>
                      </div>
                      {/* Dimmed content */}
                      <div className="flex-1 px-3 pt-3 opacity-40 overflow-hidden">
                        {[847, 846, 845, 844].map(n => (
                          <div key={n} className="bg-[#121C2E] rounded-xl mb-2 px-3 py-2.5">
                            <div className="text-[9px] text-[#5A6B85] font-mono mb-0.5">JUMP #{n}</div>
                            <div className="text-[12px] font-semibold text-white">Skydive Yarra Valley</div>
                          </div>
                        ))}
                      </div>
                      {/* In-app banner */}
                      <div className="absolute top-[72px] left-2 right-2 z-10">
                        <div className="bg-[#1A2740] border border-sky/30 rounded-2xl flex items-start gap-2.5 p-2.5 shadow-lg">
                          <div className="w-7 h-7 rounded-full bg-sky/15 flex items-center justify-center shrink-0">
                            <Bell size={12} className="text-sky-400" style={{ color: '#4A9EFF' }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[11px] font-semibold text-white leading-snug mb-0.5 truncate">{title || 'Announcement title'}</div>
                            <div className="text-[10px] text-[#8B9BB5] leading-snug line-clamp-2">{body || 'Announcement body text appears here…'}</div>
                          </div>
                          <div className="text-[#5A6B85] pt-0.5">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
                          </div>
                        </div>
                      </div>
                      {/* Home indicator */}
                      <div className="absolute bottom-2 left-0 right-0 flex justify-center">
                        <div className="w-24 h-1 bg-white/20 rounded-full" />
                      </div>
                    </div>
                  )}

                  {/* Both selected — split view */}
                  {channels.includes('Push') && channels.includes('In-app banner') && (
                    <div className="bg-[#121C2E] px-3 py-2 border-t border-white/5 flex items-start gap-2">
                      <div className="w-6 h-6 rounded-lg bg-sky/15 flex items-center justify-center shrink-0">
                        <Bell size={10} className="text-sky-400" style={{ color: '#4A9EFF' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-semibold text-white/70 mb-0.5">In-app banner</div>
                        <div className="text-[10px] text-white/40 truncate">{title || 'Announcement title'}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Full-width tabbed panel: Push Token Holders | Recent Sends */}
      <div className="mt-3.5 bg-surface border border-border rounded-md overflow-hidden">
        {/* Tab bar */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setBottomTab('tokens')}
            className={`flex items-center gap-2 px-5 py-3 text-xs font-medium transition-colors border-r border-border ${bottomTab === 'tokens' ? 'bg-surface text-fg border-b-2 border-b-sky -mb-px' : 'bg-surface-2 text-fg-3 hover:text-fg-2'}`}
          >
            <Smartphone size={12} />
            Push Token Holders
            <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded-sm ${bottomTab === 'tokens' ? 'bg-sky/10 text-sky' : 'bg-border text-fg-3'}`}>
              {pushTokenHolders.length}
            </span>
          </button>
          <button
            onClick={() => setBottomTab('sends')}
            className={`flex items-center gap-2 px-5 py-3 text-xs font-medium transition-colors ${bottomTab === 'sends' ? 'bg-surface text-fg border-b-2 border-b-sky -mb-px' : 'bg-surface-2 text-fg-3 hover:text-fg-2'}`}
          >
            <Bell size={12} />
            Recent Sends
            <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded-sm ${bottomTab === 'sends' ? 'bg-sky/10 text-sky' : 'bg-border text-fg-3'}`}>
              {sends.length}
            </span>
          </button>
          <div className="flex-1" />
          <a
            href={bottomTab === 'tokens' ? '/admin/announcements/tokens' : '/admin/announcements/all'}
            className="self-center mr-4 font-mono text-[10px] text-sky hover:underline"
          >
            View all →
          </a>
        </div>

        {/* Push Token Holders tab */}
        {bottomTab === 'tokens' && (
          <div className="p-4">
            {/* Filter input */}
            <div className="flex items-center gap-2 px-3 py-2 mb-3 bg-surface-2 border border-border rounded-md">
              <Search size={12} className="text-fg-3 shrink-0" />
              <input
                type="text"
                value={tokenFilter}
                onChange={e => setTokenFilter(e.target.value)}
                placeholder="Filter by name, email or token…"
                className="flex-1 bg-transparent text-xs text-fg outline-none placeholder:text-fg-3"
              />
              {tokenFilter && (
                <button onClick={() => setTokenFilter('')} className="text-fg-3 hover:text-fg">
                  <X size={11} />
                </button>
              )}
            </div>

            {pushTokenHolders.length === 0 ? (
              <div className="py-6 text-center text-xs text-fg-3 italic">No push tokens registered yet. Users need to open the app and allow notifications.</div>
            ) : filteredTokenHolders.length === 0 ? (
              <div className="py-6 text-center text-xs text-fg-3 italic">No matches for &quot;{tokenFilter}&quot;</div>
            ) : (
              <>
                <div className="divide-y divide-dashed divide-border">
                  {pagedTokens.map(h => (
                    <div key={h.userId} className="py-2.5 flex items-center gap-3">
                      <div
                        className={`w-2 h-2 rounded-full shrink-0 ${h.announcements ? 'bg-ok' : 'bg-fg-3'}`}
                        title={h.announcements ? 'Opted in to announcements' : 'Opted out of announcements'}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-fg truncate">{h.fullName || h.email}</div>
                        {h.fullName && <div className="font-mono text-[10px] text-fg-3 truncate">{h.email}</div>}
                      </div>
                      <div className="font-mono text-[10px] text-fg-4 truncate max-w-[260px] hidden md:block">{h.token}</div>
                      <span className={`shrink-0 font-mono text-[9px] px-1.5 py-0.5 rounded-sm ${h.announcements ? 'bg-ok/10 text-ok' : 'bg-surface-2 text-fg-3'}`}>
                        {h.announcements ? 'opted in' : 'opted out'}
                      </span>
                    </div>
                  ))}
                </div>
                {tokenTotalPages > 1 && (
                  <div className="flex items-center justify-between pt-3 mt-1 border-t border-border">
                    <span className="font-mono text-[10px] text-fg-3">
                      {(tokenPage - 1) * TOKENS_PER_PAGE + 1}–{Math.min(tokenPage * TOKENS_PER_PAGE, filteredTokenHolders.length)} of {filteredTokenHolders.length}
                    </span>
                    <div className="flex gap-1">
                      <button onClick={() => setTokenPage(p => Math.max(1, p - 1))} disabled={tokenPage === 1}
                        className="px-2 py-1 text-[10px] font-mono border border-border rounded-sm disabled:opacity-30 hover:bg-surface-2 transition-colors">← Prev</button>
                      <button onClick={() => setTokenPage(p => Math.min(tokenTotalPages, p + 1))} disabled={tokenPage === tokenTotalPages}
                        className="px-2 py-1 text-[10px] font-mono border border-border rounded-sm disabled:opacity-30 hover:bg-surface-2 transition-colors">Next →</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Recent Sends tab */}
        {bottomTab === 'sends' && (
          <div className="p-4">
            {sends.length === 0 ? (
              <div className="py-6 text-center text-xs text-fg-3 italic">No announcements sent yet.</div>
            ) : (
              <>
                <div className="divide-y divide-dashed divide-border">
                  {pagedSends.map((s, i) => (
                    <div key={s.id ?? i} className="py-2.5 flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-fg truncate">{s.title}</div>
                        <div className="font-mono text-[10px] text-fg-3 mt-0.5">
                          {s.segments?.name ?? (
                            s.segment_key === 'active'   ? 'Active subs' :
                            s.segment_key === 'trial'    ? 'Trial users' :
                            s.segment_key === 'overdue'  ? 'Overdue' :
                            s.segment_key === 'specific' ? 'Specific users' :
                            'All users'
                          )}
                        </div>
                      </div>
                      <span className="font-mono text-[10px] text-fg-3 shrink-0">
                        {s.sent_at ? new Date(s.sent_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </span>
                    </div>
                  ))}
                </div>
                {sendsTotalPages > 1 && (
                  <div className="flex items-center justify-between pt-3 mt-1 border-t border-border">
                    <span className="font-mono text-[10px] text-fg-3">
                      {(sendsPage - 1) * SENDS_PER_PAGE + 1}–{Math.min(sendsPage * SENDS_PER_PAGE, sends.length)} of {sends.length}
                    </span>
                    <div className="flex gap-1">
                      <button onClick={() => setSendsPage(p => Math.max(1, p - 1))} disabled={sendsPage === 1}
                        className="px-2 py-1 text-[10px] font-mono border border-border rounded-sm disabled:opacity-30 hover:bg-surface-2 transition-colors">← Prev</button>
                      <button onClick={() => setSendsPage(p => Math.min(sendsTotalPages, p + 1))} disabled={sendsPage === sendsTotalPages}
                        className="px-2 py-1 text-[10px] font-mono border border-border rounded-sm disabled:opacity-30 hover:bg-surface-2 transition-colors">Next →</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
