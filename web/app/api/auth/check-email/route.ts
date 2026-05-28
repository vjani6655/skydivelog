export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  let email: string
  try {
    const body = await req.json()
    email = typeof body.email === 'string' ? body.email.toLowerCase().trim() : ''
  } catch {
    return NextResponse.json({ exists: false })
  }

  if (!email) return NextResponse.json({ exists: false })

  const admin = createAdminClient()
  // listUsers paginates at 1000 per page — fine for our user base
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 })
  if (error) return NextResponse.json({ exists: false })

  const exists = data.users.some(u => u.email?.toLowerCase() === email)
  return NextResponse.json({ exists })
}
