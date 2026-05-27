'use client'

import { useState, useRef } from 'react'
import { Upload, CheckCircle, AlertCircle, Trash2, ExternalLink } from 'lucide-react'
import Image from 'next/image'
import { AdminPageHeader, AdminCard } from '@/components/admin/ui'

type MediaSlot = {
  slot: string
  label: string
  description: string
  url: string | null
  updated_at: string | null
}

function SlotCard({ slot, onUpdate }: { slot: MediaSlot; onUpdate: (slot: string, url: string | null) => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setSuccess(false)
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('slot', slot.slot)
      fd.append('file', file)
      const res = await fetch('/api/admin/media', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Upload failed')
      setSuccess(true)
      onUpdate(slot.slot, json.url)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleRemove() {
    if (!slot.url) return
    setError(null)
    setRemoving(true)
    try {
      const res = await fetch(`/api/admin/media?slot=${encodeURIComponent(slot.slot)}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Remove failed')
      onUpdate(slot.slot, null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Remove failed')
    } finally {
      setRemoving(false)
    }
  }

  return (
    <AdminCard title={slot.label}>
      <div className="space-y-3">
        <p className="text-xs text-fg-3">{slot.description}</p>

        {/* Preview */}
        <div
          className="w-full h-[160px] rounded overflow-hidden border border-border relative flex items-end"
          style={
            slot.url
              ? undefined
              : { background: 'repeating-linear-gradient(135deg, #1A2740 0 8px, #121C2E 8px 16px)' }
          }
        >
          {slot.url ? (
            <Image
              src={slot.url}
              alt={slot.label}
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <span className="font-mono text-[10px] text-fg-4 tracking-widest uppercase pb-2 pl-2">No image uploaded</span>
          )}
        </div>

        {/* Meta */}
        {slot.updated_at && slot.url && (
          <p className="font-mono text-[10px] text-fg-4 tracking-widest">
            UPDATED {new Date(slot.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-2 flex-wrap">
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleUpload}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 bg-sky text-on-sky font-semibold text-xs px-3 py-1.5 rounded hover:bg-sky/90 disabled:opacity-50 transition-colors"
          >
            <Upload size={12} />
            {uploading ? 'Uploading…' : slot.url ? 'Replace' : 'Upload'}
          </button>

          {slot.url && (
            <>
              <a
                href={slot.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 border border-border text-fg-2 font-medium text-xs px-3 py-1.5 rounded hover:bg-surface-2 transition-colors"
              >
                <ExternalLink size={12} />
                View
              </a>
              <button
                onClick={handleRemove}
                disabled={removing}
                className="flex items-center gap-1.5 border border-border text-warn font-medium text-xs px-3 py-1.5 rounded hover:bg-surface-2 disabled:opacity-50 transition-colors"
              >
                <Trash2 size={12} />
                {removing ? 'Removing…' : 'Remove'}
              </button>
            </>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-1.5 text-xs text-warn">
            <AlertCircle size={12} />
            {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-1.5 text-xs text-ok">
            <CheckCircle size={12} />
            Image uploaded successfully
          </div>
        )}
      </div>
    </AdminCard>
  )
}

export default function MediaClient({ initialSlots }: { initialSlots: MediaSlot[] }) {
  const [slots, setSlots] = useState(initialSlots)

  function handleUpdate(slotKey: string, url: string | null) {
    setSlots(prev =>
      prev.map(s => s.slot === slotKey ? { ...s, url, updated_at: new Date().toISOString() } : s)
    )
  }

  return (
    <div>
      <AdminPageHeader title="Media" sub="Platform" />
      <p className="text-sm text-fg-3 mb-6">
        Upload images to replace the placeholder areas in the app and on the website.
        Changes take effect immediately — no rebuild required.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {slots.map(slot => (
          <SlotCard key={slot.slot} slot={slot} onUpdate={handleUpdate} />
        ))}
      </div>
    </div>
  )
}
