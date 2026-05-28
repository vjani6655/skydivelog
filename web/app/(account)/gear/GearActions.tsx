"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Plus, X, Briefcase, Umbrella, Cpu } from "lucide-react"

type GearType = "rig" | "canopy" | "aad"
type CanopySubType = "main" | "reserve"

const GEAR_TYPES: { key: GearType; label: string; icon: React.ElementType }[] = [
  { key: "rig",    label: "Rig",    icon: Briefcase },
  { key: "canopy", label: "Canopy", icon: Umbrella },
  { key: "aad",    label: "AAD",    icon: Cpu },
]

export default function GearActions() {
  const router = useRouter()
  const supabase = createClient()

  const [open, setOpen] = useState(false)
  const [gearType, setGearType] = useState<GearType>("rig")
  const [canopySubType, setCanopySubType] = useState<CanopySubType>("main")
  const [makeModel, setMakeModel] = useState("")
  const [serialNumber, setSerialNumber] = useState("")
  const [manufacturedDate, setManufacturedDate] = useState("")
  const [lastRepack, setLastRepack] = useState("")
  const [repackReminder, setRepackReminder] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const reset = () => {
    setGearType("rig")
    setCanopySubType("main")
    setMakeModel("")
    setSerialNumber("")
    setManufacturedDate("")
    setLastRepack("")
    setRepackReminder(true)
    setErrors({})
  }

  const handleSave = async () => {
    const errs: Record<string, string> = {}
    if (!makeModel.trim()) errs.makeModel = "Required"
    if (!serialNumber.trim()) errs.serialNumber = "Required"
    if (!manufacturedDate) errs.manufacturedDate = "Required"
    if (gearType === "canopy" && canopySubType === "reserve" && !lastRepack)
      errs.lastRepack = "Required for reserve"
    if (lastRepack && manufacturedDate && lastRepack < manufacturedDate)
      errs.lastRepack = "Repack date cannot be before manufacture date"
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { error } = await supabase.from("gear").insert({
        user_id: user.id,
        type: gearType,
        canopy_sub_type: gearType === "canopy" ? canopySubType : null,
        make_model: makeModel.trim(),
        serial_number: serialNumber.trim(),
        manufactured_date: manufacturedDate || null,
        last_repack_date: (gearType === "canopy" && canopySubType === "reserve") ? lastRepack || null : null,
        repack_reminder_enabled: gearType === "canopy" && canopySubType === "reserve" ? repackReminder : false,
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
        Add gear
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60" onClick={() => { setOpen(false); reset() }} />

          {/* Modal */}
          <div className="relative bg-surface border border-border rounded-[18px] w-full max-w-[520px] shadow-2xl">
            {/* Header */}
            <div className="px-7 pt-6 pb-4 border-b border-border">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-mono text-[10px] tracking-widest uppercase text-fg-3 mb-1">Add gear</p>
                  <h2 className="text-[22px] font-bold text-fg tracking-tight">New item</h2>
                  <p className="text-sm text-fg-3 mt-1">
                    Logged here for service tracking &amp; reminders. The app on your phone is the source of truth — this form syncs back to it.
                  </p>
                </div>
                <button
                  onClick={() => { setOpen(false); reset() }}
                  className="ml-4 mt-0.5 text-fg-3 hover:text-fg transition-colors flex-shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="px-7 py-5 space-y-5">
              {errors.form && (
                <p className="text-sm text-danger bg-danger-bg border border-danger/20 rounded-lg px-4 py-2">{errors.form}</p>
              )}

              {/* Type selector */}
              <div>
                <p className={lbl}>Type</p>
                <div className="grid grid-cols-3 gap-2">
                  {GEAR_TYPES.map(({ key, label, icon: Icon }) => (
                    <button
                      key={key}
                      onClick={() => setGearType(key)}
                      className={`flex flex-col items-center gap-2 py-4 rounded-xl border text-sm font-medium transition-colors ${
                        gearType === key
                          ? "border-sky bg-sky/5 text-sky"
                          : "border-border bg-bg text-fg-2 hover:border-border hover:text-fg"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Canopy sub-type */}
              {gearType === "canopy" && (
                <div>
                  <p className={lbl}>Canopy type</p>
                  <div className="flex gap-2">
                    {(["main", "reserve"] as CanopySubType[]).map((s) => (
                      <button
                        key={s}
                        onClick={() => setCanopySubType(s)}
                        className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                          canopySubType === s
                            ? "border-sky bg-sky/5 text-sky"
                            : "border-border text-fg-2 hover:text-fg"
                        }`}
                      >
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Make & model */}
              <div>
                <label className={lbl}>Make &amp; model</label>
                <input
                  type="text"
                  className={inp}
                  placeholder="e.g. PD Sabre3 170"
                  value={makeModel}
                  onChange={(e) => setMakeModel(e.target.value)}
                />
                {err("makeModel")}
              </div>

              {/* Serial + Manufacture date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Serial number</label>
                  <input
                    type="text"
                    className={inp}
                    placeholder="PD-A24-…"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                  />
                  {err("serialNumber")}
                </div>
                <div>
                  <label className={lbl}>Date of manufacture</label>
                  <input
                    type="date"
                    className={inp}
                    value={manufacturedDate}
                    onChange={(e) => setManufacturedDate(e.target.value)}
                  />
                  {err("manufacturedDate")}
                </div>
              </div>

              {/* Last repack — reserve canopy only */}
              {gearType === "canopy" && canopySubType === "reserve" && (
                <div>
                  <label className={lbl}>Last repack</label>
                  <input
                    type="date"
                    className={inp}
                    value={lastRepack}
                    onChange={(e) => setLastRepack(e.target.value)}
                  />
                  {err("lastRepack")}
                </div>
              )}

              {/* Repack reminder toggle — reserve only */}
              {gearType === "canopy" && canopySubType === "reserve" && (
                <div className="flex items-center justify-between p-4 bg-bg border border-border rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-fg">Set repack reminder</p>
                    <p className="text-xs text-fg-3 mt-0.5">Notify me 14 days before due.</p>
                  </div>
                  <button
                    role="switch"
                    aria-checked={repackReminder}
                    onClick={() => setRepackReminder((v) => !v)}
                    className={`relative flex-shrink-0 w-[46px] h-[26px] rounded-full transition-colors duration-200 focus:outline-none ${
                      repackReminder ? "bg-sky" : "bg-surface-3"
                    }`}
                  >
                    <span
                      className={`absolute top-[3px] left-[3px] w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                        repackReminder ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              )}
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
                Save gear
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
