'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { AdminCard, Badge, Divider } from '@/components/admin/ui'
import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────────────────────

type SubData = {
  id: string
  status: string
  plan: string | null
  price_at_signup: number | string
  started_at: string
  renews_at: string | null
  payment_method_brand: string | null
  payment_method_last4: string | null
  stripe_subscription_id: string | null
}

type NoteItem = {
  id: string
  reason: string
  created_at: string
}

type ActionKey = 'reset-password' | 'force-signout' | 'revoke-subscription' | 'lock' | 'delete'

export type UserActionsProps = {
  userId: string
  userEmail: string
  sub: SubData | null
  inTrial: boolean
  trialDaysLeft: number
  trialEndDateIso: string
  userCreatedAt: string
  notes: NoteItem[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDateShort(s: string | null) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })
}

function timeAgo(s: string): string {
  const m = Math.floor((Date.now() - new Date(s).getTime()) / 60000)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

const STATUS_BADGE: Record<string, 'ok' | 'sky' | 'warn' | 'muted' | 'danger'> = {
  active: 'ok', trial: 'sky', overdue: 'warn', cancelled: 'muted',
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function UserActionsClient({
  userId, userEmail, sub, inTrial, trialDaysLeft, trialEndDateIso, userCreatedAt, notes: initNotes,
}: UserActionsProps) {
  const router = useRouter()

  // Action state machine
  const [loading, setLoading]   = useState<ActionKey | null>(null)
  const [done, setDone]         = useState<Set<ActionKey>>(new Set())
  const [errors, setErrors]     = useState<Partial<Record<ActionKey, string>>>({})
  const [confirm, setConfirm]   = useState<ActionKey | null>(null)
  const [deleteEmail, setDeleteEmail] = useState('')

  // Admin notes state
  const [notes, setNotes]       = useState<NoteItem[]>(initNotes)
  const [addingNote, setAddingNote] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [noteError, setNoteError]   = useState<string | null>(null)

  // ── API helper ──────────────────────────────────────────────────────────────

  async function callAction(action: ActionKey, body?: object) {
    setLoading(action)
    setErrors(prev => { const n = { ...prev }; delete n[action]; return n })
    try {
      const res = await fetch(`/api/admin/users/${userId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong')
      setDone(prev => new Set(Array.from(prev).concat(action)))
      if (action === 'delete') {
        router.push('/admin/users')
        router.refresh()
      }
    } catch (e) {
      setErrors(prev => ({ ...prev, [action]: e instanceof Error ? e.message : 'Failed' }))
    } finally {
      setLoading(null)
      setConfirm(null)
    }
  }

  // ── Add note ────────────────────────────────────────────────────────────────

  async function handleAddNote() {
    if (!noteText.trim()) return
    setSavingNote(true)
    setNoteError(null)
    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: adminRow, error: adminErr } = await sb
        .from('admins')
        .select('id')
        .eq('email', user.email!)
        .single()
      if (adminErr || !adminRow) throw new Error('Admin record not found')

      const { data: note, error: insertErr } = await sb
        .from('audit_log')
        .insert({
          admin_id: adminRow.id,
          action: 'admin_note',
          target: `user:${userId}`,
          reason: noteText.trim(),
        })
        .select('id, reason, created_at')
        .single()
      if (insertErr || !note) throw insertErr ?? new Error('Insert failed')

      setNotes(prev => [note as NoteItem, ...prev])
      setNoteText('')
      setAddingNote(false)
    } catch (e) {
      setNoteError(e instanceof Error ? e.message : 'Failed to save note')
    } finally {
      setSavingNote(false)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-3.5">

      {/* ── SUBSCRIPTION ──────────────────────────────────── */}
      <AdminCard title="SUBSCRIPTION">
        {sub ? (
          <>
            <div className="flex justify-between items-center mb-1">
              <div className="flex gap-1.5">
                <Badge kind="sky">{sub.plan?.toUpperCase() ?? 'PRO'}</Badge>
                <Badge kind={STATUS_BADGE[sub.status] ?? 'muted'}>{sub.status.toUpperCase()}</Badge>
              </div>
              <span className="font-mono text-lg font-semibold">${sub.price_at_signup}/yr</span>
            </div>
            <div className="font-mono text-[10px] text-fg-3 mb-3">BILLED ANNUALLY · STRIPE</div>
            <Divider />
            {([
              ['Started',   fmtDateShort(sub.started_at)],
              ['Renews',    fmtDateShort(sub.renews_at)],
              ['Method',    sub.payment_method_brand
                ? `${sub.payment_method_brand} •••• ${sub.payment_method_last4}`
                : '—'],
              ['Stripe ID', sub.stripe_subscription_id ?? '—'],
            ] as [string, string][]).map(([k, v]) => (
              <div key={k} className="flex justify-between py-1.5 text-xs">
                <span className="text-fg-2">{k}</span>
                <span className="font-mono text-fg truncate ml-2 text-right max-w-[60%]">{v}</span>
              </div>
            ))}

            {/* Extend / Revoke */}
            <div className="mt-3">
              {done.has('revoke-subscription') ? (
                <div className="py-1.5 text-center text-xs text-ok font-mono">✓ Subscription revoked</div>
              ) : confirm === 'revoke-subscription' ? (
                <div className="flex gap-1.5">
                  <button
                    onClick={() => callAction('revoke-subscription')}
                    disabled={loading === 'revoke-subscription'}
                    className="flex-1 py-1.5 bg-danger/10 border border-danger/40 rounded-sm text-xs text-danger font-medium hover:bg-danger/20 transition-colors disabled:opacity-50"
                  >
                    {loading === 'revoke-subscription' ? 'Revoking…' : 'Confirm revoke'}
                  </button>
                  <button
                    onClick={() => setConfirm(null)}
                    className="px-3 py-1.5 bg-surface-2 border border-border rounded-sm text-xs text-fg-3 hover:text-fg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Link
                    href={`/admin/revenue/subscriptions/${sub.id}/override`}
                    className="flex-1 py-1.5 bg-surface-2 border border-border rounded-sm text-xs text-fg-2 hover:text-fg transition-colors text-center"
                  >
                    Extend
                  </Link>
                  <button
                    onClick={() => setConfirm('revoke-subscription')}
                    className="flex-1 py-1.5 bg-surface-2 border border-border rounded-sm text-xs text-danger hover:bg-danger/10 transition-colors"
                  >
                    Revoke
                  </button>
                </div>
              )}
              {errors['revoke-subscription'] && (
                <div className="mt-1 font-mono text-[10px] text-danger">{errors['revoke-subscription']}</div>
              )}
            </div>
          </>
        ) : inTrial ? (
          <>
            <div className="flex justify-between items-center mb-1">
              <Badge kind="sky">FREE TRIAL</Badge>
              <span className="font-mono text-lg font-semibold">{trialDaysLeft}d left</span>
            </div>
            <div className="font-mono text-[10px] text-fg-3 mb-3">14-DAY TRIAL · NO CARD ON FILE</div>
            <Divider />
            {([
              ['Trial started', fmtDateShort(userCreatedAt)],
              ['Trial ends',    fmtDateShort(trialEndDateIso)],
            ] as [string, string][]).map(([k, v]) => (
              <div key={k} className="flex justify-between py-1.5 text-xs">
                <span className="text-fg-2">{k}</span>
                <span className="font-mono text-fg">{v}</span>
              </div>
            ))}
          </>
        ) : (
          <>
            <Badge kind="warn">TRIAL EXPIRED</Badge>
            <div className="font-mono text-[10px] text-fg-3 mt-1.5 mb-3">14-DAY TRIAL ENDED · NO SUBSCRIPTION</div>
            <Divider />
            {([
              ['Trial started', fmtDateShort(userCreatedAt)],
              ['Trial ended',   fmtDateShort(trialEndDateIso)],
            ] as [string, string][]).map(([k, v]) => (
              <div key={k} className="flex justify-between py-1.5 text-xs">
                <span className="text-fg-2">{k}</span>
                <span className="font-mono text-fg">{v}</span>
              </div>
            ))}
          </>
        )}
      </AdminCard>

      {/* ── MANUAL ACTIONS ────────────────────────────────── */}
      <AdminCard title="MANUAL ACTIONS">

        {/* Send password reset */}
        {done.has('reset-password') ? (
          <div className="flex items-center py-2.5 border-b border-dashed border-border">
            <span className="text-sm text-ok">✓ Password reset email sent</span>
          </div>
        ) : (
          <>
            <button
              onClick={() => callAction('reset-password')}
              disabled={loading === 'reset-password'}
              className="w-full flex items-center justify-between py-2.5 border-b border-dashed border-border text-left text-sm text-fg-2 hover:text-fg transition-colors disabled:opacity-50"
            >
              {loading === 'reset-password' ? 'Sending…' : 'Send password reset'}
              <ChevronRight size={11} className="text-fg-4 shrink-0" />
            </button>
            {errors['reset-password'] && (
              <div className="font-mono text-[10px] text-danger pb-1.5">{errors['reset-password']}</div>
            )}
          </>
        )}

        {/* Force sign-out */}
        {done.has('force-signout') ? (
          <div className="flex items-center py-2.5 border-b border-dashed border-border">
            <span className="text-sm text-ok">✓ All sessions signed out</span>
          </div>
        ) : confirm === 'force-signout' ? (
          <div className="flex items-center gap-2 py-2.5 border-b border-dashed border-border">
            <span className="text-sm text-fg-2 flex-1">Sign out all sessions?</span>
            <button
              onClick={() => callAction('force-signout')}
              disabled={loading === 'force-signout'}
              className="px-2.5 py-1 bg-warn/10 border border-warn/40 rounded-sm text-xs text-warn font-medium disabled:opacity-50"
            >
              {loading === 'force-signout' ? '…' : 'Confirm'}
            </button>
            <button
              onClick={() => setConfirm(null)}
              className="px-2.5 py-1 bg-surface-2 border border-border rounded-sm text-xs text-fg-3 hover:text-fg transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <>
            <button
              onClick={() => setConfirm('force-signout')}
              className="w-full flex items-center justify-between py-2.5 border-b border-dashed border-border text-left text-sm text-fg-2 hover:text-fg transition-colors"
            >
              Force sign-out
              <ChevronRight size={11} className="text-fg-4 shrink-0" />
            </button>
            {errors['force-signout'] && (
              <div className="font-mono text-[10px] text-danger pb-1.5">{errors['force-signout']}</div>
            )}
          </>
        )}

        {/* Apply discount */}
        <Link
          href={`/admin/users/${userId}/discount`}
          className="w-full flex items-center justify-between py-2.5 border-b border-dashed border-border text-sm text-fg-2 hover:text-fg transition-colors"
        >
          Apply discount…
          <ChevronRight size={11} className="text-fg-4 shrink-0" />
        </Link>

        {/* Comp / extend subscription */}
        {sub ? (
          <Link
            href={`/admin/revenue/subscriptions/${sub.id}/override`}
            className="w-full flex items-center justify-between py-2.5 border-b border-dashed border-border text-sm text-fg-2 hover:text-fg transition-colors"
          >
            Comp / extend subscription
            <ChevronRight size={11} className="text-fg-4 shrink-0" />
          </Link>
        ) : (
          <div className="w-full flex items-center justify-between py-2.5 border-b border-dashed border-border text-sm text-fg-4 cursor-not-allowed">
            Comp / extend subscription
            <span className="font-mono text-[10px] text-fg-4">no subscription</span>
          </div>
        )}

        {/* Lock account */}
        {done.has('lock') ? (
          <div className="flex items-center py-2.5 border-b border-dashed border-border">
            <span className="text-sm text-warn">✓ Account locked</span>
          </div>
        ) : confirm === 'lock' ? (
          <div className="flex items-center gap-2 py-2.5 border-b border-dashed border-border">
            <span className="text-sm text-fg-2 flex-1">Lock this account?</span>
            <button
              onClick={() => callAction('lock')}
              disabled={loading === 'lock'}
              className="px-2.5 py-1 bg-warn/10 border border-warn/40 rounded-sm text-xs text-warn font-medium disabled:opacity-50"
            >
              {loading === 'lock' ? '…' : 'Lock'}
            </button>
            <button
              onClick={() => setConfirm(null)}
              className="px-2.5 py-1 bg-surface-2 border border-border rounded-sm text-xs text-fg-3 hover:text-fg transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <>
            <button
              onClick={() => setConfirm('lock')}
              className="w-full flex items-center justify-between py-2.5 border-b border-dashed border-border text-left text-sm text-fg-2 hover:text-fg transition-colors"
            >
              Lock account
              <ChevronRight size={11} className="text-fg-4 shrink-0" />
            </button>
            {errors['lock'] && (
              <div className="font-mono text-[10px] text-danger pb-1.5">{errors['lock']}</div>
            )}
          </>
        )}

        {/* Delete account */}
        {done.has('delete') ? (
          <div className="flex items-center py-2.5 text-sm text-ok">✓ Account deleted</div>
        ) : confirm === 'delete' ? (
          <div className="py-2.5">
            <div className="text-xs text-fg-2 mb-2">
              Type <span className="font-mono text-fg">{userEmail}</span> to confirm:
            </div>
            <input
              type="email"
              value={deleteEmail}
              onChange={e => setDeleteEmail(e.target.value)}
              placeholder={userEmail}
              className="w-full px-2.5 py-1.5 bg-surface border border-border rounded-sm font-mono text-xs text-fg placeholder:text-fg-4 mb-2 outline-none focus:border-danger/60"
            />
            <div className="flex gap-1.5">
              <button
                onClick={() => callAction('delete')}
                disabled={deleteEmail !== userEmail || loading === 'delete'}
                className="flex-1 py-1.5 bg-danger/10 border border-danger/40 rounded-sm text-xs text-danger font-medium disabled:opacity-40 hover:bg-danger/20 transition-colors"
              >
                {loading === 'delete' ? 'Deleting…' : 'Delete permanently'}
              </button>
              <button
                onClick={() => { setConfirm(null); setDeleteEmail('') }}
                className="px-3 py-1.5 bg-surface-2 border border-border rounded-sm text-xs text-fg-3 hover:text-fg transition-colors"
              >
                Cancel
              </button>
            </div>
            {errors['delete'] && (
              <div className="mt-1 font-mono text-[10px] text-danger">{errors['delete']}</div>
            )}
          </div>
        ) : (
          <button
            onClick={() => setConfirm('delete')}
            className="w-full flex items-center justify-between py-2.5 text-left text-sm text-danger hover:opacity-80 transition-opacity"
          >
            Delete account…
            <ChevronRight size={11} className="text-fg-4 shrink-0" />
          </button>
        )}
      </AdminCard>

      {/* ── ADMIN NOTES ───────────────────────────────────── */}
      <AdminCard
        title="ADMIN NOTES"
        action={
          !addingNote ? (
            <button
              onClick={() => setAddingNote(true)}
              className="font-mono text-[10px] text-sky hover:underline"
            >
              + Add
            </button>
          ) : undefined
        }
      >
        {addingNote && (
          <div className="mb-3 pb-3 border-b border-dashed border-border">
            <textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder="Enter note…"
              rows={3}
              className="w-full px-2.5 py-2 bg-surface border border-border rounded-sm text-xs text-fg placeholder:text-fg-4 outline-none focus:border-sky/60 resize-none font-mono"
            />
            {noteError && (
              <div className="font-mono text-[10px] text-danger mt-1">{noteError}</div>
            )}
            <div className="flex gap-1.5 mt-2">
              <button
                onClick={handleAddNote}
                disabled={savingNote || !noteText.trim()}
                className="px-3 py-1 bg-sky text-on-sky rounded-sm text-xs font-semibold disabled:opacity-50 hover:bg-sky/90 transition-colors"
              >
                {savingNote ? 'Saving…' : 'Save note'}
              </button>
              <button
                onClick={() => { setAddingNote(false); setNoteText(''); setNoteError(null) }}
                className="px-3 py-1 bg-surface-2 border border-border rounded-sm text-xs text-fg-3 hover:text-fg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {notes.length === 0 && !addingNote ? (
          <div className="text-xs text-fg-3 py-2 italic">No admin notes yet.</div>
        ) : (
          notes.map(note => (
            <div key={note.id} className="py-2.5 border-b border-dashed border-border last:border-0">
              <div className="text-xs text-fg leading-snug">{note.reason}</div>
              <div className="font-mono text-[10px] text-fg-4 mt-1">{timeAgo(note.created_at)}</div>
            </div>
          ))
        )}
      </AdminCard>

    </div>
  )
}
