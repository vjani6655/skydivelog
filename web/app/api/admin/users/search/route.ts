export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  // Verify admin
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const db = createAdminClient()
  const { data: adminRow } = await db
    .from('admins')
    .select('id')
    .eq('email', user.email!)
    .eq('active', true)
    .maybeSingle()
  if (!adminRow) return new Response('Forbidden', { status: 403 })

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim() ?? ''

  let query = db
    .from('users')
    .select('id, full_name, email, licence_number')
    .order('full_name', { ascending: true })
    .limit(50)

  if (q) {
    query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%,licence_number.ilike.%${q}%`)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data ?? [])
}
