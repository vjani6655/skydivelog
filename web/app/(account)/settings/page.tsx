import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import SettingsProfileForm from "./SettingsProfileForm"
import SettingsSecurityForm from "./SettingsSecurityForm"
import SettingsDisplayForm from "./SettingsDisplayForm"
import SettingsNotificationsForm from "./SettingsNotificationsForm"
import SettingsPrivacyForm from "./SettingsPrivacyForm"
import { User, Shield, Bell, Monitor, Lock, Trash2 } from "lucide-react"

type Tab = "profile" | "security" | "notifications" | "display" | "privacy" | "delete"

const TABS: { id: Tab; label: string; icon: React.ElementType; href: string }[] = [
  { id: "profile",       label: "Profile",               icon: User,    href: "/settings" },
  { id: "security",      label: "Security",              icon: Shield,  href: "/settings?tab=security" },
  { id: "notifications", label: "Email & notifications", icon: Bell,    href: "/settings?tab=notifications" },
  { id: "display",       label: "Display",               icon: Monitor, href: "/settings?tab=display" },
  { id: "privacy",       label: "Privacy",               icon: Lock,    href: "/settings?tab=privacy" },
  { id: "delete",        label: "Delete account",        icon: Trash2,  href: "/delete-account" },
]

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: Tab }>
}) {
  const params = await searchParams
  const activeTab: Tab = params.tab ?? "profile"
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const uid = user!.id

  const { data: profile } = await supabase
    .from("users")
    .select(
      "full_name, email, licence_number, licence_rating, date_of_birth, country, home_dropzone_id, emergency_contact_name, emergency_contact_relationship, emergency_contact_phone, two_factor_enabled, theme, preferred_altitude_unit, date_format, display_layout_jump_list, offline_mode_enabled, marketing_emails_opt_in"
    )
    .eq("id", uid)
    .maybeSingle()

  // Fetch home dropzone name if set
  let homeDzName: string | null = null
  if (profile?.home_dropzone_id) {
    const { data: dz } = await supabase
      .from("dropzones").select("name").eq("id", profile.home_dropzone_id).maybeSingle()
    homeDzName = dz?.name ?? null
  }

  const profileData = {
    full_name: profile?.full_name ?? "",
    email: profile?.email ?? user?.email ?? "",
    licence_number: profile?.licence_number ?? null,
    licence_rating: profile?.licence_rating ?? null,
    date_of_birth: profile?.date_of_birth ?? null,
    country: profile?.country ?? null,
    home_dropzone_name: homeDzName,
    emergency_contact_name: profile?.emergency_contact_name ?? null,
    emergency_contact_relationship: profile?.emergency_contact_relationship ?? null,
    emergency_contact_phone: profile?.emergency_contact_phone ?? null,
  }

  const securityData = {
    two_factor_enabled: profile?.two_factor_enabled ?? false,
    last_sign_in_at: user?.last_sign_in_at ?? null,
    last_sign_in_platform: null as string | null,
    last_ip: null as string | null,
  }

  const displayData = {
    theme: (profile as Record<string, unknown>)?.theme as string ?? "dark",
    preferred_altitude_unit: (profile as Record<string, unknown>)?.preferred_altitude_unit as string ?? "ft",
    date_format: (profile as Record<string, unknown>)?.date_format as string ?? "DD MMM YYYY",
  }

  const notificationsData = {
    marketing_emails_opt_in: (profile as Record<string, unknown>)?.marketing_emails_opt_in as boolean ?? true,
  }

  const privacyData = {
    offline_mode_enabled: profile?.offline_mode_enabled ?? false,
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <p className="text-overline font-semibold tracking-widest uppercase text-fg-4 mb-1.5">Settings</p>
        <h1 className="text-h1 font-bold text-fg tracking-tight">Account</h1>
      </div>

      <div className="flex gap-6">
        {/* Left nav */}
        <nav className="w-44 flex-shrink-0 space-y-0.5">
          {TABS.map(({ id, label, icon: Icon, href }) => (
            <Link
              key={id}
              href={href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-sm text-sm transition-colors ${
                (id === "profile" && activeTab === "profile") ||
                (id !== "profile" && activeTab === id)
                  ? "bg-sky/10 text-sky font-medium"
                  : id === "delete"
                  ? "text-danger hover:bg-danger-bg"
                  : "text-fg-3 hover:text-fg hover:bg-surface-2"
              }`}
            >
              <Icon className="w-3.5 h-3.5 flex-shrink-0" />
              {label}
            </Link>
          ))}
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0 bg-surface border border-border rounded-lg p-6">
          {activeTab === "profile" && (
            <SettingsProfileForm profile={profileData} userId={uid} />
          )}

          {activeTab === "security" && (
            <SettingsSecurityForm data={securityData} userId={uid} />
          )}

          {activeTab === "notifications" && (
            <SettingsNotificationsForm data={notificationsData} userId={uid} />
          )}

          {activeTab === "display" && (
            <SettingsDisplayForm data={displayData} userId={uid} />
          )}

          {activeTab === "privacy" && (
            <SettingsPrivacyForm />
          )}
        </div>
      </div>
    </div>
  )
}
