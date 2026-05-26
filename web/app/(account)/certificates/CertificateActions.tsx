"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Plus, X, FileText } from "lucide-react"

type Category = "licence" | "rating" | "medical"

const CATEGORIES: { key: Category; label: string }[] = [
  { key: "licence", label: "Licence" },
  { key: "rating",  label: "Rating"  },
  { key: "medical", label: "Medical" },
]

export default function CertificateActions() {
  const router = useRouter()
  const supabase = createClient()

  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState<Category>("licence")
  const [title, setTitle] = useState("")
  const [issuingBody, setIssuingBody] = useState("")
  const [referenceNumber, setReferenceNumber] = useState("")
  const [issuedDate, setIssuedDate] = useState("")
  const [expiresDate, setExpiresDate] = useState("")
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const reset = () => {
    setCategory("licence")
    setTitle("")
    setIssuingBody("")
    setReferenceNumber("")
    setIssuedDate("")
    setExpiresDate("")
    setErrors({})
  }

  const handleSave = async () => {
    const errs: Record<string, string> = {}
    if (!title.trim())       errs.title = "Required"
    if (!issuingBody.trim()) errs.issuingBody = "Required"
    if (!issuedDate)         errs.issuedDate = "Required"
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { error } = await supabase.from("certificates").insert({
        user_id: user.id,
        category,
        title: title.trim(),
        issuing_body: issuingBody.trim(),
        reference_number: referenceNumber.trim() || null,
        issued_date: issuedDate,
        expires_date: expiresDate || null,
      })
      if (error) { setErrors({ form: error.message }); return }
      setOpen(false)
      reset()
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  const inp = "w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-fg placeholder:text-fg-4 focus:outline-none focus:border-sky transition-colors"
  const lbl = "block font-mono text-[10px] tracking-widest uppercase text-fg-3 mb-1.5"
  const err = (k: string) => errors[k] ? <p className="mt-1 text-xs text-danger">{errors[k]}</p> : null

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 h-9 px-4 bg-sky text-on-sky rounded-lg text-sm font-medium hover:bg-sky/90 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add certificate
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => { setOpen(false); reset() }} />
          <div className="relative bg-surface border border-border rounded-[18px] w-full max-w-[520px] shadow-2xl">
            {/* Header */}
            <div className="px-7 pt-6 pb-4 border-b border-border">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-mono text-[10px] tracking-widest uppercase text-fg-3 mb-1">Add certificate</p>
                  <h2 className="text-[22px] font-bold text-fg tracking-tight">New document</h2>
                  <p className="text-sm text-fg-3 mt-1">
                    Track licences, ratings and medicals. We&apos;ll warn you 30 days before each expires.
                  </p>
                </div>
                <button onClick={() => { setOpen(false); reset() }} className="ml-4 mt-0.5 text-fg-3 hover:text-fg transition-colors flex-shrink-0">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="px-7 py-5 space-y-5">
              {errors.form && (
                <p className="text-sm text-danger bg-danger-bg border border-danger/20 rounded-lg px-4 py-2">{errors.form}</p>
              )}

              {/* Category */}
              <div>
                <p className={lbl}>Category</p>
                <div className="grid grid-cols-3 gap-2">
                  {CATEGORIES.map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setCategory(key)}
                      className={`py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                        category === key
                          ? "border-sky bg-sky/5 text-sky"
                          : "border-border text-fg-2 hover:text-fg"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className={lbl}>Title</label>
                <input
                  type="text"
                  className={inp}
                  placeholder="e.g. B Licence"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
                {err("title")}
              </div>

              {/* Issuing body + reference */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Issuing body</label>
                  <input
                    type="text"
                    className={inp}
                    placeholder="e.g. APF"
                    value={issuingBody}
                    onChange={(e) => setIssuingBody(e.target.value)}
                  />
                  {err("issuingBody")}
                </div>
                <div>
                  <label className={lbl}>Reference / number</label>
                  <input
                    type="text"
                    className={inp}
                    placeholder="optional"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                  />
                </div>
              </div>

              {/* Issued + Expires */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Issued</label>
                  <input
                    type="month"
                    className={inp}
                    value={issuedDate}
                    onChange={(e) => setIssuedDate(e.target.value)}
                  />
                  {err("issuedDate")}
                </div>
                <div>
                  <label className={lbl}>Expires</label>
                  <input
                    type="date"
                    className={inp}
                    value={expiresDate}
                    onChange={(e) => setExpiresDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Attach document */}
              <div className="flex items-center gap-4 p-4 bg-bg border border-border rounded-xl">
                <FileText className="w-5 h-5 text-fg-3 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-fg">Attach document</p>
                  <p className="text-xs text-fg-3 mt-0.5">PDF or image, up to 8 MB. Drag a file here or click to browse.</p>
                </div>
                <button className="h-8 px-3 rounded-lg border border-border text-xs font-medium text-fg-2 hover:bg-surface-2 transition-colors flex-shrink-0">
                  Browse
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="px-7 pb-6 flex items-center justify-end gap-3">
              <button
                onClick={() => { setOpen(false); reset() }}
                className="h-11 px-5 rounded-lg border border-border text-sm font-medium text-fg-2 hover:bg-surface-2 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="h-11 px-5 rounded-lg bg-sky text-on-sky text-sm font-medium hover:bg-sky/90 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {saving ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span>✓</span>
                )}
                Save certificate
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
