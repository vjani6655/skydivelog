"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function toggleFavourite(jumpId: string, currentValue: boolean) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return { error: "Not authenticated" }

  const { error } = await supabase
    .from("jumps")
    .update({ is_favourite: !currentValue })
    .eq("id", jumpId)
    .eq("user_id", user.id)

  if (error) return { error: error.message }

  revalidatePath(`/logbook/${jumpId}`)
  revalidatePath("/logbook")
  return { ok: true, newValue: !currentValue }
}
