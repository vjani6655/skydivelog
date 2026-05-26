"use client"

import Link from "next/link"
import { Download, Lock, Trash2 } from "lucide-react"

export default function SettingsPrivacyForm() {
  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Lock className="w-3.5 h-3.5 text-fg-3" />
          <h2 className="text-sm font-semibold text-fg">Privacy &amp; data</h2>
        </div>
        <p className="text-xs text-fg-4">Control your data and what you share with us.</p>
      </div>

      {/* Data export */}
      <section className="border border-border rounded-sm p-4">
        <div className="flex items-start gap-3">
          <Download className="w-3.5 h-3.5 text-fg-3 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-fg">Export your data</p>
            <p className="text-xs text-fg-3 mt-0.5 mb-3">
              Download a full copy of your logbook as a CSV — jump numbers, dates, altitudes, gear, dropzones, and notes.
            </p>
            <a
              href="/api/export/logbook-csv"
              download
              className="inline-block text-xs font-medium text-sky hover:text-sky/80 border border-sky/30 rounded-sm px-3 py-2 transition-colors hover:border-sky/60"
            >
              Download logbook CSV →
            </a>
          </div>
        </div>
      </section>

      {/* Delete account */}
      <section className="border border-danger/20 rounded-sm p-4 bg-danger-bg/30">
        <div className="flex items-start gap-3">
          <Trash2 className="w-3.5 h-3.5 text-danger mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-fg">Delete account</p>
            <p className="text-xs text-fg-3 mt-0.5 mb-3">
              Permanently delete your account and all logbook data. This cannot be undone. Your subscription will be cancelled immediately.
            </p>
            <Link
              href="mailto:support@skydivelog.app?subject=Delete%20my%20account"
              className="inline-block text-xs font-medium text-danger border border-danger/30 rounded-sm px-3 py-2 hover:border-danger/60 hover:bg-danger-bg transition-colors"
            >
              Request account deletion →
            </Link>
            <p className="text-[10px] text-fg-4 mt-2">
              Account deletion is handled by our support team to verify your identity.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
