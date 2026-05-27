/**
 * Simple in-memory URL cache for app_media slots.
 * Populated by the splash screen so screens render immediately
 * without waiting for a Supabase round-trip.
 */

const cache = new Map<string, string>()

export function getCachedMedia(slot: string): string | null {
  return cache.get(slot) ?? null
}

export function setCachedMedia(slot: string, url: string): void {
  cache.set(slot, url)
}
