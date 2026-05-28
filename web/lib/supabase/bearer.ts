import { createClient } from '@supabase/supabase-js'

/**
 * Verifies a mobile Bearer JWT by passing it explicitly to getUser(token).
 * Uses the anon key as apikey (standard client pattern), bypassing any
 * session storage, so the JWT is verified directly against /auth/v1/user.
 */
export async function verifyBearerToken(token: string) {
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  )
  return client.auth.getUser(token)
}
