"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import BrandMark from "@/components/BrandMark"
import {
  LayoutDashboard,
  BookOpen,
  Settings,
  CreditCard,
  Receipt,
  LogOut,
} from "lucide-react"

interface SidebarProps {
  fullName: string
  licenceNumber: string | null
  plan: string | null
  renewsAt: string | null
}

const NAV = [
  { href: "/dashboard",    label: "Dashboard",    icon: LayoutDashboard },
  { href: "/logbook",      label: "Logbook",      icon: BookOpen },
  { href: "/settings",     label: "Settings",     icon: Settings },
  { href: "/subscription", label: "Subscription", icon: CreditCard },
  { href: "/billing",      label: "Billing",      icon: Receipt },
]

function fmtRenews(iso: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  }).replace(/\s/g, " ")
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("")
}

export default function AccountSidebar({ fullName, licenceNumber, plan, renewsAt }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  const renews = fmtRenews(renewsAt)

  return (
    <aside className="hidden md:flex flex-col w-52 flex-shrink-0 bg-surface border-r border-border min-h-screen sticky top-0">
      {/* Logo */}
      <div className="px-5 pt-5 pb-4 border-b border-border">
        <Link href="/dashboard" className="flex items-center gap-2">
          <BrandMark size={22} variant="simple" />
          <span className="text-sm font-bold text-fg tracking-tight">Jump Logs</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/")
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-sm text-sm transition-colors ${
                active
                  ? "bg-sky/10 text-sky font-medium"
                  : "text-fg-3 hover:text-fg hover:bg-surface-2"
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* User card */}
      <div className="px-3 pb-4 border-t border-border pt-4 space-y-3">
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-full bg-sky/20 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-sky">{initials(fullName)}</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-fg truncate">{fullName}</p>
            {licenceNumber && (
              <p className="text-xs text-fg-4 truncate">{licenceNumber}</p>
            )}
            {plan && (
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm bg-sky/10 border border-sky/25 text-[10px] font-semibold text-sky leading-none">
                  <svg className="w-2.5 h-2.5" viewBox="0 0 32 32" fill="none">
                    <path d="M16 4C9.37 4 4 9.37 4 16s5.37 12 12 12 12-5.37 12-12S22.63 4 16 4zm0 2c5.52 0 10 4.48 10 10s-4.48 10-10 10S6 21.52 6 16 10.48 6 16 6z" fill="currentColor" opacity="0.5"/>
                    <path d="M22 10.5l-8 3.5-3.5 8 8-3.5 3.5-8z" fill="currentColor"/>
                  </svg>
                  PRO
                </span>
                {renews && (
                  <span className="text-[10px] text-fg-4 font-mono">RENEWS {renews.toUpperCase()}</span>
                )}
              </div>
            )}
          </div>
        </div>

        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-fg-4 hover:text-fg hover:bg-surface-2 rounded-sm transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
