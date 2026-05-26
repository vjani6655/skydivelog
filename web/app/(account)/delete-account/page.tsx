import { createClient } from "@/lib/supabase/server"
import DeleteAccountForm from "./DeleteAccountForm"

export default async function DeleteAccountPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { count: jumpCount } = await supabase
    .from("jumps")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user!.id)
    .is("deleted_at", null)

  return (
    <div className="p-6 max-w-xl mx-auto">
      <div className="mb-6">
        <p className="text-overline font-semibold tracking-widest uppercase text-fg-4 mb-1.5">
          Settings · Delete account
        </p>
        <h1 className="text-h1 font-bold text-fg tracking-tight">Delete account</h1>
      </div>

      <DeleteAccountForm jumpCount={jumpCount ?? 0} />
    </div>
  )
}
