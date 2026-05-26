'use client'

import { useState } from 'react'
import { Plus, MoreHorizontal } from 'lucide-react'
import { Avatar } from '@/components/admin/ui'

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

type SettingsTab = 'Admin accounts' | 'Roles & permissions' | 'Audit log' | 'API tokens' | 'Webhooks' | 'Branding' | 'Security'

const ROLE_BADGE: Record<string, string> = {
  'super-admin': 'text-sky bg-sky/10 border-sky/20',
  'admin':       'text-ok bg-ok/10 border-ok/20',
  'support':     'text-cyan bg-cyan/10 border-cyan/20',
  'finance':     'text-warn bg-warn/10 border-warn/20',
  'read-only':   'text-fg-3 bg-surface-3 border-border',
}

const ROLES = [
  { name: 'Super-admin', color: '#4A9EFF', desc: 'Full access — billing, users, code deploys' },
  { name: 'Admin',       color: '#4ADE80', desc: 'Manage users, subscriptions, platform' },
  { name: 'Support',     color: '#34D2D6', desc: 'Tickets, user notes, read all data' },
  { name: 'Finance',     color: '#FFB74A', desc: 'Revenue, exports, pricing — no user write' },
  { name: 'Read-only',   color: '#5A6B85', desc: 'View everything, change nothing' },
]

const TABS: SettingsTab[] = ['Admin accounts', 'Roles & permissions', 'Audit log', 'API tokens', 'Webhooks', 'Branding', 'Security']

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function fmtDate(iso: string | null) {
  if (!iso) return 'Never'
  const d = new Date(iso)
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) +
    ' · ' + d.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })
}

export default function SettingsTabs({ admins, auditEntries }: Props) {
  const [tab, setTab] = useState<SettingsTab>('Admin accounts')

  const roleCounts = ROLES.reduce<Record<string, number>>((acc, r) => {
    acc[r.name.toLowerCase()] = admins.filter(a => a.role === r.name.toLowerCase()).length
    return acc
  }, {})

  return (
    <div>
      <div className="mb-5">
        <div className="font-mono text-[10px] text-fg-3 tracking-widest uppercase mb-1.5">ACCOUNTS · ROLES · AUDIT</div>
        <h1 className="text-4xl font-bold tracking-tight text-fg">Settings</h1>
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
          {tab === 'Admin accounts' && (
            <>
              {/* Admin accounts table */}
              <div className="bg-surface border border-border rounded-md overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <span className="font-mono text-[10px] text-fg-3 uppercase tracking-widest">
                    ADMIN ACCOUNTS · {admins.length}
                  </span>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 bg-sky text-on-sky rounded-sm text-xs font-semibold">
                    <Plus size={11} /> Invite admin
                  </button>
                </div>
                <div className="grid px-4 py-2 gap-3 border-b border-border text-[10px] font-mono text-fg-3 uppercase tracking-widest"
                  style={{ gridTemplateColumns: '40px 1fr 1.5fr 110px 160px 32px' }}>
                  {['', 'NAME', 'EMAIL', 'ROLE', 'LAST SIGN-IN', ''].map((h, i) => (
                    <span key={i}>{h}</span>
                  ))}
                </div>
                {admins.length === 0 && (
                  <div className="px-4 py-6 text-xs text-fg-3">No admins found.</div>
                )}
                {admins.map(a => (
                  <div key={a.id}
                    className="grid px-4 py-3 gap-3 items-center border-b border-border last:border-0 hover:bg-surface-2 transition-colors"
                    style={{ gridTemplateColumns: '40px 1fr 1.5fr 110px 160px 32px' }}>
                    <Avatar initials={initials(a.name)} size={32} />
                    <span className="text-xs font-medium text-fg">{a.name}</span>
                    <span className="font-mono text-xs text-fg-2">{a.email}</span>
                    <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded-[4px] border w-fit ${ROLE_BADGE[a.role] ?? 'text-fg-3 bg-surface-3 border-border'}`}>
                      {a.role.toUpperCase()}
                    </span>
                    <span className="font-mono text-xs text-fg-3">{fmtDate(a.last_sign_in_at)}</span>
                    <button className="text-fg-3 hover:text-fg transition-colors">
                      <MoreHorizontal size={14} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Bottom 2-col: roles + audit */}
              <div className="grid grid-cols-2 gap-3.5">
                {/* Roles */}
                <div className="bg-surface border border-border rounded-md p-4">
                  <div className="font-mono text-[10px] text-fg-3 uppercase tracking-widest mb-3">
                    ROLES · {ROLES.length}
                  </div>
                  {ROLES.map(r => (
                    <div key={r.name} className="flex items-start gap-2.5 py-2.5 border-b border-dashed border-border last:border-0">
                      <span className="w-2 h-2 rounded-full mt-1 shrink-0" style={{ background: r.color }} />
                      <div className="flex-1">
                        <div className="text-xs font-medium text-fg mb-0.5">{r.name}</div>
                        <div className="text-[11px] text-fg-3 leading-snug">{r.desc}</div>
                      </div>
                      <span className="font-mono text-[10px] text-fg-3 shrink-0">
                        {roleCounts[r.name.toLowerCase()] ?? 0}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Audit log */}
                <div className="bg-surface border border-border rounded-md p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-mono text-[10px] text-fg-3 uppercase tracking-widest">
                      AUDIT LOG · LAST {auditEntries.length}
                    </div>
                    <button className="font-mono text-[10px] text-sky hover:underline">View all →</button>
                  </div>
                  {auditEntries.length === 0 && (
                    <div className="text-xs text-fg-3 italic">No audit entries yet.</div>
                  )}
                  {auditEntries.map(entry => (
                    <div key={entry.id} className="flex items-center gap-2.5 py-2 border-b border-dashed border-border last:border-0">
                      <div className="w-5 h-5 rounded bg-surface-3 flex items-center justify-center shrink-0">
                        <span className="font-mono text-[9px] font-bold text-fg-2">
                          {initials(entry.admins?.name ?? 'SYS')}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-fg-2 truncate">{entry.action}</div>
                      </div>
                      <span className="font-mono text-[10px] text-fg-3 shrink-0 whitespace-nowrap">
                        {new Date(entry.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {tab !== 'Admin accounts' && (
            <div className="bg-surface border border-border rounded-md px-6 py-12 text-center">
              <div className="font-mono text-[10px] text-fg-3 uppercase tracking-widest mb-2">{tab.toUpperCase()}</div>
              <div className="text-xs text-fg-3">Coming soon</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
