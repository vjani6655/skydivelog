'use client'

import { useRef, useState } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { AdminMarkdown } from '@/components/MarkdownRenderer'
import { Badge } from '@/components/admin/ui'
import {
  Plus, Trash2, ChevronDown, ChevronUp,
  Globe, EyeOff, Bold, Italic, List, GripVertical,
} from 'lucide-react'

type ChangeCategory = 'New' | 'Fix' | 'Improvement'

interface ReleaseChange {
  category: ChangeCategory
  text: string
}

interface ChangeItem extends ReleaseChange {
  _id: string
}

type Platform = 'iOS App' | 'Android App' | 'Web'
const ALL_PLATFORMS: Platform[] = ['iOS App', 'Android App', 'Web']

interface Release {
  id: string
  build_number: number | null
  version: string | null
  title: string | null
  changes: ReleaseChange[]
  platforms: Platform[]
  is_published: boolean
  published_at: string | null
  created_at: string
  sort_order: number
}

const CATEGORIES: ChangeCategory[] = ['New', 'Fix', 'Improvement']

const CATEGORY_COLORS: Record<ChangeCategory, string> = {
  New:         'bg-ok/10 text-ok border-ok/20',
  Fix:         'bg-warn/10 text-warn border-warn/20',
  Improvement: 'bg-sky/10 text-sky border-sky/20',
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

let _seq = 0
function newId() { return `ch-${Date.now()}-${_seq++}` }
function emptyChange(): ChangeItem { return { _id: newId(), category: 'New', text: '' } }
function toChangeItem(c: ReleaseChange): ChangeItem { return { ...c, _id: newId() } }

// ── Markdown toolbar ──────────────────────────────────────────────────────────

function insertAround(el: HTMLTextAreaElement, before: string, after: string, onChange: (v: string) => void) {
  const start = el.selectionStart
  const end   = el.selectionEnd
  const sel   = el.value.slice(start, end)
  const next  = el.value.slice(0, start) + before + sel + after + el.value.slice(end)
  onChange(next)
  requestAnimationFrame(() => { el.focus(); el.setSelectionRange(start + before.length, end + before.length) })
}

function insertLine(el: HTMLTextAreaElement, prefix: string, onChange: (v: string) => void) {
  const start = el.selectionStart
  const lineStart = el.value.lastIndexOf('\n', start - 1) + 1
  const next = el.value.slice(0, lineStart) + prefix + el.value.slice(lineStart)
  onChange(next)
  requestAnimationFrame(() => { el.focus(); el.setSelectionRange(start + prefix.length, start + prefix.length) })
}

function MarkdownEditor({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const ref = useRef<HTMLTextAreaElement>(null)
  return (
    <div className="border border-border rounded-sm focus-within:border-sky transition-colors bg-surface-2">
      <div className="flex items-center gap-0.5 px-2 py-1 border-b border-border">
        <ToolbarBtn title="Bold"        onClick={() => ref.current && insertAround(ref.current, '**', '**', onChange)}><Bold className="w-3.5 h-3.5" /></ToolbarBtn>
        <ToolbarBtn title="Italic"      onClick={() => ref.current && insertAround(ref.current, '*', '*', onChange)}><Italic className="w-3.5 h-3.5" /></ToolbarBtn>
        <ToolbarBtn title="Bullet list" onClick={() => ref.current && insertLine(ref.current, '- ', onChange)}><List className="w-3.5 h-3.5" /></ToolbarBtn>
      </div>
      <textarea
        ref={ref}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full bg-transparent px-3 py-2 text-sm text-fg placeholder:text-fg-4 focus:outline-none resize-y min-h-[72px]"
      />
    </div>
  )
}

function ToolbarBtn({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" title={title} onClick={onClick} className="p-1 rounded text-fg-3 hover:text-fg hover:bg-surface transition-colors">
      {children}
    </button>
  )
}

// ── Sortable change item (within form) ────────────────────────────────────────

function SortableChangeItem({ item, onUpdate, onRemove }: { item: ChangeItem; onUpdate: (patch: Partial<ReleaseChange>) => void; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item._id })
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={`flex items-start gap-2 ${isDragging ? 'opacity-50' : ''}`}>
      <button type="button" {...attributes} {...listeners} className="p-1.5 text-fg-4 hover:text-fg-2 cursor-grab active:cursor-grabbing flex-shrink-0 mt-[3px] touch-none" title="Drag to reorder">
        <GripVertical className="w-3.5 h-3.5" />
      </button>
      <select value={item.category} onChange={e => onUpdate({ category: e.target.value as ChangeCategory })} className="bg-surface-2 border border-border rounded-sm px-2 py-2 text-xs text-fg focus:outline-none focus:border-sky w-32 flex-shrink-0 mt-[1px]">
        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      <div className="flex-1">
        <MarkdownEditor value={item.text} onChange={v => onUpdate({ text: v })} placeholder="Describe the change… (supports **bold**, *italic*, - bullet)" />
      </div>
      <button type="button" onClick={onRemove} className="p-1.5 text-fg-4 hover:text-danger transition-colors flex-shrink-0 mt-1">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

// ── Release form ──────────────────────────────────────────────────────────────

function ReleaseForm({ initial, onSave, onCancel, loading }: {
  initial?: Partial<Release>
  onSave: (data: Omit<Release, 'id' | 'is_published' | 'created_at' | 'sort_order'>) => void
  onCancel: () => void
  loading: boolean
}) {
  const [buildNumber, setBuildNumber] = useState(initial?.build_number != null ? String(initial.build_number) : '')
  const [version, setVersion]         = useState(initial?.version ?? '')
  const [title, setTitle]             = useState(initial?.title ?? '')
  const [platforms, setPlatforms]     = useState<Platform[]>(initial?.platforms ?? [])
  const [releaseDate, setReleaseDate] = useState(
    initial?.published_at ? new Date(initial.published_at).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)
  )
  const [changes, setChanges]         = useState<ChangeItem[]>(
    initial?.changes?.length ? initial.changes.map(toChangeItem) : [emptyChange()]
  )

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const isMobileRelease = platforms.some(p => p === 'iOS App' || p === 'Android App')

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setChanges(items => {
        const oi = items.findIndex(i => i._id === active.id)
        const ni = items.findIndex(i => i._id === over.id)
        return arrayMove(items, oi, ni)
      })
    }
  }

  const togglePlatform = (p: Platform) =>
    setPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])

  const addChange    = () => setChanges(c => [...c, emptyChange()])
  const removeChange = (id: string) => setChanges(c => c.filter(ch => ch._id !== id))
  const updateChange = (id: string, patch: Partial<ReleaseChange>) =>
    setChanges(c => c.map(ch => ch._id === id ? { ...ch, ...patch } : ch))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      build_number: buildNumber ? Number(buildNumber) : null,
      version:      version || null,
      title:        title || null,
      platforms,
      published_at: releaseDate ? new Date(releaseDate).toISOString() : null,
      changes: changes.filter(c => c.text.trim()).map(({ _id: _, ...rest }) => rest),
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {isMobileRelease && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-mono tracking-widest text-fg-3 mb-1">BUILD NUMBER</label>
            <input type="number" value={buildNumber} onChange={e => setBuildNumber(e.target.value)} className={inputCls} placeholder="37" required />
          </div>
          <div>
            <label className="block text-[11px] font-mono tracking-widest text-fg-3 mb-1">VERSION</label>
            <input type="text" value={version} onChange={e => setVersion(e.target.value)} className={inputCls} placeholder="1.0.0" required />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-mono tracking-widest text-fg-3 mb-1">TITLE (optional)</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} className={inputCls} placeholder="What's New in 1.0.0" />
        </div>
        <div>
          <label className="block text-[11px] font-mono tracking-widest text-fg-3 mb-1">RELEASE DATE</label>
          <input type="date" value={releaseDate} onChange={e => setReleaseDate(e.target.value)} className={inputCls} />
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-mono tracking-widest text-fg-3 mb-2">PLATFORMS</label>
        <div className="flex items-center gap-2 flex-wrap">
          {ALL_PLATFORMS.map(p => (
            <button key={p} type="button" onClick={() => togglePlatform(p)}
              className={`px-3 py-1.5 rounded-sm text-xs font-medium border transition-colors ${
                platforms.includes(p) ? 'bg-sky text-on-sky border-sky' : 'bg-surface-2 text-fg-3 border-border hover:border-border-strong'
              }`}
            >{p}</button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-mono tracking-widest text-fg-3 mb-2">
          CHANGES
          <span className="ml-2 normal-case font-sans tracking-normal text-fg-4 text-[10px]">drag to reorder</span>
        </label>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={changes.map(c => c._id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {changes.map(ch => (
                <SortableChangeItem
                  key={ch._id}
                  item={ch}
                  onUpdate={patch => updateChange(ch._id, patch)}
                  onRemove={() => removeChange(ch._id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
        <button type="button" onClick={addChange} className="mt-2 flex items-center gap-1.5 text-xs text-sky hover:text-sky/80 transition-colors">
          <Plus className="w-3.5 h-3.5" /> Add change
        </button>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button type="submit" disabled={loading} className="bg-sky text-on-sky text-xs font-semibold px-4 py-2 rounded-sm hover:bg-sky/90 disabled:opacity-50 transition-colors">
          {loading ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={onCancel} className="text-xs text-fg-3 hover:text-fg px-3 py-2 border border-border rounded-sm hover:border-border-strong transition-colors">
          Cancel
        </button>
      </div>
    </form>
  )
}

// ── Sortable release card ─────────────────────────────────────────────────────

function SortableReleaseCard({
  release,
  isEditing,
  isExpanded,
  loading,
  onEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  onTogglePublish,
  onToggleExpand,
}: {
  release: Release
  isEditing: boolean
  isExpanded: boolean
  loading: boolean
  onEdit: () => void
  onCancelEdit: () => void
  onSaveEdit: (data: Omit<Release, 'id' | 'is_published' | 'created_at' | 'sort_order'>) => void
  onDelete: () => void
  onTogglePublish: () => void
  onToggleExpand: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: release.id })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`bg-surface border border-border rounded-[10px] overflow-hidden ${isDragging ? 'opacity-60 shadow-2xl z-10 relative' : ''}`}
    >
      {isEditing ? (
        <div className="p-5">
          <p className="text-sm font-semibold text-fg mb-4">Edit release</p>
          <ReleaseForm initial={release} onSave={onSaveEdit} onCancel={onCancelEdit} loading={loading} />
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 px-4 py-4">
            {/* Drag handle */}
            <button
              type="button"
              {...attributes}
              {...listeners}
              className="p-1 text-fg-4 hover:text-fg-2 cursor-grab active:cursor-grabbing flex-shrink-0 touch-none"
              title="Drag to reorder"
            >
              <GripVertical className="w-4 h-4" />
            </button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {release.version    && <span className="font-mono text-sm font-semibold text-fg">v{release.version}</span>}
                {release.build_number && <span className="font-mono text-[11px] text-fg-3">Build {release.build_number}</span>}
                {release.is_published ? <Badge kind="ok">PUBLISHED</Badge> : <Badge kind="muted">DRAFT</Badge>}
                {(release.platforms ?? []).map(p => (
                  <span key={p} className="inline-flex items-center px-1.5 py-0.5 rounded-[4px] text-[10px] font-mono tracking-widest border bg-surface-2 text-fg-3 border-border">
                    {p.toUpperCase()}
                  </span>
                ))}
              </div>
              {release.title && <p className="text-xs text-fg-3 mt-0.5">{release.title}</p>}
              <p className="text-[11px] text-fg-4 mt-0.5">
                {release.changes.length} change{release.changes.length !== 1 ? 's' : ''} · Created {fmtDate(release.created_at)}
                {release.published_at && ` · Published ${fmtDate(release.published_at)}`}
              </p>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button onClick={onTogglePublish} disabled={loading} title={release.is_published ? 'Unpublish' : 'Publish'}
                className="p-1.5 text-fg-3 hover:text-fg transition-colors disabled:opacity-50">
                {release.is_published ? <EyeOff className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
              </button>
              <button onClick={onEdit} className="text-[11px] text-sky hover:text-sky/80 px-2 py-1 border border-sky/30 rounded-sm transition-colors">
                Edit
              </button>
              <button onClick={onDelete} disabled={loading} className="p-1.5 text-fg-4 hover:text-danger transition-colors disabled:opacity-50">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <button onClick={onToggleExpand} className="p-1.5 text-fg-4 hover:text-fg transition-colors">
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {isExpanded && release.changes.length > 0 && (
            <div className="border-t border-border px-5 py-4 space-y-3">
              {release.changes.map((ch, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded-[4px] text-[10px] font-mono tracking-widest border flex-shrink-0 mt-0.5 ${CATEGORY_COLORS[ch.category]}`}>
                    {ch.category.toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <AdminMarkdown>{ch.text}</AdminMarkdown>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Main client ───────────────────────────────────────────────────────────────

export default function ReleasesClient({ initialReleases }: { initialReleases: Release[] }) {
  const [releases, setReleases] = useState<Release[]>(initialReleases)
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId]   = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState<string | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  // ── Reorder release cards ─────────────────────────────────────────────────

  const handleDragEndReleases = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setReleases(items => {
      const oi = items.findIndex(r => r.id === active.id)
      const ni = items.findIndex(r => r.id === over.id)
      const reordered = arrayMove(items, oi, ni)
      // Persist new order — fire and forget
      fetch('/api/admin/releases/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds: reordered.map(r => r.id) }),
      }).catch(console.error)
      return reordered
    })
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────

  const handleCreate = async (data: Omit<Release, 'id' | 'is_published' | 'created_at' | 'sort_order'>) => {
    setLoading(true); setError(null)
    const res = await fetch('/api/admin/releases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    setLoading(false)
    if (!res.ok) { setError(json.error); return }
    setReleases(r => [json, ...r])
    setShowCreate(false)
    setExpandedId(json.id)
  }

  const handleUpdate = async (id: string, data: Omit<Release, 'id' | 'is_published' | 'created_at' | 'sort_order'>) => {
    setLoading(true); setError(null)
    const res = await fetch(`/api/admin/releases/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    setLoading(false)
    if (!res.ok) { setError(json.error); return }
    setReleases(r => r.map(x => x.id === id ? json : x))
    setEditingId(null)
    setExpandedId(id)
  }

  const handleTogglePublish = async (release: Release) => {
    setLoading(true); setError(null)
    const res = await fetch(`/api/admin/releases/${release.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_published: !release.is_published }),
    })
    const json = await res.json()
    setLoading(false)
    if (!res.ok) { setError(json.error); return }
    setReleases(r => r.map(x => x.id === release.id ? json : x))
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this release? This cannot be undone.')) return
    setLoading(true); setError(null)
    const res = await fetch(`/api/admin/releases/${id}`, { method: 'DELETE' })
    setLoading(false)
    if (!res.ok) { setError('Delete failed'); return }
    setReleases(r => r.filter(x => x.id !== id))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="font-mono text-[11px] tracking-widest uppercase text-fg-3 mb-1">Admin</p>
          <h1 className="text-[28px] font-bold text-fg tracking-tight">Releases</h1>
        </div>
        <button
          onClick={() => { setShowCreate(true); setEditingId(null) }}
          className="flex items-center gap-2 bg-sky text-on-sky text-sm font-semibold px-4 py-2 rounded-sm hover:bg-sky/90 transition-colors"
        >
          <Plus className="w-4 h-4" /> New release
        </button>
      </div>

      {error && <p className="mb-4 text-xs text-danger bg-danger/10 border border-danger/20 rounded-sm px-3 py-2">{error}</p>}

      {showCreate && (
        <div className="mb-4 bg-surface border border-sky/40 rounded-[10px] p-5">
          <p className="text-sm font-semibold text-fg mb-4">New release</p>
          <ReleaseForm onSave={handleCreate} onCancel={() => setShowCreate(false)} loading={loading} />
        </div>
      )}

      {releases.length === 0 && !showCreate && (
        <div className="text-center py-16 text-fg-4 text-sm">No releases yet. Create your first one.</div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndReleases}>
        <SortableContext items={releases.map(r => r.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {releases.map(release => (
              <SortableReleaseCard
                key={release.id}
                release={release}
                isEditing={editingId === release.id}
                isExpanded={expandedId === release.id}
                loading={loading}
                onEdit={() => { setEditingId(release.id); setExpandedId(null) }}
                onCancelEdit={() => setEditingId(null)}
                onSaveEdit={data => handleUpdate(release.id, data)}
                onDelete={() => handleDelete(release.id)}
                onTogglePublish={() => handleTogglePublish(release)}
                onToggleExpand={() => setExpandedId(expandedId === release.id ? null : release.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}

const inputCls = 'w-full bg-surface-2 border border-border rounded-sm px-3 py-2 text-sm text-fg placeholder:text-fg-4 focus:outline-none focus:border-sky transition-colors'
