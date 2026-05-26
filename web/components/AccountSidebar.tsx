"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import BrandMark from "@/components/BrandMark"
import {
  LayoutDashboard,
  BookOpen,
  Package,
  Shield,
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
  { href: "/dashboard",     label: "Dashboard",    icon: LayoutDashboard },
  { href: "/logbook",       label: "Logbook",      icon: BookOpen },
  { href: "/gear",          label: "Gear",         icon: Package },
  { href: "/certificates",  label: "Certificates", icon: Shield },
  { href: "/settings",      label: "Settings",     icon: Settings },
  { href: "/subscription",  label: "Subscription", icon: CreditCard },
  { href: "/billing",       label: "Billing",      icon: Receipt },
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
    <aside className="hidden md:flex flex-col w-60 flex-shrink-0 bg-surface border-r border-border min-h-screen sticky top-0">
      {/* Logo */}
      <div className="px-6 pt-6 pb-6">
        <Link href="/dashboard" className="flex items-center gap-2.5 px-2">
          <BrandMark size={24} variant="simple" />
          <span className="text-base font-bold text-fg tracking-tight">Jump Logs</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/")
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-[10px] rounded-lg text-body font-medium transition-colors ${
                active
                  ? "bg-sky-bg text-sky"
                  : "text-fg-2 hover:text-fg hover:bg-surface-2"
              }`}
            >
              <Icon className="w-[17px] h-[17px] flex-shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* User + sign-out */}
      <div className="px-4 pb-4 mt-auto space-y-1">
        {/* User card */}
        <div className="p-[14px] rounded-[10px] bg-bg border border-border">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-full bg-sky/20 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-sky">{initials(fullName)}</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-fg truncate">{fullName}</p>
              {licenceNumber && (
                <p className="font-mono text-[10px] text-fg-3 truncate uppercase">{licenceNumber}</p>
              )}
            </div>
          </div>
          {plan ? (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm bg-sky/10 border border-sky/25 text-[10px] font-semibold text-sky leading-none">
                PRO
              </span>
              {renews && (
                <span className="font-mono text-[10px] text-fg-3">RENEWS {renews.toUpperCase()}</span>
              )}
            </div>
          ) : (
            <Link href="/subscription" className="text-[10px] text-sky hover:text-sky/80 font-medium">
              Upgrade to Pro →
            </Link>
          )}
        </div>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2.5 w-full px-3 py-[8px] text-sm text-fg-3 hover:text-fg hover:bg-surface-2 rounded-lg transition-colors"
        >
          <LogOut className="w-[15px] h-[15px]" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
