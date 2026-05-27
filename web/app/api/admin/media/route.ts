export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const BUCKET = 'app-media'
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 10 * 1024 * 1024 // 10 MB

/** Verify the caller is an active admin. Returns the adminRow or null. */
async function getAdminRow() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const db = createAdminClient()
  const { data } = await db
    .from('admins')
    .select('id')
    .eq('email', user.email!)
    .eq('active', true)
    .maybeSingle()
  return data ?? null
}

/** POST /api/admin/media — upload an image for a slot */
export async function POST(request: Request) {
  const admin = await getAdminRow()
  if (!admin) return new Response('Unauthorized', { status: 401 })

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const slot = (formData.get('slot') as string | null)?.trim()
  const file = formData.get('file') as File | null

  if (!slot) return NextResponse.json({ error: 'slot is required' }, { status: 400 })
  if (!file) return NextResponse.json({ error: 'file is required' }, { status: 400 })
  if (!ALLOWED_MIME.includes(file.type)) {
    return NextResponse.json({ error: 'Only JPEG, PNG and WebP images are accepted' }, { status: 415 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File exceeds 10 MB limit' }, { status: 413 })
  }

  const db = createAdminClient()

  // Validate slot exists in the table
  const { data: existing } = await db
    .from('app_media')
    .select('slot')
    .eq('slot', slot)
    .maybeSingle()
  if (!existing) return NextResponse.json({ error: 'Unknown slot' }, { status: 400 })

  // Determine file extension
  const ext = file.type === 'image/webp' ? 'webp' : file.type === 'image/png' ? 'png' : 'jpg'
  const path = `${slot}.${ext}`

  // Upload to Supabase Storage (upsert)
  const arrayBuffer = await file.arrayBuffer()
  const { error: storageError } = await db.storage
    .from(BUCKET)
    .upload(path, arrayBuffer, {
      contentType: file.type,
      upsert: true,
    })

  if (storageError) {
    return NextResponse.json({ error: storageError.message }, { status: 500 })
  }

  // Get public URL
  const { data: { publicUrl } } = db.storage.from(BUCKET).getPublicUrl(path)

  // Add cache-busting param so browsers re-fetch after replacement
  const url = `${publicUrl}?t=${Date.now()}`

  // Update app_media table
  const { error: dbError } = await db
    .from('app_media')
    .update({ url, updated_at: new Date().toISOString() })
    .eq('slot', slot)

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json({ url })
}

/** DELETE /api/admin/media?slot=xxx — remove the image for a slot */
export async function DELETE(request: Request) {
  const admin = await getAdminRow()
  if (!admin) return new Response('Unauthorized', { status: 401 })

  const { searchParams } = new URL(request.url)
  const slot = searchParams.get('slot')?.trim()
  if (!slot) return NextResponse.json({ error: 'slot is required' }, { status: 400 })

  const db = createAdminClient()

  // Fetch current record to find the file path
  const { data: record } = await db
    .from('app_media')
    .select('url')
    .eq('slot', slot)
    .maybeSingle()

  if (record?.url) {
    // Extract path from URL (everything after /object/public/app-media/)
    const match = record.url.match(/\/object\/public\/app-media\/([^?]+)/)
    if (match) {
      await db.storage.from(BUCKET).remove([match[1]])
    }
  }

  // Clear URL in DB
  const { error } = await db
    .from('app_media')
    .update({ url: null, updated_at: new Date().toISOString() })
    .eq('slot', slot)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
