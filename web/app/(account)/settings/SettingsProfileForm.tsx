"use client"

import { useState, useTransition } from "react"
import { updateProfile } from "./actions"
import { COUNTRIES } from "@/lib/countries"

// DOB must be at least 10 years in the past
function dobTooRecent(iso: string | null): boolean {
  if (!iso) return false
  const dob = new Date(iso)
  const cutoff = new Date()
  cutoff.setFullYear(cutoff.getFullYear() - 10)
  return dob > cutoff
}

interface ProfileData {
  full_name: string
  email: string
  licence_number: string | null
  licence_rating: string | null
  date_of_birth: string | null
  country: string | null
  home_dropzone_name: string | null
  emergency_contact_name: string | null
  emergency_contact_relationship: string | null
  emergency_contact_phone: string | null
}

export default function SettingsProfileForm({ profile, userId }: { profile: ProfileData; userId: string }) {
  const [data, setData] = useState<ProfileData>(profile)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const set = (key: keyof ProfileData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setData((d) => ({ ...d, [key]: e.target.value || null }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaved(false)
    if (dobTooRecent(data.date_of_birth)) {
      setError('Date of birth must be more than 10 years ago.')
      return
    }
    startTransition(async () => {
      const result = await updateProfile(userId, data)
      if (result?.error) {
        setError(result.error)
      } else {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Profile */}
      <section>
        <h2 className="text-sm font-semibold text-fg mb-1">Profile</h2>
        <p className="text-xs text-fg-4 mb-5">Visible only to you, and your instructors.</p>

        {/* Avatar */}
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-border">
          <div className="w-14 h-14 rounded-full bg-sky flex items-center justify-center flex-shrink-0">
            <span className="text-lg font-bold text-on-sky">
              {(data.full_name || "?").split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
            </span>
          </div>
          <div>
            <p className="text-base font-bold text-fg">{data.full_name || "—"}</p>
            <p className="font-mono text-xs text-fg-3 mt-0.5">
              {[data.licence_number, data.licence_rating].filter(Boolean).join(" · ") || "No licence on file"}
            </p>
            <p className="text-xs text-fg-4 mt-0.5">{data.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FieldGroup label="Full name" hint="Contact support to request a name change">
            <input
              type="text"
              value={data.full_name ?? ""}
              readOnly
              className={`${inputCls} opacity-50 cursor-not-allowed select-none`}
            />
          </FieldGroup>

          <FieldGroup label="Email" hint="Contact support to request an email change">
            <input
              type="email"
              value={data.email ?? ""}
              readOnly
              className={`${inputCls} opacity-50 cursor-not-allowed select-none`}
            />
          </FieldGroup>

          <FieldGroup label="Licence number" hint="Your APF number or governing body number">
            <input
              type="text"
              value={data.licence_number ?? ""}
              onChange={set("licence_number")}
              className={`${inputCls} uppercase`}
              placeholder="APF-2457830"
              autoComplete="off"
            />
          </FieldGroup>

          <FieldGroup label="Rating" hint="Your latest rating, e.g. B-237 or D-1897">
            <input
              type="text"
              value={data.licence_rating ?? ""}
              onChange={set("licence_rating")}
              className={`${inputCls} uppercase`}
              placeholder="B-237 or D-1897"
              autoComplete="off"
            />
          </FieldGroup>

          <FieldGroup label="Country">
            <select
              value={data.country ?? ""}
              onChange={set("country")}
              className={`${inputCls} cursor-pointer`}
            >
              <option value="">Select country…</option>
              {COUNTRIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </FieldGroup>

          <FieldGroup label="Date of birth">
            <input
              type="date"
              value={data.date_of_birth ?? ""}
              onChange={set("date_of_birth")}
              max={(() => { const d = new Date(); d.setFullYear(d.getFullYear() - 10); return d.toISOString().split('T')[0] })()}
              className={`${inputCls}${dobTooRecent(data.date_of_birth) ? ' border-danger' : ''}`}
            />
          </FieldGroup>

          <FieldGroup label="Home dropzone">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-4">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/>
                </svg>
              </span>
              <input
                type="text"
                value={data.home_dropzone_name ?? ""}
                onChange={set("home_dropzone_name")}
                className={`${inputCls} pl-8`}
                placeholder="Skydive Picton, NSW"
              />
            </div>
          </FieldGroup>
        </div>
      </section>

      {/* Emergency contact */}
      <section>
        <div className="border-t border-border pt-6">
          <h2 className="text-sm font-semibold text-fg mb-1">Emergency contact</h2>
          <p className="text-xs text-fg-4 mb-4">Only used in case of emergency. Never shared.</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FieldGroup label="Name">
              <input
                type="text"
                value={data.emergency_contact_name ?? ""}
                onChange={set("emergency_contact_name")}
                className={inputCls}
                placeholder="Jane Morrison"
              />
            </FieldGroup>
            <FieldGroup label="Relationship">
              <input
                type="text"
                value={data.emergency_contact_relationship ?? ""}
                onChange={set("emergency_contact_relationship")}
                className={inputCls}
                placeholder="Partner"
              />
            </FieldGroup>
            <FieldGroup label="Phone">
              <input
                type="tel"
                value={data.emergency_contact_phone ?? ""}
                onChange={set("emergency_contact_phone")}
                className={inputCls}
                placeholder="+61 4xx xxx xxx"
              />
            </FieldGroup>
          </div>
        </div>
      </section>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="bg-sky text-on-sky font-semibold text-sm px-5 py-2.5 rounded-sm hover:bg-sky/90 disabled:opacity-50 transition-colors"
        >
          {isPending ? "Saving…" : "Save changes"}
        </button>
        <button
          type="reset"
          onClick={() => setData(profile)}
          className="text-sm text-fg-3 hover:text-fg px-4 py-2.5 rounded-sm border border-border hover:border-border-strong transition-colors"
        >
          Cancel
        </button>
        {saved && <span className="text-xs text-ok">✓ Saved</span>}
        {error && <span className="text-xs text-danger">{error}</span>}
      </div>
    </form>
  )
}

const inputCls =
  "w-full bg-surface-2 border border-border rounded-sm px-3 py-2.5 text-sm text-fg placeholder:text-fg-4 focus:outline-none focus:border-sky transition-colors"

function FieldGroup({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-overline font-semibold tracking-widest uppercase text-fg-4 mb-1.5">
        {label}
      </label>
      {children}
      {hint && <p className="text-[11px] text-fg-4 mt-1">{hint}</p>}
    </div>
  )
}
