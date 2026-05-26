import { createClient } from '@supabase/supabase-js'

/** Service-role client — bypasses all RLS. Server-side only. Never expose to browser. */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        // Prevent Next.js data cache from serving stale Supabase responses
        fetch: (url: RequestInfo | URL, init: RequestInit = {}) =>
          fetch(url, { ...init, cache: 'no-store' }),
      },
    },
  )
}
