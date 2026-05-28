import { createClient } from '@supabase/supabase-js'

/**
 * Verifies a mobile Bearer JWT by creating a short-lived anon client that
 * sends the token as Authorization: Bearer. This is more reliable than
 * admin.auth.getUser(jwt) with the new sb_secret_ key format in v2.106+.
 */
export async function verifyBearerToken(token: string) {
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  )
  return client.auth.getUser()
}
