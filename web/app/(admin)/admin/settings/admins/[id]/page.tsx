export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase/admin'
import { AdminCard, Badge, Avatar, AdminPageHeader } from '@/components/admin/ui'
import AdminDetailClient from '@/components/admin/AdminDetailClient'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

function fmtDate(s: string | null) {
  if (!s) return '—'
  return new Date(s).toLocaleString('en-AU', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
  })
}

const ROLE_BADGE: Record<string, 'ok' | 'sky' | 'warn' | 'muted'> = {
  'super-admin': 'sky',
  'admin':       'ok',
  'support':     'ok',
  'finance':     'warn',
  'read-only':   'muted',
}

const ROLE_DESCS: Record<string, string> = {
  'super-admin': 'Full access — billing, users, code deploys',
  'admin':       'Manage users, subscriptions, platform',
  'support':     'Tickets, user notes, read all data',
  'finance':     'Revenue, exports, pricing — no user write',
  'read-only':   'View everything, change nothing',
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

export default async function AdminAccountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = createAdminClient()

  const [{ data: admin }, { data: auditEntries }] = await Promise.all([
    db.from('admins')
      .select('id, name, email, role, active')
      .eq('id', id)
      .maybeSingle(),
    db.from('audit_log')
      .select('id, action, target, reason, created_at')
      .eq('admin_id', id)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  if (!admin) notFound()

  // Fetch last_sign_in_at from auth.users (admins table column is never written to)
  const { data: authList } = await db.auth.admin.listUsers({ perPage: 1000 })
  const authUser = (authList?.users ?? []).find(u => u.email === admin.email)
  const last_sign_in_at = authUser?.last_sign_in_at ?? null

  const roleDesc = ROLE_DESCS[admin.role] ?? ''
  const roleBadgeKind = ROLE_BADGE[admin.role] ?? 'muted'

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-[11px] font-mono text-fg-3 mb-4">
        <Link href="/admin/settings" className="hover:text-fg transition-colors">Settings</Link>
        <ChevronRight size={10} />
        <Link href="/admin/settings" className="hover:text-fg transition-colors">Admin accounts</Link>
        <ChevronRight size={10} />
        <span className="text-fg">{admin.name}</span>
      </div>

      {/* Header */}
      <AdminPageHeader
        title={admin.name}
        sub={admin.email}
      />

      {/* Layout */}
      <div className="grid grid-cols-[5fr_3fr] gap-3.5">
        {/* Left column */}
        <div className="flex flex-col gap-3.5">

          {/* Account details */}
          <AdminCard title="ACCOUNT DETAILS">
            <div className="flex items-center gap-4 mb-5">
              <Avatar initials={initials(admin.name)} size={56} />
              <div>
                <div className="text-lg font-semibold text-fg">{admin.name}</div>
                <div className="font-mono text-xs text-fg-3">{admin.email}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              {[
                { label: 'Role', value: <Badge kind={roleBadgeKind}>{admin.role.toUpperCase()}</Badge> },
                { label: 'Status', value: <Badge kind={admin.active ? 'ok' : 'muted'}>{admin.active ? 'ACTIVE' : 'INACTIVE'}</Badge> },
                { label: 'Last sign-in', value: <span className="font-mono text-xs text-fg-2">{fmtDate(last_sign_in_at)}</span> },
                { label: 'Role description', value: <span className="text-xs text-fg-2">{roleDesc}</span> },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div className="text-[10px] font-mono text-fg-3 uppercase tracking-widest mb-1">{label}</div>
                  <div>{value}</div>
                </div>
              ))}
            </div>
          </AdminCard>

          {/* Audit log */}
          <AdminCard title={`AUDIT LOG · ${auditEntries?.length ?? 0} ENTRIES`} noPad>
            {(!auditEntries || auditEntries.length === 0) && (
              <div className="px-4 py-8 text-xs text-fg-3 text-center">No audit entries for this admin yet.</div>
            )}
            {(auditEntries ?? []).map(entry => (
              <div key={entry.id} className="flex items-start gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-surface-2 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[10px] text-fg-3 bg-surface-2 px-1.5 py-0.5 rounded">{entry.action}</span>
                    {entry.target && <span className="font-mono text-[10px] text-fg-3">{entry.target}</span>}
                  </div>
                  {entry.reason && <div className="text-xs text-fg-3 mt-0.5">{entry.reason}</div>}
                </div>
                <span className="font-mono text-[10px] text-fg-3 shrink-0 whitespace-nowrap">
                  {new Date(entry.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: '2-digit' })}
                  {' · '}
                  {new Date(entry.created_at).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </AdminCard>
        </div>

        {/* Right column — actions */}
        <div>
          <AdminDetailClient admin={admin} />
        </div>
      </div>
    </div>
  )
}
