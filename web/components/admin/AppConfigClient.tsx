'use client'

import { useState, useRef } from 'react'
import { AlertTriangle, CheckCircle2, Smartphone, ToggleLeft, ToggleRight } from 'lucide-react'

type AppConfig = {
  force_upgrade_enabled: boolean
  minimum_version: string
  upgrade_title: string
  upgrade_message: string
  ios_store_url: string | null
  android_store_url: string | null
  updated_at: string
  updated_by_email: string | null
  voice_log_enabled: boolean
}

export default function AppConfigClient({ initial }: { initial: AppConfig }) {
  const [cfg, setCfg] = useState<AppConfig>(initial)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3000)
  }

  const update = (patch: Partial<AppConfig>) => {
    setCfg(p => ({ ...p, ...patch }))
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const res = await fetch('/api/admin/app-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cfg),
      })
      if (!res.ok) {
        const j = await res.json()
        setError(j.error ?? 'Save failed')
        return
      }
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  const handleVoiceLogToggle = async () => {
    const next = !cfg.voice_log_enabled
    setCfg(p => ({ ...p, voice_log_enabled: next }))
    try {
      const res = await fetch('/api/admin/app-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...cfg, voice_log_enabled: next }),
      })
      if (!res.ok) {
        const j = await res.json()
        setCfg(p => ({ ...p, voice_log_enabled: !next })) // revert
        showToast('Failed to save: ' + (j.error ?? 'unknown error'))
      } else {
        showToast(next ? 'Voice log enabled — mic button is now visible.' : 'Voice log disabled — mic button is now hidden.')
      }
    } catch {
      setCfg(p => ({ ...p, voice_log_enabled: !next })) // revert
      showToast('Failed to save.')
    }
  }

  const isActive = cfg.force_upgrade_enabled

  return (
    <div className="space-y-6">

      {/* Status banner */}
      <div className={`flex items-start gap-3 p-4 rounded-xl border ${
        isActive
          ? 'bg-danger/5 border-danger/30'
          : 'bg-surface border-border'
      }`}>
        <div className={`mt-0.5 shrink-0 ${isActive ? 'text-danger' : 'text-fg-3'}`}>
          {isActive ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-semibold ${isActive ? 'text-danger' : 'text-fg'}`}>
            {isActive ? 'Force upgrade is ACTIVE' : 'Force upgrade is inactive'}
          </div>
          <div className="text-xs text-fg-3 mt-0.5">
            {isActive
              ? `All users running below build ${cfg.minimum_version} are blocked immediately.`
              : 'Users can run any app version. Enable to block older versions.'
            }
          </div>
        </div>
        {/* Master toggle */}
        <button
          onClick={() => update({ force_upgrade_enabled: !cfg.force_upgrade_enabled })}
          className="shrink-0 mt-0.5"
        >
          {isActive
            ? <ToggleRight size={28} className="text-danger" />
            : <ToggleLeft size={28} className="text-fg-3" />
          }
        </button>
      </div>

      {/* Voice Log toggle */}
      <div className={`flex items-start gap-3 p-4 rounded-xl border ${
        cfg.voice_log_enabled
          ? 'bg-surface border-border'
          : 'bg-warn/5 border-warn/30'
      }`}>
        <div className={`mt-0.5 shrink-0 ${cfg.voice_log_enabled ? 'text-ok' : 'text-warn'}`}>
          {cfg.voice_log_enabled ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-semibold ${cfg.voice_log_enabled ? 'text-fg' : 'text-warn'}`}>
            {cfg.voice_log_enabled ? 'Voice log is enabled' : 'Voice log is DISABLED'}
          </div>
          <div className="text-xs text-fg-3 mt-0.5">
            {cfg.voice_log_enabled
              ? 'The microphone button is visible to all users. Individual users can be overridden on their profile page.'
              : 'The microphone button is hidden for all users globally. Per-user overrides still apply.'
            }
          </div>
        </div>
        <button
          onClick={handleVoiceLogToggle}
          className="shrink-0 mt-0.5"
        >
          {cfg.voice_log_enabled
            ? <ToggleRight size={28} className="text-ok" />
            : <ToggleLeft size={28} className="text-fg-3" />
          }
        </button>
      </div>

      {/* Config fields */}
      <div className="grid grid-cols-1 gap-5">

        {/* Minimum version */}
        <div>
          <label className="block font-mono text-[10px] text-fg-3 tracking-widest uppercase mb-1.5">
            Minimum Required Version
          </label>
          <input
            type="text"
            value={cfg.minimum_version}
            onChange={e => update({ minimum_version: e.target.value })}
            placeholder="1.0.0.4"
            className="w-full h-10 px-3 rounded-lg bg-surface border border-border text-fg font-mono text-sm focus:outline-none focus:border-sky placeholder:text-fg-4"
          />
          <p className="text-xs text-fg-3 mt-1">
            Format: <code className="font-mono text-xs text-fg-2">major.minor.patch.build</code> — e.g. <code className="font-mono text-xs text-fg-2">1.0.0.4</code> blocks anyone on build&nbsp;3 or below of v1.0.0.
            The build number is <code className="font-mono text-xs text-fg-2">ios.buildNumber</code> / <code className="font-mono text-xs text-fg-2">android.versionCode</code> in app.json.
          </p>
        </div>

        {/* Title */}
        <div>
          <label className="block font-mono text-[10px] text-fg-3 tracking-widest uppercase mb-1.5">
            Screen Title
          </label>
          <input
            type="text"
            value={cfg.upgrade_title}
            onChange={e => update({ upgrade_title: e.target.value })}
            placeholder="Update Required"
            className="w-full h-10 px-3 rounded-lg bg-surface border border-border text-fg text-sm focus:outline-none focus:border-sky placeholder:text-fg-4"
          />
        </div>

        {/* Message */}
        <div>
          <label className="block font-mono text-[10px] text-fg-3 tracking-widest uppercase mb-1.5">
            Message
          </label>
          <textarea
            value={cfg.upgrade_message}
            onChange={e => update({ upgrade_message: e.target.value })}
            rows={3}
            placeholder="A new version of Jump Logs is available. Please update to continue."
            className="w-full px-3 py-2.5 rounded-lg bg-surface border border-border text-fg text-sm focus:outline-none focus:border-sky placeholder:text-fg-4 resize-none"
          />
        </div>

        {/* Store URLs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block font-mono text-[10px] text-fg-3 tracking-widest uppercase mb-1.5">
              iOS App Store URL
            </label>
            <input
              type="url"
              value={cfg.ios_store_url ?? ''}
              onChange={e => update({ ios_store_url: e.target.value || null })}
              placeholder="https://apps.apple.com/app/..."
              className="w-full h-10 px-3 rounded-lg bg-surface border border-border text-fg text-sm focus:outline-none focus:border-sky placeholder:text-fg-4"
            />
          </div>
          <div>
            <label className="block font-mono text-[10px] text-fg-3 tracking-widest uppercase mb-1.5">
              Android Play Store URL
            </label>
            <input
              type="url"
              value={cfg.android_store_url ?? ''}
              onChange={e => update({ android_store_url: e.target.value || null })}
              placeholder="https://play.google.com/store/apps/..."
              className="w-full h-10 px-3 rounded-lg bg-surface border border-border text-fg text-sm focus:outline-none focus:border-sky placeholder:text-fg-4"
            />
          </div>
        </div>
      </div>

      {/* Save row */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 h-9 rounded-lg bg-sky text-white font-semibold text-sm disabled:opacity-50 hover:bg-sky/90 transition-colors"
        >
          {saving ? 'Saving…' : 'Save & deploy'}
        </button>
        {saved && (
          <span className="flex items-center gap-1.5 text-ok text-sm font-medium">
            <CheckCircle2 size={14} />
            Deployed — all open apps updated instantly
          </span>
        )}
        {error && <span className="text-danger text-sm">{error}</span>}
      </div>

      {/* Footer note */}
      {cfg.updated_by_email && (
        <p className="font-mono text-[10px] text-fg-4">
          Last saved by {cfg.updated_by_email} · {new Date(cfg.updated_at).toLocaleString()}
        </p>
      )}

      {/* Live preview card */}
      <div className="mt-4">
        <div className="font-mono text-[10px] text-fg-4 tracking-widest uppercase mb-3">
          Mobile preview
        </div>
        <div className="max-w-xs rounded-2xl border border-border bg-[#0A1220] p-8 flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-sky/10 border border-sky/25 flex items-center justify-center">
            <Smartphone size={28} className="text-sky" />
          </div>
          <div className="text-white font-bold text-xl">{cfg.upgrade_title || 'Update Required'}</div>
          <div className="text-[#8B9BB5] text-sm leading-relaxed">
            {cfg.upgrade_message || 'A new version of Jump Logs is available. Please update to continue.'}
          </div>
          <div className="w-full rounded-xl bg-sky py-3 text-white font-semibold text-sm">
            Update on App Store
          </div>
          <div className="font-mono text-[10px] text-[#3D4E6A]">Current version: 1.0.0</div>
        </div>
      </div>

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface border border-border shadow-lg text-sm text-fg animate-fade-in">
          <CheckCircle2 size={14} className="text-ok shrink-0" />
          {toast}
        </div>
      )}

    </div>
  )
}
