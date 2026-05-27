/**
 * useAppMedia — fetches a media slot URL from the app_media table.
 *
 * The URL is fetched once on mount (and whenever the component re-mounts),
 * which means it will pick up new images the next time the user opens the app.
 * A null return means the image hasn't been uploaded yet — callers should
 * show the stripe placeholder instead.
 */

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export function useAppMedia(slot: string): string | null {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    supabase
      .from('app_media')
      .select('url')
      .eq('slot', slot)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data?.url) setUrl(data.url)
      })
    return () => { cancelled = true }
  }, [slot])

  return url
}
