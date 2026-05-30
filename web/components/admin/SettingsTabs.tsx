'use client'

import { useState, useRef, useEffect } from 'react'
import { Plus, MoreHorizontal, X, ChevronDown } from 'lucide-react'
import { Avatar } from '@/components/admin/ui'
import { useRouter } from 'next/navigation'

type AdminRow = {
  id: string
  name: string
  email: string
  role: string
  last_sign_in_at: string | null
  active: boolean
}

type AuditEntry = {
  id: string
  action: string
  target: string
  reason: string
  created_at: string
  admins: { name: string } | null
}

type Props = {
  admins: AdminRow[]
  auditEntries: AuditEntry[]
}

type SettingsTab = 'Admin accounts' | 'Roles & permissions' | 'Audit log'

const ROLE_BADGE: Record<string, string> = {
  'super-admin': 'text-sky bg-sky/10 border-sky/20',
  'admin':       'text-ok bg-ok/10 border-ok/20',
  'support':     'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
  'finance':     'text-warn bg-warn/10 border-warn/20',
  'read-only':   'text-fg-3 bg-surface-2 border-border',
}

const ROLES = [
  { value: 'super-admin', label: 'Super-admin', color: '#4A9EFF', desc: 'Full access — billing, users, code deploys' },
  { value: 'admin',       label: 'Admin',       color: '#4ADE80', desc: 'Manage users, subscriptions, platform' },
  { value: 'support',     label: 'Support',     color: '#34D2D6', desc: 'Tickets, user notes, read all data' },
  { value: 'finance',     label: 'Finance',     color: '#FFB74A', desc: 'Revenue, exports, pricing — no user write' },
  { value: 'read-only',   label: 'Read-only',   color: '#5A6B85', desc: 'View everything, change nothing' },
]

const TABS: SettingsTab[] = ['Admin accounts', 'Roles & permissions', 'Audit log']

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function fmtDate(iso: string | null) {
  if (!iso) return 'Never'
  const d = new Date(iso)
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) +
    ' · ' + d.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })
}

// ── Invite Modal ──────────────────────────────────────────────
function InviteModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('admin')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/admin/admins/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), role }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Something went wrong.'); return }
      onSuccess()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-surface border border-border rounded-xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-fg">Invite admin</h2>
          <button onClick={onClose} className="text-fg-3 hover:text-fg"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-mono text-fg-3 uppercase tracking-widest mb-1.5">Full name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              autoFocus
              className="w-full bg-surface-2 border border-border rounded-sm px-3 py-2 text-sm text-fg focus:outline-none focus:border-sky"
              placeholder="Jane Smith"
            />
          </div>
          <div>
            <label className="block text-[10px] font-mono text-fg-3 uppercase tracking-widest mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full bg-surface-2 border border-border rounded-sm px-3 py-2 text-sm text-fg focus:outline-none focus:border-sky"
              placeholder="jane@example.com"
            />
          </div>
          <div>
            <label className="block text-[10px] font-mono text-fg-3 uppercase tracking-widest mb-1.5">Role</label>
            <div className="relative">
              <select
                value={role}
                onChange={e => setRole(e.target.value)}
                className="w-full appearance-none bg-surface-2 border border-border rounded-sm px-3 py-2 text-sm text-fg focus:outline-none focus:border-sky pr-8"
              >
                {ROLES.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-fg-3 pointer-events-none" />
            </div>
            <p className="text-[11px] text-fg-3 mt-1">{ROLES.find(r => r.value === role)?.desc}</p>
          </div>
          {error && <p className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-sm px-3 py-2">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-sm text-sm font-medium border border-border text-fg-2 hover:text-fg hover:bg-surface-2 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="flex-1 py-2 rounded-sm text-sm font-semibold bg-sky text-on-sky hover:bg-sky/90 disabled:opacity-50 transition-colors">
              {loading ? 'Sending invite…' : 'Send invite'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Row Actions Menu ──────────────────────────────────────────
function AdminRowMenu({ admin, onRefresh }: { admin: AdminRow; onRefresh: () => void }) {
  const [open, setOpen] = useState(false)
  const [changingRole, setChangingRole] = useState(false)
  const [selectedRole, setSelectedRole] = useState(admin.role)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  async function doPatch(body: object) {
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/admins/${admin.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Error'); return }
      setOpen(false)
      onRefresh()
    } finally {
      setLoading(false)
    }
  }

  async function doDelete() {
    if (!confirm(`Remove ${admin.name} as admin? This cannot be undone.`)) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/admins/${admin.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Error'); return }
      setOpen(false)
      onRefresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen(v => !v); setChangingRole(false); setError('') }}
        className="text-fg-3 hover:text-fg transition-colors"
        disabled={loading}
      >
        <MoreHorizontal size={14} />
      </button>
      {open && (
        <div className="absolute right-0 top-6 z-30 w-52 bg-surface border border-border rounded-md shadow-xl py-1">
          {error && <p className="text-[11px] text-danger px-3 py-1.5 border-b border-border">{error}</p>}
          {!changingRole ? (
            <>
              <button onClick={() => setChangingRole(true)} className="w-full text-left px-3 py-2 text-xs text-fg-2 hover:bg-surface-2 hover:text-fg transition-colors">
                Change role…
              </button>
              <button onClick={() => doPatch({ active: !admin.active })} className="w-full text-left px-3 py-2 text-xs text-fg-2 hover:bg-surface-2 hover:text-fg transition-colors">
                {admin.active ? 'Deactivate' : 'Reactivate'}
              </button>
              <div className="border-t border-border my-1" />
              <button onClick={doDelete} className="w-full text-left px-3 py-2 text-xs text-danger hover:bg-danger/10 transition-colors">
                Remove admin
              </button>
            </>
          ) : (
            <div className="px-3 py-2 space-y-2">
              <p className="text-[10px] font-mono text-fg-3 uppercase tracking-widest">Change role</p>
              <div className="relative">
                <select
                  value={selectedRole}
                  onChange={e => setSelectedRole(e.target.value)}
                  className="w-full appearance-none bg-surface-2 border border-border rounded-sm px-2 py-1.5 text-xs text-fg focus:outline-none focus:border-sky pr-6"
                >
                  {ROLES.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
                <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-fg-3 pointer-events-none" />
              </div>
              <div className="flex gap-1.5">
                <button onClick={() => setChangingRole(false)} className="flex-1 py-1 text-xs border border-border rounded-sm text-fg-2 hover:bg-surface-2 transition-colors">
                  Cancel
                </button>
                <button
                  onClick={() => doPatch({ role: selectedRole })}
                  disabled={selectedRole === admin.role}
                  className="flex-1 py-1 text-xs bg-sky text-on-sky rounded-sm font-medium disabled:opacity-40 hover:bg-sky/90 transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────
export default function SettingsTabs({ admins: initialAdmins, auditEntries }: Props) {
  const [tab, setTab] = useState<SettingsTab>('Admin accounts')
  const [admins] = useState(initialAdmins)
  const [showInvite, setShowInvite] = useState(false)
  const router = useRouter()

  function refresh() {
    router.refresh()
  }

  const roleCounts = ROLES.reduce<Record<string, number>>((acc, r) => {
    acc[r.value] = admins.filter(a => a.role === r.value).length
    return acc
  }, {})

  return (
    <div>
      {showInvite && (
        <InviteModal
          onClose={() => setShowInvite(false)}
          onSuccess={() => { setShowInvite(false); refresh() }}
        />
      )}

      <div className="mb-5">
        <div className="font-mono text-[10px] text-fg-3 tracking-widest uppercase mb-1.5">SETTINGS</div>
        <h1 className="text-4xl font-bold tracking-tight text-fg">Admin settings</h1>
      </div>

      <div className="grid grid-cols-[180px_1fr] gap-3.5">
        {/* Left tab list */}
        <div className="bg-surface border border-border rounded-md p-1.5 h-fit">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`w-full text-left px-3 py-2 rounded-sm text-xs font-medium transition-colors
                ${tab === t ? 'bg-sky/10 text-sky' : 'text-fg-2 hover:text-fg hover:bg-surface-2'}`}>
              {t}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex flex-col gap-3.5">

          {/* ── Admin accounts ── */}
          {tab === 'Admin accounts' && (
            <>
              <div className="bg-surface border border-border rounded-md overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <span className="font-mono text-[10px] text-fg-3 uppercase tracking-widest">
                    ADMIN ACCOUNTS · {admins.length}
                  </span>
                  <button
                    onClick={() => setShowInvite(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-sky text-on-sky rounded-sm text-xs font-semibold hover:bg-sky/90 transition-colors"
                  >
                    <Plus size={11} /> Invite admin
                  </button>
                </div>
                <div
                  className="grid px-4 py-2 gap-3 border-b border-border text-[10px] font-mono text-fg-3 uppercase tracking-widest"
                  style={{ gridTemplateColumns: '40px 1fr 1.5fr 110px 160px 80px 32px' }}
                >
                  {['', 'NAME', 'EMAIL', 'ROLE', 'LAST SIGN-IN', 'STATUS', ''].map((h, i) => (
                    <span key={i}>{h}</span>
                  ))}
                </div>
                {admins.length === 0 && (
                  <div className="px-4 py-6 text-xs text-fg-3">No admins found.</div>
                )}
                {admins.map(a => (
                  <div key={a.id}
                    className="grid px-4 py-3 gap-3 items-center border-b border-border last:border-0 hover:bg-surface-2 transition-colors"
                    style={{ gridTemplateColumns: '40px 1fr 1.5fr 110px 160px 80px 32px' }}>
                    <Avatar initials={initials(a.name)} size={32} />
                    <span className="text-xs font-medium text-fg">{a.name}</span>
                    <span className="font-mono text-xs text-fg-2">{a.email}</span>
                    <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded-[4px] border w-fit ${ROLE_BADGE[a.role] ?? 'text-fg-3 bg-surface-2 border-border'}`}>
                      {a.role.toUpperCase()}
                    </span>
                    <span className="font-mono text-xs text-fg-3">{fmtDate(a.last_sign_in_at)}</span>
                    <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded-[4px] border w-fit ${a.active ? 'text-ok bg-ok/10 border-ok/20' : 'text-fg-3 bg-surface-2 border-border'}`}>
                      {a.active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                    <AdminRowMenu admin={a} onRefresh={refresh} />
                  </div>
                ))}
              </div>

              {/* Recent audit log */}
              <div className="bg-surface border border-border rounded-md p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="font-mono text-[10px] text-fg-3 uppercase tracking-widest">
                    RECENT AUDIT · LAST {auditEntries.length}
                  </div>
                  <button onClick={() => setTab('Audit log')} className="font-mono text-[10px] text-sky hover:underline">
                    View all →
                  </button>
                </div>
                {auditEntries.length === 0 && (
                  <div className="text-xs text-fg-3 italic">No audit entries yet.</div>
                )}
                {auditEntries.map(entry => (
                  <div key={entry.id} className="flex items-center gap-2.5 py-2 border-b border-dashed border-border last:border-0">
                    <div className="w-5 h-5 rounded bg-surface-2 flex items-center justify-center shrink-0">
                      <span className="font-mono text-[9px] font-bold text-fg-2">
                        {initials(entry.admins?.name ?? 'SYS')}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-fg-2 truncate">{entry.action}</div>
                      {entry.reason && <div className="text-[11px] text-fg-3 truncate">{entry.reason}</div>}
                    </div>
                    <span className="font-mono text-[10px] text-fg-3 shrink-0 whitespace-nowrap">
                      {new Date(entry.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── Roles & permissions ── */}
          {tab === 'Roles & permissions' && (
            <div className="bg-surface border border-border rounded-md p-4">
              <div className="font-mono text-[10px] text-fg-3 uppercase tracking-widest mb-4">ROLES · {ROLES.length}</div>
              {ROLES.map(r => (
                <div key={r.value} className="flex items-start gap-3 py-3.5 border-b border-border last:border-0">
                  <span className="w-2.5 h-2.5 rounded-full mt-1 shrink-0" style={{ background: r.color }} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium text-fg">{r.label}</span>
                      <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded-[4px] border ${ROLE_BADGE[r.value] ?? ''}`}>
                        {roleCounts[r.value] ?? 0} {(roleCounts[r.value] ?? 0) === 1 ? 'admin' : 'admins'}
                      </span>
                    </div>
                    <div className="text-xs text-fg-3">{r.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Audit log ── */}
          {tab === 'Audit log' && (
            <div className="bg-surface border border-border rounded-md overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <span className="font-mono text-[10px] text-fg-3 uppercase tracking-widest">
                  AUDIT LOG · {auditEntries.length} ENTRIES
                </span>
              </div>
              {auditEntries.length === 0 && (
                <div className="px-4 py-8 text-xs text-fg-3 text-center">No audit entries yet.</div>
              )}
              {auditEntries.map(entry => (
                <div key={entry.id} className="flex items-start gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-surface-2 transition-colors">
                  <div className="w-7 h-7 rounded-full bg-surface-2 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="font-mono text-[10px] font-bold text-fg-2">
                      {initials(entry.admins?.name ?? 'SYS')}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium text-fg">{entry.admins?.name ?? 'System'}</span>
                      <span className="font-mono text-[10px] text-fg-3 bg-surface-2 px-1.5 py-0.5 rounded">{entry.action}</span>
                      <span className="font-mono text-[10px] text-fg-3">{entry.target}</span>
                    </div>
                    {entry.reason && <div className="text-xs text-fg-3 mt-0.5">{entry.reason}</div>}
                  </div>
                  <span className="font-mono text-[10px] text-fg-3 shrink-0 whitespace-nowrap">
                    {new Date(entry.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
