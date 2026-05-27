'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Users, ShieldAlert, CreditCard, Repeat, Tag, Percent,
  BarChart2, Download, Mail, Bell, Settings, ChevronRight, Image, LogOut,
} from 'lucide-react'
import AdminThemeToggle from './AdminThemeToggle'
import { createClient } from '@/lib/supabase/client'

const NAV_GROUPS = [
  {
    label: null,
    items: [{ key: 'dashboard', label: 'Dashboard', href: '/admin/dashboard', Icon: LayoutDashboard }],
  },
  {
    label: 'Users & accounts',
    items: [
      { key: 'users',   label: 'Users',           href: '/admin/users',   Icon: Users },
      { key: 'flagged', label: 'Flagged entries',  href: '/admin/flagged', Icon: ShieldAlert },
    ],
  },
  {
    label: 'Revenue',
    items: [
      { key: 'revenue',    label: 'Revenue',          href: '/admin/revenue',                  Icon: CreditCard },
      { key: 'subs',       label: 'Subscriptions',    href: '/admin/revenue/subscriptions',    Icon: Repeat },
      { key: 'pricing',    label: 'Plans & pricing',  href: '/admin/pricing',                  Icon: Tag },
      { key: 'discounts',  label: 'Discounts',        href: '/admin/discounts',                Icon: Percent },
    ],
  },
  {
    label: 'Platform',
    items: [
      { key: 'platform', label: 'Platform stats', href: '/admin/platform', Icon: BarChart2 },
      { key: 'data',     label: 'Data export',    href: '/admin/data',     Icon: Download },
      { key: 'media',    label: 'Media',           href: '/admin/media',    Icon: Image },
    ],
  },
  {
    label: 'Support',
    items: [
      { key: 'tickets',  label: 'Tickets',         href: '/admin/support',        Icon: Mail },
      { key: 'announce', label: 'Announcements',   href: '/admin/announcements',  Icon: Bell },
    ],
  },
  {
    label: 'Settings',
    items: [
      { key: 'settings', label: 'Admin settings', href: '/admin/settings', Icon: Settings },
    ],
  },
]

export default function AdminSidebar({ adminEmail, adminName, adminRole }: { adminEmail: string; adminName?: string; adminRole?: string }) {
  const pathname = usePathname()
  const router = useRouter()

  const isActive = (href: string) => pathname === href

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const displayName = adminName || adminEmail.split('@')[0]
  const initials = displayName.split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase()

  return (
    <aside className="w-60 shrink-0 flex flex-col bg-surface border-r border-border h-screen sticky top-0 overflow-y-auto">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-3 py-5 border-b border-border mb-4">
        <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
          <path d="M4 12a12 12 0 0124 0" stroke="var(--c-sky)" strokeWidth="2.2" strokeLinecap="round"/>
          <path d="M4 12l12 7 12-7" stroke="var(--c-sky)" strokeWidth="2.2" strokeLinejoin="round"/>
          <path d="M16 19v9" stroke="var(--c-fg)" strokeWidth="2.2" strokeLinecap="round"/>
          <circle cx="16" cy="29" r="2" fill="var(--c-fg)"/>
        </svg>
        <div>
          <div className="text-sm font-bold text-fg leading-none">Jump Logs</div>
          <div className="font-mono text-[9px] text-warn tracking-[0.12em] mt-1">ADMIN · PROD</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5">
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi} className="mb-3">
            {group.label && (
              <div className="font-mono text-[9px] text-fg-4 tracking-[0.12em] uppercase px-2.5 py-1.5">
                {group.label}
              </div>
            )}
            {group.items.map(({ href, label, Icon }) => {
              const active = isActive(href)
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm font-medium transition-colors mb-0.5
                    ${active
                      ? 'bg-sky/10 text-sky'
                      : 'text-fg-2 hover:bg-surface-2 hover:text-fg'
                    }`}
                >
                  <Icon size={14} className="shrink-0" />
                  {label}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Theme toggle + Admin user chip */}
      <div className="p-3 border-t border-border space-y-2">
        <div className="flex items-center justify-between px-0.5">
          <span className="font-mono text-[9px] text-fg-4 tracking-widest uppercase">Appearance</span>
          <AdminThemeToggle />
        </div>
        <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-surface-2 border border-border">
          <div className="w-7 h-7 rounded-full bg-cyan/20 text-cyan flex items-center justify-center font-mono text-[10px] font-semibold shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-fg truncate">{displayName}</div>
            <div className="font-mono text-[9px] text-fg-3 mt-0.5">{(adminRole ?? 'admin').toUpperCase()}</div>
          </div>
          <ChevronRight size={12} className="text-fg-3 shrink-0" />
        </div>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-sm text-fg-3 hover:text-danger hover:bg-danger/5 transition-colors"
        >
          <LogOut size={14} className="shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
