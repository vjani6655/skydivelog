import { createClient } from '@/lib/supabase/server'
import { notFound }     from 'next/navigation'
import Link             from 'next/link'

interface PageProps {
  params: Promise<{ token: string }>
}

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: PageProps) {
  const { token } = await params
  return {
    title: `Logbook Verification · ${token} — Jump Logs`,
  }
}

export default async function VerifyPage({ params }: PageProps) {
  const { token } = await params
  const supabase = await createClient()

  // ── Look up the export record ─────────────────────────────────────────────
  const { data: record } = await supabase
    .from('pdf_exports')
    .select('id, user_id, jump_ids, layout, created_at')
    .eq('code', token)
    .maybeSingle()

  if (!record) notFound()

  // ── Fetch the jumper's public profile ─────────────────────────────────────
  const { data: profile } = await supabase
    .from('users')
    .select('full_name, licence_number, licence_rating')
    .eq('id', record.user_id)
    .maybeSingle()

  // ── Fetch the listed jumps ────────────────────────────────────────────────
  const { data: jumps } = await supabase
    .from('jumps')
    .select(`
      id,
      jump_number,
      date,
      jump_type,
      jumper_type,
      freefall_seconds,
      dropzones ( name ),
      signatures ( signer_name, signer_licence_number, outcome )
    `)
    .in('id', record.jump_ids as string[])
    .is('deleted_at', null)
    .order('jump_number', { ascending: true })

  // ── Format helpers ────────────────────────────────────────────────────────
  function fmtDate(iso: string) {
    const d = new Date(iso)
    return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
  }

  const exportedAt = fmtDate(record.created_at)
  const jumperName = profile?.full_name ?? 'Unknown jumper'
  const licence    = [profile?.licence_number, profile?.licence_rating].filter(Boolean).join(' · ')

  return (
    <main className="min-h-screen bg-[#FAFAF7] text-[#0A1220]">
      {/* Header */}
      <header className="border-b border-[#D8D4C8] bg-white px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-bold text-sm tracking-tight">Jump Logs</Link>
        <span className="font-mono text-xs text-[#7F8B9D] tracking-wider">VERIFICATION RECORD</span>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Verified stamp */}
        <div className="flex items-start gap-4 mb-8">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100">
            <svg className="h-5 w-5 text-green-700" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 0 1 0 1.414l-8 8a1 1 0 0 1-1.414 0l-4-4a1 1 0 1 1 1.414-1.414L8 12.586l7.293-7.293a1 1 0 0 1 1.414 0z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-green-800 text-base">Verified by Jump Logs</p>
            <p className="text-sm text-[#7F8B9D] mt-0.5">
              This document was exported from a verified Jump Logs account on {exportedAt}.
            </p>
          </div>
        </div>

        {/* Jumper info card */}
        <div className="rounded-lg border border-[#D8D4C8] bg-[#F5F3EE] p-5 mb-6">
          <p className="font-mono text-[10px] text-[#7F8B9D] tracking-widest mb-2">JUMPER</p>
          <p className="text-xl font-semibold tracking-tight">{jumperName}</p>
          {licence && (
            <p className="font-mono text-sm text-[#3D4E6A] mt-1">{licence}</p>
          )}
          <div className="mt-4 flex gap-6">
            <div>
              <p className="font-mono text-[10px] text-[#7F8B9D] tracking-wider">JUMPS INCLUDED</p>
              <p className="font-mono text-2xl font-medium mt-0.5">{(jumps ?? []).length}</p>
            </div>
            <div>
              <p className="font-mono text-[10px] text-[#7F8B9D] tracking-wider">LAYOUT</p>
              <p className="font-mono text-sm font-medium mt-0.5 uppercase">{record.layout}</p>
            </div>
            <div>
              <p className="font-mono text-[10px] text-[#7F8B9D] tracking-wider">EXPORTED</p>
              <p className="font-mono text-sm font-medium mt-0.5">{exportedAt}</p>
            </div>
          </div>
        </div>

        {/* Jump list */}
        <p className="font-mono text-[10px] text-[#7F8B9D] tracking-widest mb-3">ENTRIES</p>
        <div className="divide-y divide-[#D8D4C8] rounded-lg border border-[#D8D4C8] overflow-hidden">
          {(jumps ?? []).map((j) => {
            const dz  = j.dropzones  as unknown as { name: string } | null
            const sig = (j.signatures as unknown as Array<{ signer_name: string; signer_licence_number: string; outcome: string | null }>)?.[0]
            const isStudent = j.jumper_type === 'student'

            return (
              <div key={j.id} className="flex items-center justify-between px-4 py-3 bg-white">
                <div className="flex items-center gap-4">
                  <span className="font-mono text-xl font-semibold w-10 text-right">{j.jump_number}</span>
                  <div>
                    <p className="text-sm font-medium">
                      {j.jump_type ?? '—'}
                      {isStudent && (
                        <span className="ml-2 font-mono text-[10px] bg-[#FFF4D6] text-[#7A4C00] px-1.5 py-0.5 rounded">
                          STUDENT
                        </span>
                      )}
                    </p>
                    <p className="font-mono text-xs text-[#7F8B9D]">
                      {fmtDate(j.date as string)} · {dz?.name ?? '—'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  {sig ? (
                    <>
                      <p className="text-xs font-medium text-[#3D4E6A]">{sig.signer_name}</p>
                      <p className="font-mono text-[10px] text-[#7F8B9D]">{sig.signer_licence_number}</p>
                      {isStudent && sig.outcome && (
                        <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${
                          sig.outcome === 'pass'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-orange-100 text-orange-700'
                        }`}>
                          {sig.outcome.toUpperCase()}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="font-mono text-[10px] text-[#B6BCC6]">UNSIGNED</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Verification code */}
        <div className="mt-8 pt-6 border-t border-[#D8D4C8]">
          <p className="font-mono text-[10px] text-[#7F8B9D] tracking-widest mb-1">VERIFICATION CODE</p>
          <p className="font-mono text-sm text-[#3D4E6A]">{token}</p>
          <p className="text-xs text-[#B6BCC6] mt-2">
            This record was generated by Jump Logs and cannot be altered. For any queries, contact support@jumplogs.com.
          </p>
        </div>
      </div>
    </main>
  )
}
