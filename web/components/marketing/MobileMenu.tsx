"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import Link from "next/link"
import { Menu, X } from "lucide-react"
import BrandMark from "@/components/BrandMark"

const NAV_LINKS = [
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/verify", label: "Verify jump" },
]

interface Props {
  isLoggedIn: boolean
}

export default function MobileMenu({ isLoggedIn }: Props) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const drawer = (
    <div className="fixed inset-0 z-[200] md:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Drawer */}
      <div className="absolute left-0 top-0 bottom-0 w-72 flex flex-col bg-surface border-r border-border">
        {/* Header */}
        <div className="flex items-center justify-between px-5 h-14 border-b border-border shrink-0">
          <Link
            href="/"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2"
          >
            <BrandMark size={20} variant="simple" />
            <span className="text-sm font-bold text-fg tracking-tight">Jump Logs</span>
          </Link>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 text-fg-3 hover:text-fg transition-colors"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-4 py-4 space-y-0.5 overflow-y-auto">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="flex items-center px-3 py-3 rounded-lg text-sm font-medium text-fg-2 hover:text-fg hover:bg-surface-2 transition-colors"
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* CTA area */}
        <div className="px-4 pb-6 pt-4 border-t border-border space-y-2 shrink-0">
          {isLoggedIn ? (
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center w-full px-4 py-2.5 rounded-lg bg-sky text-on-sky text-sm font-semibold hover:bg-sky/90 transition-colors"
            >
              Go to dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/signup"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center w-full px-4 py-2.5 rounded-lg bg-sky text-on-sky text-sm font-semibold hover:bg-sky/90 transition-colors"
              >
                Sign up
              </Link>
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center w-full px-4 py-2.5 rounded-lg border border-border text-sm font-medium text-fg-2 hover:text-fg hover:bg-surface-2 transition-colors"
              >
                Log in
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="md:hidden p-2 -mr-1 text-fg-2 hover:text-fg transition-colors"
        aria-label="Open navigation"
      >
        <Menu className="w-5 h-5" />
      </button>

      {mounted && open && createPortal(drawer, document.body)}
    </>
  )
}
