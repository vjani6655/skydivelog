'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, Trash2, ToggleLeft, ToggleRight, Save } from 'lucide-react'
import { AdminCard } from '@/components/admin/ui'

const ROLES = [
  { value: 'super-admin', label: 'Super-admin', desc: 'Full access — billing, users, code deploys' },
  { value: 'admin',       label: 'Admin',       desc: 'Manage users, subscriptions, platform' },
  { value: 'support',     label: 'Support',     desc: 'Tickets, user notes, read all data' },
  { value: 'finance',     label: 'Finance',     desc: 'Revenue, exports, pricing — no user write' },
  { value: 'read-only',   label: 'Read-only',   desc: 'View everything, change nothing' },
]

type Admin = {
  id: string
  name: string
  email: string
  role: string
  active: boolean
  last_sign_in_at: string | null
}

export default function AdminDetailClient({ admin }: { admin: Admin }) {
  const router = useRouter()
  const [role, setRole] = useState(admin.role)
  const [active, setActive] = useState(admin.active)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  async function doPatch(body: object) {
    setError('')
    setSaved(false)
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/admins/${admin.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Something went wrong.'); return }
      setSaved(true)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  async function doDelete() {
    if (!confirm(`Remove ${admin.name} as admin?\n\nThis will revoke their admin access immediately. This cannot be undone.`)) return
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/admins/${admin.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Something went wrong.'); return }
      router.push('/admin/settings')
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  const dirty = role !== admin.role || active !== admin.active

  return (
    <div className="flex flex-col gap-3.5">

      {/* Edit card */}
      <AdminCard title="EDIT ACCOUNT">
        {/* Role */}
        <div className="mb-4">
          <label className="block text-[10px] font-mono text-fg-3 uppercase tracking-widest mb-1.5">Role</label>
          <div className="relative">
            <select
              value={role}
              onChange={e => { setRole(e.target.value); setSaved(false) }}
              className="w-full appearance-none bg-surface-2 border border-border rounded-sm px-3 py-2 text-sm text-fg focus:outline-none focus:border-sky pr-8"
            >
              {ROLES.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-fg-3 pointer-events-none" />
          </div>
          <p className="text-[11px] text-fg-3 mt-1.5">{ROLES.find(r => r.value === role)?.desc}</p>
        </div>

        {/* Active toggle */}
        <div className="flex items-center justify-between py-3 border-t border-border">
          <div>
            <div className="text-xs font-medium text-fg">Account active</div>
            <div className="text-[11px] text-fg-3">Inactive admins cannot sign in</div>
          </div>
          <button
            onClick={() => { setActive(v => !v); setSaved(false) }}
            className={`transition-colors ${active ? 'text-ok' : 'text-fg-3 hover:text-fg'}`}
          >
            {active
              ? <ToggleRight size={28} className="fill-ok/20" />
              : <ToggleLeft size={28} />
            }
          </button>
        </div>

        {/* Error / success */}
        {error && (
          <p className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-sm px-3 py-2 mt-3">
            {error}
          </p>
        )}
        {saved && (
          <p className="text-xs text-ok bg-ok/10 border border-ok/20 rounded-sm px-3 py-2 mt-3">
            Changes saved.
          </p>
        )}

        {/* Save button */}
        <button
          onClick={() => doPatch({ role, active })}
          disabled={!dirty || loading}
          className="w-full mt-4 flex items-center justify-center gap-2 py-2 rounded-sm text-sm font-semibold bg-sky text-on-sky hover:bg-sky/90 disabled:opacity-40 transition-colors"
        >
          <Save size={13} />
          {loading ? 'Saving…' : 'Save changes'}
        </button>
      </AdminCard>

      {/* Danger zone */}
      <AdminCard title="DANGER ZONE">
        <p className="text-xs text-fg-3 mb-3 leading-relaxed">
          Removing this admin will revoke all access immediately. Their audit log history will be preserved.
        </p>
        <button
          onClick={doDelete}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-sm text-sm font-semibold border border-danger/40 text-danger hover:bg-danger/10 disabled:opacity-40 transition-colors"
        >
          <Trash2 size={13} />
          Remove admin account
        </button>
      </AdminCard>

    </div>
  )
}
