'use client'

import { useState, useRef, useEffect } from 'react'
import { Mail, Eye, MoreHorizontal, Copy, Check, X } from 'lucide-react'

type Props = {
  userId: string
  userEmail: string
  userName: string
}

export default function UserHeroActions({ userId, userEmail, userName }: Props) {
  const [impersonateState, setImpersonateState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [impersonateUrl, setImpersonateUrl] = useState<string | null>(null)
  const [impersonateError, setImpersonateError] = useState<string | null>(null)
  const [urlCopied, setUrlCopied] = useState(false)

  const [moreOpen, setMoreOpen] = useState(false)
  const [idCopied, setIdCopied] = useState(false)
  const moreRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    if (!moreOpen) return
    function handler(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [moreOpen])

  async function handleImpersonate() {
    setImpersonateState('loading')
    setImpersonateError(null)
    try {
      const res = await fetch(`/api/admin/users/${userId}/impersonate`, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      console.log('[impersonate] API response:', { status: res.status, data })
      if (!res.ok) throw new Error(data.error ?? 'Failed to generate link')
      const url = data.url as string
      console.log('[impersonate] action_link:', url)
      // Log whether the URL uses hash (implicit) or query (?code=) flow
      if (url.includes('#access_token')) {
        console.warn('[impersonate] ⚠ Supabase returned implicit-flow URL (hash). This means the redirectTo is not in the Supabase allowed redirect URLs list.')
      } else if (url.includes('?code=') || url.includes('&code=')) {
        console.log('[impersonate] ✓ PKCE flow URL (code in query string) — will go through /api/auth/callback')
      }
      setImpersonateUrl(url)
      setImpersonateState('done')
    } catch (e) {
      setImpersonateError(e instanceof Error ? e.message : 'Failed')
      setImpersonateState('error')
    }
  }

  function handleCopyUrl() {
    if (!impersonateUrl) return
    navigator.clipboard.writeText(impersonateUrl)
    setUrlCopied(true)
    setTimeout(() => setUrlCopied(false), 2000)
  }

  function handleCopyId() {
    navigator.clipboard.writeText(userId)
    setIdCopied(true)
    setTimeout(() => { setIdCopied(false); setMoreOpen(false) }, 1500)
  }

  return (
    <>
      {/* ── Hero buttons ───────────────────────────────────── */}
      <div className="flex gap-2">
        {/* Email user */}
        <a
          href={`mailto:${userEmail}?subject=Hi ${encodeURIComponent(userName || 'there')}`}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-border rounded-sm text-xs text-fg-2 font-medium hover:text-fg transition-colors"
        >
          <Mail size={12} /> Email user
        </a>

        {/* View as user */}
        {impersonateState === 'idle' || impersonateState === 'error' ? (
          <button
            onClick={handleImpersonate}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-border rounded-sm text-xs text-fg-2 font-medium hover:text-fg transition-colors"
          >
            <Eye size={12} /> View as user
          </button>
        ) : impersonateState === 'loading' ? (
          <button disabled className="flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-border rounded-sm text-xs text-fg-3 font-medium opacity-50">
            <Eye size={12} /> Generating…
          </button>
        ) : null}

        {/* More dropdown */}
        <div className="relative" ref={moreRef}>
          <button
            onClick={() => setMoreOpen(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-border rounded-sm text-xs text-fg-2 font-medium hover:text-fg transition-colors"
          >
            <MoreHorizontal size={12} /> More
          </button>
          {moreOpen && (
            <div className="absolute right-0 top-full mt-1 w-44 bg-surface border border-border rounded-sm shadow-lg z-50 py-1">
              <button
                onClick={handleCopyId}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-fg-2 hover:bg-surface-2 hover:text-fg transition-colors text-left"
              >
                {idCopied ? <Check size={11} className="text-ok" /> : <Copy size={11} />}
                {idCopied ? 'Copied!' : 'Copy user ID'}
              </button>
              <a
                href={`https://supabase.com/dashboard/project/_/auth/users?search=${userEmail}`}
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-fg-2 hover:bg-surface-2 hover:text-fg transition-colors"
                onClick={() => setMoreOpen(false)}
              >
                View in Supabase ↗
              </a>
            </div>
          )}
        </div>
      </div>

      {/* ── Impersonate error ──────────────────────────────── */}
      {impersonateState === 'error' && impersonateError && (
        <div className="mt-2 text-xs text-danger font-mono">{impersonateError}</div>
      )}

      {/* ── Impersonate link modal ─────────────────────────── */}
      {impersonateState === 'done' && impersonateUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface border border-border rounded-md shadow-xl w-full max-w-md mx-4 p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="text-sm font-semibold text-fg">Impersonate user</div>
                <div className="font-mono text-[10px] text-fg-3 mt-0.5 tracking-wide">ONE-TIME USE · EXPIRES SOON</div>
              </div>
              <button
                onClick={() => { setImpersonateState('idle'); setImpersonateUrl(null) }}
                className="text-fg-3 hover:text-fg transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="bg-surface-2 border border-border rounded-sm p-3 mb-3">
              <p className="text-xs text-fg-2 leading-relaxed">
                Open this link in a <span className="text-fg font-medium">private / incognito window</span> to sign in as <span className="font-mono text-sky">{userEmail}</span>. This link is single-use and will sign in whoever clicks it.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleCopyUrl}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-sky/10 border border-sky/40 rounded-sm text-xs text-sky font-medium hover:bg-sky/20 transition-colors"
              >
                {urlCopied ? <Check size={12} /> : <Copy size={12} />}
                {urlCopied ? 'Copied!' : 'Copy link'}
              </button>
              <a
                href={impersonateUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-surface-2 border border-border rounded-sm text-xs text-fg-2 hover:text-fg transition-colors"
                onClick={() => { setImpersonateState('idle'); setImpersonateUrl(null) }}
              >
                <Eye size={12} /> Open in new tab
              </a>
            </div>
            <div className="mt-2 font-mono text-[10px] text-fg-4 text-center">
              ⚠ Opening in the same browser will replace your admin session
            </div>
          </div>
        </div>
      )}
    </>
  )
}
