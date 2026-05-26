"use client"

import { useState, useTransition } from "react"
import { updateNotificationPrefs } from "./actions"
import { Bell, CreditCard, Mail } from "lucide-react"

interface NotificationData {
  marketing_emails_opt_in: boolean
}

function Toggle({
  label,
  description,
  value,
  onChange,
  disabled,
}: {
  label: string
  description: string
  value: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-4 border-b border-border last:border-0">
      <div>
        <p className="text-sm font-medium text-fg">{label}</p>
        <p className="text-xs text-fg-3 mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        disabled={disabled}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-50 ${
          value ? "bg-sky" : "bg-border"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${
            value ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  )
}

function InfoRow({
  icon: Icon,
  label,
  note,
}: {
  icon: React.ElementType
  label: string
  note: string
}) {
  return (
    <div className="flex items-start gap-3 py-4 border-b border-border last:border-0">
      <Icon className="w-4 h-4 text-fg-3 flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-medium text-fg">{label}</p>
        <p className="text-xs text-fg-3 mt-0.5">{note}</p>
      </div>
      <span className="ml-auto text-xs text-fg-4 border border-border rounded-sm px-2 py-0.5 bg-surface-2">
        Automatic
      </span>
    </div>
  )
}

export default function SettingsNotificationsForm({
  data,
  userId,
}: {
  data: NotificationData
  userId: string
}) {
  const [prefs, setPrefs] = useState<NotificationData>(data)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleToggle = (key: keyof NotificationData) => (val: boolean) => {
    const next = { ...prefs, [key]: val }
    setPrefs(next)
    setError(null)
    startTransition(async () => {
      const res = await updateNotificationPrefs(userId, next)
      if (res?.error) { setError(res.error); setPrefs(prefs) }
      else { setSaved(true); setTimeout(() => setSaved(false), 3000) }
    })
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Bell className="w-3.5 h-3.5 text-fg-3" />
          <h2 className="text-sm font-semibold text-fg">Email &amp; notifications</h2>
        </div>
        <p className="text-xs text-fg-4">Control which emails you receive from us.</p>
      </div>

      <section>
        <h3 className="text-overline font-semibold tracking-widest uppercase text-fg-4 mb-1">
          Your preferences
        </h3>
        <div className="border border-border rounded-sm px-4">
          <Toggle
            label="Product updates &amp; tips"
            description="Occasional emails about new features, tips, and improvements to Logbook."
            value={prefs.marketing_emails_opt_in}
            onChange={handleToggle("marketing_emails_opt_in")}
            disabled={isPending}
          />
        </div>
        {saved && <p className="text-xs text-ok mt-2">✓ Saved</p>}
        {error && <p className="text-xs text-danger mt-2">{error}</p>}
      </section>

      <section>
        <h3 className="text-overline font-semibold tracking-widest uppercase text-fg-4 mb-1">
          Transactional emails
        </h3>
        <p className="text-xs text-fg-3 mb-3">
          These emails are required and cannot be disabled.
        </p>
        <div className="border border-border rounded-sm px-4">
          <InfoRow
            icon={CreditCard}
            label="Payment receipts"
            note="Sent automatically by Stripe after each successful payment."
          />
          <InfoRow
            icon={Mail}
            label="Subscription renewal reminders"
            note="Sent by Stripe a few days before your annual subscription renews."
          />
          <InfoRow
            icon={Mail}
            label="Account & security alerts"
            note="Sign-in from a new device, password changes, and other account activity."
          />
        </div>
      </section>
    </div>
  )
}
