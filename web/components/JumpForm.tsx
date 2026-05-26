"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import type { Jump, JumpInsert } from "@/lib/types"

interface Props {
  jump?: Jump
}

const defaultValues: JumpInsert = {
  jump_number: 1,
  date: new Date().toISOString().slice(0, 10),
  location: "",
  aircraft: "",
  altitude_ft: 14000,
  freefall_seconds: 60,
  canopy: "",
  description: "",
}

export default function JumpForm({ jump }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [values, setValues] = useState<JumpInsert>(
    jump
      ? {
          jump_number: jump.jump_number,
          date: jump.date,
          location: jump.location,
          aircraft: jump.aircraft,
          altitude_ft: jump.altitude_ft,
          freefall_seconds: jump.freefall_seconds,
          canopy: jump.canopy ?? "",
          description: jump.description ?? "",
        }
      : defaultValues,
  )

  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const set = (field: keyof JumpInsert, value: string | number) =>
    setValues((v) => ({ ...v, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setError("Not authenticated")
      setLoading(false)
      return
    }

    const payload = {
      ...values,
      altitude_ft: Number(values.altitude_ft),
      freefall_seconds: Number(values.freefall_seconds),
      jump_number: Number(values.jump_number),
    }

    if (jump) {
      const { error } = await supabase
        .from("jumps")
        .update(payload)
        .eq("id", jump.id)
      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }
    } else {
      const { error } = await supabase
        .from("jumps")
        .insert({ ...payload, user_id: user.id })
      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }
    }

    router.push("/logbook")
    router.refresh()
  }

  const handleDelete = async () => {
    if (!jump || !confirm("Delete this jump? This cannot be undone.")) return
    const { error } = await supabase.from("jumps").delete().eq("id", jump.id)
    if (error) {
      setError(error.message)
      return
    }
    router.push("/logbook")
    router.refresh()
  }

  const input =
    "mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
  const label = "block text-sm font-medium text-gray-700"

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={label}>Jump #</label>
          <input
            type="number"
            required
            min={1}
            value={values.jump_number}
            onChange={(e) => set("jump_number", e.target.value)}
            className={input}
          />
        </div>
        <div>
          <label className={label}>Date</label>
          <input
            type="date"
            required
            value={values.date}
            onChange={(e) => set("date", e.target.value)}
            className={input}
          />
        </div>
      </div>

      <div>
        <label className={label}>Location / Drop zone</label>
        <input
          type="text"
          required
          value={values.location}
          onChange={(e) => set("location", e.target.value)}
          placeholder="e.g. Skydive Chicago"
          className={input}
        />
      </div>

      <div>
        <label className={label}>Aircraft</label>
        <input
          type="text"
          required
          value={values.aircraft}
          onChange={(e) => set("aircraft", e.target.value)}
          placeholder="e.g. Otter, King Air"
          className={input}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={label}>Exit altitude (ft)</label>
          <input
            type="number"
            required
            min={500}
            value={values.altitude_ft}
            onChange={(e) => set("altitude_ft", e.target.value)}
            className={input}
          />
        </div>
        <div>
          <label className={label}>Freefall (seconds)</label>
          <input
            type="number"
            required
            min={0}
            value={values.freefall_seconds}
            onChange={(e) => set("freefall_seconds", e.target.value)}
            className={input}
          />
        </div>
      </div>

      <div>
        <label className={label}>Canopy</label>
        <input
          type="text"
          value={values.canopy ?? ""}
          onChange={(e) => set("canopy", e.target.value)}
          placeholder="e.g. Sabre2 170"
          className={input}
        />
      </div>

      <div>
        <label className={label}>Notes</label>
        <textarea
          rows={3}
          value={values.description ?? ""}
          onChange={(e) => set("description", e.target.value)}
          placeholder="What happened on this jump?"
          className={input}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center justify-between pt-2">
        {jump ? (
          <button
            type="button"
            onClick={handleDelete}
            className="text-sm text-red-600 hover:underline"
          >
            Delete jump
          </button>
        ) : (
          <span />
        )}
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Saving…" : jump ? "Save changes" : "Log jump"}
        </button>
      </div>
    </form>
  )
}
