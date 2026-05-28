export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })
}

const statusStyle: Record<string, string> = {
  open:    'bg-ok/10 text-ok border-ok/20',
  waiting: 'bg-warn/10 text-warn border-warn/20',
  closed:  'bg-surface-3 text-fg-3 border-border',
}

const catLabel: Record<string, string> = {
  support: 'Support',
  billing: 'Billing',
  feature: 'Feature',
  bug:     'Bug',
  press:   'Press',
  flag:    'Flag',
}

export default async function AccountSupportPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: tickets } = await supabase
    .from('support_tickets')
    .select('id, subject, category, status, message, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-fg mb-1">Support tickets</h1>
        <p className="text-sm text-fg-3">
          Your submitted enquiries.{' '}
          <Link href="/contact" className="text-sky hover:underline">Submit a new ticket →</Link>
        </p>
      </div>

      {!tickets?.length ? (
        <div className="py-12 text-center border border-border rounded-lg bg-surface-2">
          <p className="text-sm text-fg-3 mb-3">No tickets yet.</p>
          <Link
            href="/contact"
            className="text-xs font-semibold bg-sky text-on-sky px-4 py-2 rounded-sm hover:bg-sky/90 transition-colors"
          >
            Contact support
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {tickets.map(t => (
            <div key={t.id} className="bg-surface border border-border rounded-lg p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-fg truncate">{t.subject}</div>
                  <div className="font-mono text-[10px] text-fg-4 mt-0.5">
                    T-{t.id.slice(-6).toUpperCase()} · {fmtDate(t.created_at)}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="font-mono text-[10px] text-fg-3 border border-border bg-surface-2 px-1.5 py-0.5 rounded-[4px]">
                    {catLabel[t.category] ?? t.category}
                  </span>
                  <span className={`font-mono text-[10px] border px-1.5 py-0.5 rounded-[4px] ${statusStyle[t.status] ?? statusStyle.closed}`}>
                    {t.status.toUpperCase()}
                  </span>
                </div>
              </div>
              {t.message && (
                <p className="text-xs text-fg-3 line-clamp-2 leading-relaxed">{t.message}</p>
              )}
              {t.status === 'closed' && (
                <p className="text-xs text-ok mt-2">✓ Resolved</p>
              )}
              {t.status === 'waiting' && (
                <p className="text-xs text-warn mt-2">↩ We replied — check your email</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
