'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronRight, ToggleLeft, ToggleRight } from 'lucide-react'
import { AdminCard, Badge, Divider } from '@/components/admin/ui'

// ─── Types ────────────────────────────────────────────────────────────────────

type SubData = {
  id: string
  status: string
  plan: string | null
  price_at_signup: number | string
  source: string | null
  started_at: string
  renews_at: string | null
  payment_method_brand: string | null
  payment_method_last4: string | null
  stripe_subscription_id: string | null
  refunded_at: string | null
  refunded_amount: number | string | null
}

type NoteItem = {
  id: string
  reason: string
  created_at: string
}

type ActionKey = 'reset-password' | 'force-signout' | 'revoke-subscription' | 'refund' | 'lock' | 'delete' | 'set-password' | 'reset-subscription'

export type UserActionsProps = {
  userId: string
  userEmail: string
  sub: SubData | null
  inTrial: boolean
  trialDaysLeft: number
  trialEndDateIso: string
  userCreatedAt: string
  notes: NoteItem[]
  customTrialEndsAt: string | null
  voiceLogEnabled: boolean | null
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
  userId, userEmail, sub, inTrial, trialDaysLeft, trialEndDateIso, userCreatedAt, notes: initNotes, customTrialEndsAt, voiceLogEnabled: initVoiceLog,
}: UserActionsProps) {
  const router = useRouter()

  // Action state machine
  const [loading, setLoading]   = useState<ActionKey | null>(null)
  const [done, setDone]         = useState<Set<ActionKey>>(new Set())
  const [errors, setErrors]     = useState<Partial<Record<ActionKey, string>>>({})
  const [confirm, setConfirm]   = useState<ActionKey | null>(null)
  const [deleteEmail, setDeleteEmail] = useState('')
  const [stripeWarning, setStripeWarning] = useState<string | null>(null)

  // Extend trial state
  const [extendDays, setExtendDays]       = useState(7)
  const [extendingTrial, setExtendingTrial] = useState(false)
  const [extendTrialError, setExtendTrialError] = useState<string | null>(null)
  const [extendedTrialEnd, setExtendedTrialEnd] = useState<string | null>(null)
  const [showExtendTrial, setShowExtendTrial] = useState(false)

  // Set password state
  const [showSetPassword, setShowSetPassword] = useState(false)
  const [newPassword, setNewPassword]         = useState('')
  const [settingPassword, setSettingPassword] = useState(false)
  const [setPasswordError, setSetPasswordError] = useState<string | null>(null)
  const [setPasswordDone, setSetPasswordDone]   = useState(false)

  // Admin notes state
  const [notes, setNotes]       = useState<NoteItem[]>(initNotes)
  const [addingNote, setAddingNote] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [noteError, setNoteError]   = useState<string | null>(null)

  // Voice log override state (null = inherit global)
  const [voiceLog, setVoiceLog]           = useState<boolean | null>(initVoiceLog)
  const [savingVoiceLog, setSavingVoiceLog] = useState(false)
  const [voiceLogError, setVoiceLogError]   = useState<string | null>(null)

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
      if (action === 'refund' && data.stripe_error) {
        setStripeWarning(`DB marked refunded, but Stripe failed: ${data.stripe_error}. Process manually in Stripe Dashboard.`)
      }
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

  // ── Set password ────────────────────────────────────────────────────────────

  async function handleSetPassword() {
    if (!newPassword || newPassword.length < 8) {
      setSetPasswordError('Password must be at least 8 characters')
      return
    }
    setSettingPassword(true)
    setSetPasswordError(null)
    try {
      const res = await fetch(`/api/admin/users/${userId}/set-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Failed to set password')
      setSetPasswordDone(true)
      setNewPassword('')
      setShowSetPassword(false)
    } catch (e) {
      setSetPasswordError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setSettingPassword(false)
    }
  }

  // ── Voice log override ──────────────────────────────────────────────────────

  async function handleVoiceLogChange(next: boolean | null) {
    setSavingVoiceLog(true)
    setVoiceLogError(null)
    try {
      const res = await fetch(`/api/admin/users/${userId}/voice-log`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voice_log_enabled: next }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Failed to update')
      setVoiceLog(next)
    } catch (e) {
      setVoiceLogError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setSavingVoiceLog(false)
    }
  }

  // ── Add note ────────────────────────────────────────────────────────────────

  async function handleAddNote() {
    if (!noteText.trim()) return
    setSavingNote(true)
    setNoteError(null)
    try {
      const res = await fetch('/api/admin/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, note: noteText.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Failed to save note')
      const note = data as NoteItem
      if (!note?.id) throw new Error('Insert failed')

      setNotes(prev => [note as NoteItem, ...prev])
      setNoteText('')
      setAddingNote(false)
    } catch (e) {
      setNoteError(e instanceof Error ? e.message : 'Failed to save note')
    } finally {
      setSavingNote(false)
    }
  }

  // ── Extend trial ────────────────────────────────────────────────────────────

  async function handleExtendTrial() {
    if (extendDays < 1) return
    setExtendingTrial(true)
    setExtendTrialError(null)
    try {
      const res = await fetch(`/api/admin/users/${userId}/extend-trial`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days: extendDays }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      setExtendedTrialEnd(data.trial_ends_at as string)
      setShowExtendTrial(false)
    } catch (e) {
      setExtendTrialError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setExtendingTrial(false)
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
              <span className="font-mono text-lg font-semibold">{sub.price_at_signup ? `$${sub.price_at_signup}/yr` : sub.source === 'apple' ? 'Apple IAP' : '—'}</span>
            </div>
            <div className="font-mono text-[10px] text-fg-3 mb-3">BILLED ANNUALLY · {sub.source === 'apple' ? 'APPLE' : 'STRIPE'}</div>
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

            {/* Extend / Revoke / Refund */}
            <div className="mt-3">
              {/* Already refunded */}
              {(sub.refunded_at || done.has('refund')) && (
                <div className="space-y-1">
                  <div className="py-1.5 text-center text-xs text-fg-3 font-mono">
                    ✓ Refunded{sub.refunded_amount ? ` · $${Number(sub.refunded_amount).toFixed(2)}` : ''} · {sub.refunded_at ? fmtDateShort(sub.refunded_at) : 'just now'}
                  </div>
                  {stripeWarning && (
                    <div className="px-2 py-1.5 bg-danger/10 border border-danger/30 rounded-sm text-xs text-danger">
                      ⚠ {stripeWarning}
                    </div>
                  )}
                </div>
              )}

              {/* Active sub: Extend + Revoke */}
              {!sub.refunded_at && !done.has('refund') && sub.status !== 'cancelled' && sub.status !== 'refunded' && (
                done.has('revoke-subscription') ? (
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
                )
              )}

              {/* Cancelled sub (not yet refunded): show Refund button */}
              {!sub.refunded_at && !done.has('refund') && sub.status === 'cancelled' && (
                confirm === 'refund' ? (
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => callAction('refund')}
                      disabled={loading === 'refund'}
                      className="flex-1 py-1.5 bg-warn/10 border border-warn/40 rounded-sm text-xs text-warn font-medium hover:bg-warn/20 transition-colors disabled:opacity-50"
                    >
                      {loading === 'refund' ? 'Processing…' : `Confirm refund \$${sub.price_at_signup}`}
                    </button>
                    <button
                      onClick={() => setConfirm(null)}
                      className="px-3 py-1.5 bg-surface-2 border border-border rounded-sm text-xs text-fg-3 hover:text-fg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirm('refund')}
                    className="w-full py-1.5 bg-surface-2 border border-border rounded-sm text-xs text-warn hover:bg-warn/10 transition-colors"
                  >
                    Issue refund…
                  </button>
                )
              )}

              {errors['revoke-subscription'] && (
                <div className="mt-1 font-mono text-[10px] text-danger">{errors['revoke-subscription']}</div>
              )}
              {errors['refund'] && (
                <div className="mt-1 font-mono text-[10px] text-danger">{errors['refund']}</div>
              )}

              {/* Reset for Apple Review */}
              <div className="mt-3 pt-3 border-t border-border">
                {done.has('reset-subscription') ? (
                  <div className="text-center text-xs text-ok font-mono">✓ Subscription wiped — user will see paywall</div>
                ) : confirm === 'reset-subscription' ? (
                  <div className="flex gap-2">
                    <button onClick={() => callAction('reset-subscription')} disabled={loading === 'reset-subscription'}
                      className="flex-1 py-1.5 bg-danger text-white rounded-sm text-xs font-medium disabled:opacity-40">
                      {loading === 'reset-subscription' ? 'Resetting…' : 'Yes, wipe subscription'}
                    </button>
                    <button onClick={() => setConfirm(null)} className="px-3 py-1.5 border border-border rounded-sm text-xs text-fg-2">Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => setConfirm('reset-subscription')}
                    className="w-full py-1.5 border border-border rounded-sm text-xs text-fg-3 hover:text-danger hover:border-danger/40 transition-colors">
                    Reset for Apple Review
                  </button>
                )}
                {errors['reset-subscription'] && (
                  <div className="mt-1 font-mono text-[10px] text-danger">{errors['reset-subscription']}</div>
                )}
              </div>
            </div>
          </>
        ) : inTrial ? (
          <>
            <div className="flex justify-between items-center mb-1">
              <Badge kind="sky">FREE TRIAL</Badge>
              <span className="font-mono text-lg font-semibold">{trialDaysLeft}d left</span>
            </div>
            <div className="font-mono text-[10px] text-fg-3 mb-3">
              {customTrialEndsAt ? 'EXTENDED TRIAL' : '14-DAY TRIAL'} · NO CARD ON FILE
            </div>
            <Divider />
            {([
              ['Trial started', fmtDateShort(userCreatedAt)],
              ['Trial ends',    fmtDateShort(extendedTrialEnd ?? trialEndDateIso)],
            ] as [string, string][]).map(([k, v]) => (
              <div key={k} className="flex justify-between py-1.5 text-xs">
                <span className="text-fg-2">{k}</span>
                <span className="font-mono text-fg">{v}</span>
              </div>
            ))}
            {/* Extend trial */}
            {extendTrialError && (
              <div className="font-mono text-[10px] text-danger mt-1">{extendTrialError}</div>
            )}
            {showExtendTrial ? (
              <div className="mt-3 flex items-center gap-2">
                <input
                  type="number" min={1} max={365} value={extendDays}
                  onChange={e => setExtendDays(Number(e.target.value))}
                  className="w-16 px-2 py-1 bg-surface border border-border rounded-sm font-mono text-xs text-fg outline-none focus:border-sky/60 text-center"
                />
                <span className="text-xs text-fg-3">days</span>
                <button
                  onClick={handleExtendTrial}
                  disabled={extendingTrial}
                  className="flex-1 py-1 bg-sky/10 border border-sky/40 rounded-sm text-xs text-sky font-medium disabled:opacity-50 hover:bg-sky/20 transition-colors"
                >
                  {extendingTrial ? 'Extending…' : 'Extend'}
                </button>
                <button onClick={() => setShowExtendTrial(false)} className="px-2 py-1 bg-surface-2 border border-border rounded-sm text-xs text-fg-3 hover:text-fg transition-colors">✕</button>
              </div>
            ) : (
              <button
                onClick={() => setShowExtendTrial(true)}
                className="mt-3 w-full py-1.5 bg-surface-2 border border-border rounded-sm text-xs text-fg-2 hover:text-fg transition-colors"
              >
                Extend trial…
              </button>
            )}
          </>
        ) : (
          <>
            <Badge kind="warn">TRIAL EXPIRED</Badge>
            <div className="font-mono text-[10px] text-fg-3 mt-1.5 mb-3">14-DAY TRIAL ENDED · NO SUBSCRIPTION</div>
            <Divider />
            {([
              ['Trial started', fmtDateShort(userCreatedAt)],
              ['Trial ended',   fmtDateShort(extendedTrialEnd ?? trialEndDateIso)],
            ] as [string, string][]).map(([k, v]) => (
              <div key={k} className="flex justify-between py-1.5 text-xs">
                <span className="text-fg-2">{k}</span>
                <span className="font-mono text-fg">{v}</span>
              </div>
            ))}
            {/* Re-open trial */}
            {extendTrialError && (
              <div className="font-mono text-[10px] text-danger mt-1">{extendTrialError}</div>
            )}
            {extendedTrialEnd ? (
              <div className="mt-3 text-xs text-ok font-mono">✓ Trial extended to {fmtDateShort(extendedTrialEnd)}</div>
            ) : showExtendTrial ? (
              <div className="mt-3 flex items-center gap-2">
                <input
                  type="number" min={1} max={365} value={extendDays}
                  onChange={e => setExtendDays(Number(e.target.value))}
                  className="w-16 px-2 py-1 bg-surface border border-border rounded-sm font-mono text-xs text-fg outline-none focus:border-sky/60 text-center"
                />
                <span className="text-xs text-fg-3">days</span>
                <button
                  onClick={handleExtendTrial}
                  disabled={extendingTrial}
                  className="flex-1 py-1 bg-sky/10 border border-sky/40 rounded-sm text-xs text-sky font-medium disabled:opacity-50 hover:bg-sky/20 transition-colors"
                >
                  {extendingTrial ? 'Extending…' : 'Extend'}
                </button>
                <button onClick={() => setShowExtendTrial(false)} className="px-2 py-1 bg-surface-2 border border-border rounded-sm text-xs text-fg-3 hover:text-fg transition-colors">✕</button>
              </div>
            ) : (
              <button
                onClick={() => setShowExtendTrial(true)}
                className="mt-3 w-full py-1.5 bg-surface-2 border border-border rounded-sm text-xs text-fg-2 hover:text-fg transition-colors"
              >
                Extend / reopen trial…
              </button>
            )}
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

        {/* Set password */}
        {setPasswordDone ? (
          <div className="flex items-center py-2.5 border-b border-dashed border-border">
            <span className="text-sm text-ok">✓ Password updated</span>
          </div>
        ) : showSetPassword ? (
          <div className="py-2.5 border-b border-dashed border-border">
            <div className="text-xs text-fg-2 mb-2">New password for <span className="font-mono text-fg">{userEmail}</span>:</div>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Min. 8 characters"
              className="w-full px-2.5 py-1.5 bg-surface border border-border rounded-sm font-mono text-xs text-fg placeholder:text-fg-4 mb-2 outline-none focus:border-sky/60"
            />
            {setPasswordError && (
              <div className="font-mono text-[10px] text-danger mb-2">{setPasswordError}</div>
            )}
            <div className="flex gap-1.5">
              <button
                onClick={handleSetPassword}
                disabled={settingPassword || newPassword.length < 8}
                className="flex-1 py-1.5 bg-sky/10 border border-sky/40 rounded-sm text-xs text-sky font-medium disabled:opacity-40 hover:bg-sky/20 transition-colors"
              >
                {settingPassword ? 'Setting…' : 'Set password'}
              </button>
              <button
                onClick={() => { setShowSetPassword(false); setNewPassword(''); setSetPasswordError(null) }}
                className="px-3 py-1.5 bg-surface-2 border border-border rounded-sm text-xs text-fg-3 hover:text-fg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowSetPassword(true)}
            className="w-full flex items-center justify-between py-2.5 border-b border-dashed border-border text-left text-sm text-fg-2 hover:text-fg transition-colors"
          >
            Set password…
            <ChevronRight size={11} className="text-fg-4 shrink-0" />
          </button>
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

      {/* ── VOICE LOG ─────────────────────────────────────── */}
      <AdminCard title="VOICE LOG">
        <div className="text-xs text-fg-3 mb-3">
          Override the global voice-log setting for this user.
        </div>
        <div className="flex flex-col gap-1.5">
          {([true, false, null] as (boolean | null)[]).map((val, i) => {
            const label = val === null ? 'Inherit global' : val ? 'Enabled' : 'Disabled'
            const desc  = val === null ? 'Follows the app-wide toggle' : val ? 'Mic button always shown' : 'Mic button always hidden'
            const isSelected = voiceLog === val
            return (
              <button
                key={i}
                onClick={() => !isSelected && handleVoiceLogChange(val)}
                disabled={savingVoiceLog}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-left transition-colors ${
                  isSelected
                    ? val === false
                      ? 'bg-warn/10 border-warn/40 text-warn'
                      : val === true
                        ? 'bg-ok/10 border-ok/40 text-ok'
                        : 'bg-sky/10 border-sky/40 text-sky'
                    : 'bg-surface border-border text-fg-3 hover:text-fg hover:border-border'
                } disabled:opacity-50`}
              >
                {isSelected
                  ? <ToggleRight size={16} className="shrink-0" />
                  : <ToggleLeft  size={16} className="shrink-0" />
                }
                <div>
                  <div className="text-xs font-semibold">{label}</div>
                  <div className="font-mono text-[10px] opacity-70 mt-0.5">{desc}</div>
                </div>
              </button>
            )
          })}
        </div>
        {voiceLogError && <div className="font-mono text-[10px] text-danger mt-2">{voiceLogError}</div>}
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
