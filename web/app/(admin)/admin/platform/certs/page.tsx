export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase/admin'
import { AdminCard, AdminPageHeader, Badge } from '@/components/admin/ui'
import { ChevronRight } from 'lucide-react'
import Link from 'next/link'

function fmtDate(s: string | null) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default async function CertsListPage() {
  const db = createAdminClient()

  const { data: certs } = await db
    .from('certificates')
    .select('id, cert_type, cert_number, issued_date, expiry_date, users(id, full_name, email)')
    .order('issued_date', { ascending: false })

  const rows = certs ?? []

  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs text-fg-3 mb-4">
        <Link href="/admin/dashboard" className="text-fg-2 hover:text-fg">Dashboard</Link>
        <ChevronRight size={11} className="text-fg-4" />
        <span className="text-fg-2">Certificates</span>
      </div>

      <AdminPageHeader title="Certificates" sub={`${rows.length} registered`} />

      <AdminCard title={`ALL CERTS · ${rows.length}`}>
        {rows.length === 0 && <div className="text-xs text-fg-3 py-2">No certificates yet</div>}
        {rows.map(c => {
          const user = c.users as unknown as { id: string; full_name: string; email: string } | null
          const expired = c.expiry_date && new Date(c.expiry_date) < new Date()
          return (
            <div key={c.id} className="flex items-center justify-between py-2.5 border-b border-dashed border-border last:border-0">
              <div>
                <div className="text-sm font-medium text-fg">{c.cert_type}{c.cert_number ? ` · ${c.cert_number}` : ''}</div>
                {user && (
                  <Link href={`/admin/users/${user.id}`} className="font-mono text-[10px] text-sky hover:underline mt-0.5 block">
                    {user.full_name || user.email}
                  </Link>
                )}
                <div className="font-mono text-[10px] text-fg-3 mt-0.5">
                  Issued {fmtDate(c.issued_date)}{c.expiry_date ? ` · Expires ${fmtDate(c.expiry_date)}` : ''}
                </div>
              </div>
              {expired && <Badge kind="warn">EXPIRED</Badge>}
            </div>
          )
        })}
      </AdminCard>
    </div>
  )
}
