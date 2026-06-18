import type { Metadata } from 'next'
import { PublicMarkdown } from '@/components/MarkdownRenderer'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Changelog — Jump Logs',
  description: 'See what\'s new in every version of Jump Logs.',
  alternates: { canonical: 'https://jumplogs.com/changelog' },
}

type ChangeCategory = 'New' | 'Fix' | 'Improvement'

const BADGE: Record<ChangeCategory, string> = {
  New:         'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  Fix:         'bg-amber-500/10 text-amber-400 border-amber-500/20',
  Improvement: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default async function ChangelogPage() {
  const db = createAdminClient()
  let { data: releases, error } = await db
    .from('releases')
    .select('id, build_number, version, title, changes, platforms, published_at')
    .eq('is_published', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  // sort_order column may not exist yet — fall back to created_at ordering
  if (error) {
    ;({ data: releases } = await db
      .from('releases')
      .select('id, build_number, version, title, changes, platforms, published_at')
      .eq('is_published', true)
      .order('created_at', { ascending: false }))
  }

  return (
    <main className="max-w-2xl mx-auto px-5 py-16">
      <div className="mb-12">
        <p className="font-mono text-xs tracking-widest text-fg-3 mb-2 uppercase">Jump Logs</p>
        <h1 className="text-4xl font-bold text-fg tracking-tight">Changelog</h1>
        <p className="text-fg-3 mt-3">Everything new, fixed, and improved in Jump Logs.</p>
      </div>

      {(!releases || releases.length === 0) && (
        <p className="text-fg-4 text-sm">No releases published yet.</p>
      )}

      <div className="space-y-12">
        {(releases ?? []).map(release => (
          <div key={release.id} className="relative pl-6 border-l border-border">
            <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-sky border-2 border-bg" />

            <div className="mb-3">
              <div className="flex items-center gap-3 flex-wrap">
                {release.version && (
                  <span className="font-mono text-lg font-bold text-fg">v{release.version}</span>
                )}
                {release.build_number && (
                  <span className="font-mono text-xs text-fg-4 bg-surface border border-border px-2 py-0.5 rounded-sm">
                    Build {release.build_number}
                  </span>
                )}
                {((release.platforms ?? []) as string[]).map(p => (
                  <span key={p} className="inline-flex items-center px-2 py-0.5 rounded-sm border text-[11px] font-mono tracking-wide text-fg-3 bg-surface border-border">
                    {p}
                  </span>
                ))}
              </div>
              {release.title && (
                <h2 className="text-base font-semibold text-fg mt-0.5">{release.title}</h2>
              )}
              {release.published_at && (
                <p className="text-xs text-fg-4 mt-0.5">{fmtDate(release.published_at)}</p>
              )}
            </div>

            <ul className="space-y-2">
              {((release.changes ?? []) as { category: ChangeCategory; text: string }[]).map((ch, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-mono tracking-widest flex-shrink-0 mt-0.5 ${BADGE[ch.category] ?? BADGE.Improvement}`}>
                    {ch.category.toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <PublicMarkdown>{ch.text}</PublicMarkdown>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </main>
  )
}
