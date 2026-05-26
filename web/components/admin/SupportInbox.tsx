'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, ChevronDown, Send } from 'lucide-react'
import { Badge, Avatar } from '@/components/admin/ui'
import { createClient } from '@/lib/supabase/client'

type Ticket = {
  id: string
  user_id: string
  subject: string
  category: string
  status: 'open' | 'waiting' | 'closed'
  severity: string
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

type TabFilter = 'All open' | 'Waiting' | 'Mine' | 'Closed'

const catColor: Record<string, string> = {
  billing: 'text-warn bg-warn/10 border-warn/20',
  bug:     'text-danger bg-danger/10 border-danger/20',
  support: 'text-sky bg-sky/10 border-sky/20',
  feature: 'text-ok bg-ok/10 border-ok/20',
  flag:    'text-cyan bg-cyan/10 border-cyan/20',
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
  const [tickets, setTickets]     = useState<Ticket[]>(initialTickets)
  const [selected, setSelected]   = useState<Ticket | null>(initialTickets[0] ?? null)
  const [messages, setMessages]   = useState<Message[]>([])
  const [reply, setReply]         = useState('')
  const [sending, setSending]     = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const TAB_COUNTS: Record<TabFilter, number> = {
    'All open': openCount,
    'Waiting':  waitingCount,
    'Mine':     0,
    'Closed':   closedCount,
  }

  // Get current admin user ID once
  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null)
    })
  }, [])

  // Reload tickets if tab changes
  useEffect(() => {
    const sb = createClient()
    let query = sb.from('support_tickets')
      .select('id, user_id, subject, category, status, severity, created_at, users(full_name)')
      .order('created_at', { ascending: false })
      .limit(50)

    if (tab === 'Closed')    query = query.eq('status', 'closed')
    else if (tab === 'Waiting') query = query.eq('status', 'waiting')
    else                     query = query.not('status', 'eq', 'closed')

    query.then(({ data }) => {
      const rows = (data ?? []) as unknown as Ticket[]
      setTickets(rows)
      if (rows.length && !rows.find(r => r.id === selected?.id)) {
        setSelected(rows[0])
      }
    })
  }, [tab]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load messages when selected ticket changes
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

  async function handleSend() {
    if (!reply.trim() || !selected || !currentUserId) return
    setSending(true)
    const sb = createClient()
    await sb.from('ticket_messages').insert({
      ticket_id: selected.id,
      sender_id: currentUserId,
      message:   reply.trim(),
    })
    setReply('')
    await loadMessages(selected.id)
    setSending(false)
  }

  async function handleClose() {
    if (!selected) return
    await createClient()
      .from('support_tickets')
      .update({ status: 'closed' })
      .eq('id', selected.id)
    setTickets(prev => prev.map(t => t.id === selected.id ? { ...t, status: 'closed' as const } : t))
    setSelected(prev => prev ? { ...prev, status: 'closed' as const } : prev)
  }

  return (
    <div>
      <div className="flex items-end justify-between mb-5">
        <div>
          <div className="font-mono text-[10px] text-fg-3 tracking-widest uppercase mb-1.5">
            INBOX · {openCount} OPEN
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-fg">Support tickets</h1>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-sky text-on-sky rounded-sm text-xs font-semibold">
          <Plus size={12} /> New ticket
        </button>
      </div>

      {/* Filter tabs + sort */}
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-1 bg-surface-2 border border-border rounded-md p-0.5">
          {(['All open', 'Waiting', 'Mine', 'Closed'] as TabFilter[]).map(t => (
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

      {/* 2-col layout */}
      <div className="grid grid-cols-[5fr_8fr] gap-3.5" style={{ minHeight: '60vh' }}>
        {/* Ticket list */}
        <div className="bg-surface border border-border rounded-md overflow-hidden">
          {tickets.map(t => (
            <button key={t.id} onClick={() => setSelected(t)} className="w-full text-left">
              <div className={`px-3.5 py-3 border-b border-border hover:bg-surface-2 transition-colors
                ${selected?.id === t.id ? 'bg-sky/8 border-l-2 border-l-sky' : ''}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[10px] text-fg-3">
                      T-{t.id.slice(-4).toUpperCase()}
                    </span>
                    <Badge kind={t.status === 'open' || t.status === 'waiting' ? 'ok' : 'muted'}>
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
                <div className="font-mono text-[10px] text-fg-3 truncate">
                  {t.users?.full_name ?? 'Unknown user'}
                </div>
              </div>
            </button>
          ))}
          {!tickets.length && (
            <div className="px-4 py-8 text-xs text-fg-3 text-center">No tickets in this view.</div>
          )}
        </div>

        {/* Ticket detail */}
        {selected ? (
          <div className="bg-surface border border-border rounded-md flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3.5 border-b border-border flex items-start gap-3">
              <div className="flex-1">
                <div className="text-sm font-semibold text-fg mb-0.5">{selected.subject}</div>
                <div className="font-mono text-[10px] text-fg-3">
                  FROM {selected.users?.full_name ?? 'Unknown'} · {timeAgo(selected.created_at)}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button className="px-3 py-1.5 bg-surface-2 border border-border rounded-sm text-xs text-fg-2 font-medium hover:bg-surface-3 transition-colors">
                  Assign
                </button>
                {selected.status !== 'closed' && (
                  <button onClick={handleClose}
                    className="px-3 py-1.5 bg-ok/10 border border-ok/20 text-ok rounded-sm text-xs font-medium hover:bg-ok/20 transition-colors">
                    Close ticket
                  </button>
                )}
              </div>
            </div>

            {/* Conversation thread */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ maxHeight: '400px' }}>
              {messages.length === 0 && (
                <div className="text-xs text-fg-3 italic">No messages yet.</div>
              )}
              {messages.map(msg => {
                const isUser = msg.sender_id === selected.user_id
                const name = isUser ? (selected.users?.full_name ?? 'User') : 'Admin'
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
            </div>

            {/* Reply box */}
            <div className="border-t border-border p-3.5">
              <textarea value={reply} onChange={e => setReply(e.target.value)} rows={3}
                placeholder="Type your reply…"
                className="w-full bg-surface-2 border border-border rounded-md px-3 py-2.5 text-xs text-fg placeholder:text-fg-3 outline-none resize-none focus:border-sky/50 mb-2" />
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <button className="text-[10px] font-mono text-fg-3 hover:text-fg py-1 px-2 border border-border rounded-sm">Saved replies</button>
                  <button className="text-[10px] font-mono text-fg-3 hover:text-fg py-1 px-2 border border-border rounded-sm">Snippets</button>
                </div>
                <button disabled={!reply.trim() || sending}
                  onClick={handleSend}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-sky text-on-sky rounded-sm text-xs font-semibold disabled:opacity-40 hover:bg-sky/90 transition-colors">
                  <Send size={11} /> {sending ? 'Sending…' : 'Send reply'}
                </button>
              </div>
            </div>
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
