'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { ChevronDown, Send, CheckCircle, X } from 'lucide-react'
import { Badge, Avatar } from '@/components/admin/ui'
import { createClient } from '@/lib/supabase/client'

type Ticket = {
  id: string
  user_id: string | null
  name: string | null
  email: string | null
  subject: string
  category: string
  status: 'open' | 'waiting' | 'closed'
  severity: string
  message: string | null
  created_at: string
  users: { full_name: string } | null
}

type Message = {
  id: string
  ticket_id: string
  sender_id: string
  message: string
  created_at: string
}

type Props = {
  initialTickets: Ticket[]
  openCount: number
  waitingCount: number
  closedCount: number
}

type TabFilter = 'All open' | 'Waiting' | 'Closed'

const CATEGORIES = ['billing', 'bug', 'support', 'feature', 'flag', 'press'] as const

const catColor: Record<string, string> = {
  billing: 'text-warn bg-warn/10 border-warn/20',
  bug:     'text-danger bg-danger/10 border-danger/20',
  support: 'text-sky bg-sky/10 border-sky/20',
  feature: 'text-ok bg-ok/10 border-ok/20',
  flag:    'text-cyan bg-cyan/10 border-cyan/20',
  press:   'text-fg-2 bg-surface-3 border-border',
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3600000)
  if (h < 1) return '<1h ago'
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

export default function SupportInbox({ initialTickets, openCount, waitingCount, closedCount }: Props) {
  const [tab, setTab]             = useState<TabFilter>('All open')
  const [catFilter, setCatFilter] = useState<string | null>(null)
  const [tickets, setTickets]     = useState<Ticket[]>(initialTickets)
  const [selected, setSelected]   = useState<Ticket | null>(initialTickets[0] ?? null)
  const [messages, setMessages]   = useState<Message[]>([])
  const [reply, setReply]         = useState('')
  const [sending, setSending]     = useState(false)
  const [resolving, setResolving] = useState(false)
  const [error, setError]         = useState<string | null>(null)

  const TAB_COUNTS: Record<TabFilter, number> = {
    'All open': openCount,
    'Waiting':  waitingCount,
    'Closed':   closedCount,
  }

  // Reload ticket list when tab changes
  useEffect(() => {
    const sb = createClient()
    let query = sb
      .from('support_tickets')
      .select('id, user_id, name, email, subject, category, status, severity, message, created_at, users(full_name)')
      .order('created_at', { ascending: false })
      .limit(100)

    if (tab === 'Closed')       query = query.eq('status', 'closed')
    else if (tab === 'Waiting') query = query.eq('status', 'waiting')
    else                        query = query.not('status', 'eq', 'closed')

    query.then(({ data }) => {
      const rows = (data ?? []) as unknown as Ticket[]
      setTickets(rows)
      setCatFilter(null)
      if (rows.length && !rows.find(r => r.id === selected?.id)) {
        setSelected(rows[0])
      }
    })
  }, [tab]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load thread messages for selected ticket
  const loadMessages = useCallback(async (ticketId: string) => {
    const { data } = await createClient()
      .from('ticket_messages')
      .select('id, ticket_id, sender_id, message, created_at')
      .eq('ticket_id', ticketId)
      .order('created_at')
    setMessages((data ?? []) as Message[])
  }, [])

  useEffect(() => {
    if (selected) loadMessages(selected.id)
  }, [selected, loadMessages])

  // ── Realtime subscriptions ────────────────────────────────────────────────
  // Keep a stable ref to selected so the channel callbacks can read current value
  const selectedRef = useRef(selected)
  useEffect(() => { selectedRef.current = selected }, [selected])

  useEffect(() => {
    const sb = createClient()

    // Watch for new inbound messages — append to thread if it belongs to open ticket
    const msgChannel = sb
      .channel('admin-ticket-messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ticket_messages' },
        (payload) => {
          const msg = payload.new as Message
          if (msg.ticket_id === selectedRef.current?.id) {
            setMessages(prev => {
              if (prev.some(m => m.id === msg.id)) return prev
              return [...prev, msg]
            })
          }
        },
      )
      .subscribe()

    // Watch for ticket status changes — update list + selected in place
    const ticketChannel = sb
      .channel('admin-support-tickets')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'support_tickets' },
        (payload) => {
          const updated = payload.new as Ticket
          setTickets(prev => prev.map(t => t.id === updated.id ? { ...t, ...updated } : t))
          setSelected(prev => prev?.id === updated.id ? { ...prev, ...updated } : prev)
        },
      )
      .subscribe()

    return () => {
      sb.removeChannel(msgChannel)
      sb.removeChannel(ticketChannel)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSend() {
    if (!reply.trim() || !selected) return
    setSending(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/tickets/${selected.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: reply.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to send')
      setReply('')
      if (data.message) setMessages(prev => [...prev, data.message as Message])
      setTickets(prev => prev.map(t => t.id === selected.id ? { ...t, status: 'waiting' as const } : t))
      setSelected(prev => prev ? { ...prev, status: 'waiting' as const } : prev)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send')
    } finally {
      setSending(false)
    }
  }

  async function handleResolve() {
    if (!selected) return
    setResolving(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/tickets/${selected.id}/resolve`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to resolve')
      setTickets(prev => prev.map(t => t.id === selected.id ? { ...t, status: 'closed' as const } : t))
      setSelected(prev => prev ? { ...prev, status: 'closed' as const } : prev)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setResolving(false)
    }
  }

  const displayName = (t: Ticket) => t.name ?? t.users?.full_name ?? 'Unknown'

  // Client-side category filter applied on top of the tab filter
  const visible = catFilter ? tickets.filter(t => t.category === catFilter) : tickets

  // Count tickets per category (from current tab load)
  const catCounts = CATEGORIES.reduce<Record<string, number>>((acc, c) => {
    acc[c] = tickets.filter(t => t.category === c).length
    return acc
  }, {})

  return (
    <div>
      <div className="flex items-end justify-between mb-5">
        <div>
          <div className="font-mono text-[10px] text-fg-3 tracking-widest uppercase mb-1.5">
            INBOX · {openCount} OPEN
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-fg">Support tickets</h1>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-1 bg-surface-2 border border-border rounded-md p-0.5">
          {(['All open', 'Waiting', 'Closed'] as TabFilter[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition-colors
                ${tab === t ? 'bg-sky/10 text-sky' : 'text-fg-2 hover:text-fg'}`}>
              {t} <span className="font-mono text-[10px] opacity-70">{TAB_COUNTS[t]}</span>
            </button>
          ))}
        </div>
        <button className="flex items-center gap-1.5 px-2.5 py-1.5 bg-surface border border-border rounded-sm text-xs text-fg-2">
          Newest <ChevronDown size={11} />
        </button>
      </div>

      {/* Category filter chips */}
      <div className="flex items-center gap-1.5 mb-3.5 flex-wrap">
        <span className="font-mono text-[10px] text-fg-4 uppercase tracking-wider mr-0.5">Tag:</span>
        <button
          onClick={() => setCatFilter(null)}
          className={`font-mono text-[10px] px-2 py-0.5 rounded-[4px] border transition-colors
            ${catFilter === null
              ? 'bg-fg text-bg border-fg'
              : 'text-fg-3 bg-surface-2 border-border hover:text-fg'}`}
        >
          ALL ({tickets.length})
        </button>
        {CATEGORIES.filter(c => catCounts[c] > 0).map(c => (
          <button
            key={c}
            onClick={() => setCatFilter(catFilter === c ? null : c)}
            className={`font-mono text-[10px] px-2 py-0.5 rounded-[4px] border transition-colors
              ${catFilter === c
                ? catColor[c]
                : 'text-fg-3 bg-surface-2 border-border hover:text-fg'}`}
          >
            {c.toUpperCase()} ({catCounts[c]})
          </button>
        ))}
        {catFilter && (
          <button onClick={() => setCatFilter(null)} className="flex items-center gap-0.5 text-[10px] text-fg-3 hover:text-fg ml-1">
            <X size={10} /> Clear
          </button>
        )}
      </div>

      {/* 2-col layout */}
      <div className="grid grid-cols-[5fr_8fr] gap-3.5" style={{ minHeight: '60vh' }}>
        {/* Ticket list */}
        <div className="bg-surface border border-border rounded-md overflow-hidden">
          {visible.map(t => (
            <button key={t.id} onClick={() => setSelected(t)} className="w-full text-left">
              <div className={`px-3.5 py-3 border-b border-border hover:bg-surface-2 transition-colors
                ${selected?.id === t.id ? 'bg-sky/5 border-l-2 border-l-sky' : ''}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[10px] text-fg-3">T-{t.id.slice(-4).toUpperCase()}</span>
                    <Badge kind={t.status === 'open' ? 'ok' : t.status === 'waiting' ? 'warn' : 'muted'}>
                      {t.status.toUpperCase()}
                    </Badge>
                    <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded-[4px] border
                      ${catColor[t.category] ?? 'text-fg-3 bg-surface-3 border-border'}`}>
                      {t.category.toUpperCase()}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-fg-3 shrink-0">{timeAgo(t.created_at)}</span>
                </div>
                <div className="text-xs font-semibold text-fg mb-0.5 truncate">{t.subject}</div>
                <div className="font-mono text-[10px] text-fg-3 truncate">{displayName(t)}</div>
              </div>
            </button>
          ))}
          {!visible.length && (
            <div className="px-4 py-8 text-xs text-fg-3 text-center">
              {catFilter ? `No ${catFilter} tickets in this view.` : 'No tickets in this view.'}
            </div>
          )}
        </div>

        {/* Ticket detail */}
        {selected ? (
          <div className="bg-surface border border-border rounded-md flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3.5 border-b border-border flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-fg mb-0.5 truncate">{selected.subject}</div>
                <div className="font-mono text-[10px] text-fg-3">
                  FROM {displayName(selected)}
                  {selected.email && ` · ${selected.email}`}
                  {' · '}{timeAgo(selected.created_at)}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                {selected.status !== 'closed' && (
                  <button
                    onClick={handleResolve}
                    disabled={resolving}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-ok/10 border border-ok/20 text-ok rounded-sm text-xs font-medium hover:bg-ok/20 transition-colors disabled:opacity-50"
                  >
                    <CheckCircle size={11} /> {resolving ? 'Resolving…' : 'Resolve'}
                  </button>
                )}
                {selected.status === 'closed' && (
                  <span className="px-3 py-1.5 bg-surface-2 border border-border rounded-sm text-xs text-fg-3 font-mono">
                    RESOLVED
                  </span>
                )}
              </div>
            </div>

            {/* Conversation thread */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ maxHeight: '400px' }}>
              {selected.message && (
                <div className="flex gap-2.5">
                  <Avatar initials={initials(displayName(selected))} size={32} />
                  <div className="flex-1 max-w-[80%]">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-xs font-medium text-fg">{displayName(selected)}</span>
                      <span className="font-mono text-[10px] text-fg-3">{timeAgo(selected.created_at)}</span>
                      <span className="font-mono text-[9px] text-fg-4 border border-border px-1 rounded">original</span>
                    </div>
                    <div className="p-3 rounded-md text-xs text-fg-2 leading-relaxed bg-surface-2 border border-border whitespace-pre-wrap">
                      {selected.message}
                    </div>
                  </div>
                </div>
              )}
              {messages.map(msg => {
                const isUser = msg.sender_id === selected.user_id
                const name = isUser ? displayName(selected) : 'Admin'
                const inits = initials(name)
                return (
                  <div key={msg.id} className={`flex gap-2.5 ${!isUser ? 'flex-row-reverse' : ''}`}>
                    <Avatar initials={inits} size={32} />
                    <div className={`flex-1 max-w-[80%] ${!isUser ? 'items-end flex flex-col' : ''}`}>
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-xs font-medium text-fg">{name}</span>
                        <span className="font-mono text-[10px] text-fg-3">
                          {new Date(msg.created_at).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className={`p-3 rounded-md text-xs text-fg-2 leading-relaxed
                        ${!isUser ? 'bg-sky/10 border border-sky/20' : 'bg-surface-2 border border-border'}`}>
                        {msg.message}
                      </div>
                    </div>
                  </div>
                )
              })}
              {!selected.message && messages.length === 0 && (
                <div className="text-xs text-fg-3 italic">No messages yet.</div>
              )}
            </div>

            {/* Reply box — hidden for resolved tickets */}
            {selected.status !== 'closed' ? (
              <div className="border-t border-border p-3.5">
                {error && <p className="text-xs text-danger mb-2">{error}</p>}
                <textarea
                  value={reply}
                  onChange={e => setReply(e.target.value)}
                  rows={3}
                  placeholder="Type your reply… (email will be sent to user)"
                  className="w-full bg-surface-2 border border-border rounded-md px-3 py-2.5 text-xs text-fg placeholder:text-fg-3 outline-none resize-none focus:border-sky/50 mb-2"
                />
                <div className="flex items-center justify-end">
                  <button
                    disabled={!reply.trim() || sending}
                    onClick={handleSend}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-sky text-on-sky rounded-sm text-xs font-semibold disabled:opacity-40 hover:bg-sky/90 transition-colors"
                  >
                    <Send size={11} /> {sending ? 'Sending…' : 'Send reply'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="border-t border-border px-4 py-3 bg-surface-2">
                <p className="text-xs text-fg-3">This ticket is resolved. To reopen, use the Supabase dashboard or submit a new ticket.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-surface border border-border rounded-md flex items-center justify-center">
            <span className="text-xs text-fg-3">Select a ticket to view</span>
          </div>
        )}
      </div>
    </div>
  )
}
