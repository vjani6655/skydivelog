import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import AccountSidebar from "@/components/AccountSidebar"
import PrefsSyncer from "@/components/PrefsSyncer"

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("users")
    .select("full_name, licence_number, theme, preferred_altitude_unit, date_format")
    .eq("id", user.id)
    .maybeSingle()

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan, renews_at, status")
    .eq("user_id", user.id)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  const fullName = profile?.full_name || user.email?.split("@")[0] || "User"
  const isPro = sub?.status === "active"

  return (
    <div className="min-h-screen bg-bg flex">
      <PrefsSyncer
        theme={profile?.theme ?? "dark"}
        dateFormat={profile?.date_format ?? "DD MMM YYYY"}
        altUnit={profile?.preferred_altitude_unit ?? "ft"}
      />
      <AccountSidebar
        fullName={fullName}
        licenceNumber={profile?.licence_number ?? null}
        plan={isPro ? (sub?.plan?.startsWith('price_') ? 'annual' : (sub?.plan ?? 'annual')) : null}
        renewsAt={isPro ? sub?.renews_at ?? null : null}
      />
      <main className="flex-1 min-w-0 overflow-auto px-12 py-8">
        {children}
      </main>
    </div>
  )
}
