"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"

interface ProfileData {
  full_name: string
  email: string
  licence_number: string | null
  licence_rating: string | null
  date_of_birth: string | null
  country: string | null
  home_dropzone_name: string | null
  emergency_contact_name: string | null
  emergency_contact_relationship: string | null
  emergency_contact_phone: string | null
}

export async function updateProfile(userId: string, data: ProfileData) {
  try {
    const supabase = createAdminClient()

    // Resolve home dropzone name → id
    let homeDzId: string | null = null
    if (data.home_dropzone_name?.trim()) {
      const { data: existing } = await supabase
        .from("dropzones").select("id").ilike("name", data.home_dropzone_name.trim()).limit(1).maybeSingle()
      if (existing) {
        homeDzId = existing.id
      } else {
        const { data: newDz } = await supabase
          .from("dropzones").insert({ name: data.home_dropzone_name.trim(), region: "" }).select("id").single()
        if (newDz) homeDzId = newDz.id
      }
    }

    const { error } = await supabase
      .from("users")
      .update({
        full_name: data.full_name,
        email: data.email,
        licence_number: data.licence_number,
        licence_rating: data.licence_rating,
        date_of_birth: data.date_of_birth,
        country: data.country,
        home_dropzone_id: homeDzId,
        emergency_contact_name: data.emergency_contact_name,
        emergency_contact_relationship: data.emergency_contact_relationship,
        emergency_contact_phone: data.emergency_contact_phone,
      })
      .eq("id", userId)

    if (error) return { error: error.message }
    return { success: true }
  } catch {
    return { error: "Something went wrong. Please try again." }
  }
}

// ── Display preferences ───────────────────────────────────────────────────────
export interface DisplayPrefs {
  theme: string
  preferred_altitude_unit: string
  date_format: string
  display_layout_jump_list?: string
}

export async function updateDisplayPrefs(userId: string, data: DisplayPrefs) {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase.from("users").update({
      theme: data.theme,
      preferred_altitude_unit: data.preferred_altitude_unit,
      date_format: data.date_format,
      ...(data.display_layout_jump_list ? { display_layout_jump_list: data.display_layout_jump_list } : {}),
    }).eq("id", userId)
    if (error) return { error: error.message }

    // Persist to cookies so server components pick them up immediately
    const cookieStore = await cookies()
    const cookieOpts = { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" as const }
    cookieStore.set("pref_theme", data.theme, cookieOpts)
    cookieStore.set("pref_date_format", data.date_format, cookieOpts)
    cookieStore.set("pref_altitude_unit", data.preferred_altitude_unit, cookieOpts)

    return { success: true }
  } catch {
    return { error: "Something went wrong." }
  }
}

// ── Security ──────────────────────────────────────────────────────────────────
export async function updateTwoFactor(userId: string, enabled: boolean) {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase.from("users").update({ two_factor_enabled: enabled }).eq("id", userId)
    if (error) return { error: error.message }
    return { success: true }
  } catch {
    return { error: "Something went wrong." }
  }
}

export async function signOutAllSessions() {
  try {
    const supabase = await createClient()
    await supabase.auth.signOut({ scope: "global" })
    return { success: true }
  } catch {
    return { error: "Something went wrong." }
  }
}

// ── Notifications ─────────────────────────────────────────────────────────────
export interface NotificationPrefs {
  marketing_emails_opt_in: boolean
}

export async function updateNotificationPrefs(userId: string, data: NotificationPrefs) {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase.from("users").update({
      marketing_emails_opt_in: data.marketing_emails_opt_in,
    } as Record<string, unknown>).eq("id", userId)
    if (error) return { error: error.message }
    return { success: true }
  } catch {
    return { error: "Something went wrong." }
  }
}

// ── Privacy ───────────────────────────────────────────────────────────────────
export async function updatePrivacyPrefs(userId: string, offlineModeEnabled: boolean) {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase.from("users").update({
      offline_mode_enabled: offlineModeEnabled,
    }).eq("id", userId)
    if (error) return { error: error.message }
    return { success: true }
  } catch {
    return { error: "Something went wrong." }
  }
}
