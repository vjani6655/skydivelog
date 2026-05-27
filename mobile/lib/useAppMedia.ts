/**
 * useAppMedia — fetches a media slot URL from the app_media table.
 *
 * Returns immediately from the in-memory cache if the splash screen
 * already prefetched the slot; otherwise fetches on mount.
 * A null return means the image hasn't loaded yet — callers should
 * show the stripe placeholder instead.
 */

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getCachedMedia, setCachedMedia } from '@/lib/mediaCache'

export function useAppMedia(slot: string): string | null {
  const [url, setUrl] = useState<string | null>(getCachedMedia(slot))

  useEffect(() => {
    // Already in cache — nothing to fetch
    if (getCachedMedia(slot)) return

    let cancelled = false
    supabase
      .from('app_media')
      .select('url')
      .eq('slot', slot)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data?.url) {
          setCachedMedia(slot, data.url)
          setUrl(data.url)
        }
      })
    return () => { cancelled = true }
  }, [slot])

  return url
}
