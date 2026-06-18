export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'

export async function POST(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const db = createAdminClient()
  const { data: adminRow } = await db
    .from('admins')
    .select('id, role')
    .eq('email', user.email!)
    .eq('active', true)
    .maybeSingle()
  if (!adminRow) return new Response('Forbidden', { status: 403 })
  if (adminRow.role !== 'super-admin') return new Response('Forbidden', { status: 403 })

  // Fetch user info before deletion (unavailable after)
  const { data: targetAuth } = await db.auth.admin.getUserById(params.id)
  const targetEmail = targetAuth?.user?.email ?? params.id

  // Fetch subscription for Stripe cleanup
  const { data: sub } = await db
    .from('subscriptions')
    .select('stripe_subscription_id, stripe_customer_id, source')
    .eq('user_id', params.id)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Cancel active Stripe subscription and delete customer so no future charges fire
  if (sub?.source !== 'apple') {
    if (sub?.stripe_subscription_id) {
      try {
        await stripe.subscriptions.cancel(sub.stripe_subscription_id)
      } catch { /* already cancelled or not found — ignore */ }
    }
    if (sub?.stripe_customer_id) {
      try {
        await stripe.customers.del(sub.stripe_customer_id)
      } catch { /* already deleted or not found — ignore */ }
    }
  }

  // Collect dropzone IDs from this user's jumps before deletion
  const { data: userJumps } = await db
    .from('jumps')
    .select('dropzone_id')
    .eq('user_id', params.id)
    .not('dropzone_id', 'is', null)
  const dropzoneIds = Array.from(new Set((userJumps ?? []).map(j => j.dropzone_id).filter(Boolean)))

  // Audit record before deletion (user row won't exist after)
  await db.from('audit_log').insert({
    admin_id: adminRow.id,
    action:   'user_deleted',
    target:   `user:${params.id}`,
    reason:   `Account permanently deleted by admin. Email: ${targetEmail}`,
  })

  // Manually delete public-schema rows before calling deleteUser.
  // Supabase's auth.admin.deleteUser returns unexpected_failure when the Postgres
  // cascade encounters any error (trigger, RLS edge-case, ordering conflict).
  // Cleaning up first leaves auth.users with no dependencies so deleteUser is a
  // simple single-row delete that cannot cascade-fail.

  // Tables that reference auth.users(id) directly must be cleared first.
  await db.from('subscription_events').delete().eq('user_id', params.id)
  await db.from('notifications').delete().eq('user_id', params.id)

  // Delete jump children before the jumps themselves.
  const { data: jumpIds } = await db
    .from('jumps')
    .select('id')
    .eq('user_id', params.id)
  const jids = (jumpIds ?? []).map(j => j.id)
  if (jids.length > 0) {
    await db.from('jump_tags').delete().in('jump_id', jids)
    await db.from('jump_people').delete().in('jump_id', jids)
    await db.from('flagged_entries').delete().in('jump_id', jids)
    await db.from('jump_signatures').delete().in('jump_id', jids)
    await db.from('jumps').delete().in('id', jids)
  }

  // Delete remaining public.users children.
  await db.from('gear').delete().eq('user_id', params.id)
  await db.from('certificates').delete().eq('user_id', params.id)
  await db.from('subscriptions').delete().eq('user_id', params.id)
  const { data: tickets } = await db
    .from('support_tickets')
    .select('id')
    .eq('user_id', params.id)
  const tids = (tickets ?? []).map(t => t.id)
  if (tids.length > 0) {
    await db.from('ticket_messages').delete().in('ticket_id', tids)
    await db.from('support_tickets').delete().in('id', tids)
  }
  await db.from('pdf_exports').delete().eq('user_id', params.id)
  await db.from('edit_log').delete().eq('user_id', params.id)
  await db.from('notification_preferences').delete().eq('user_id', params.id)

  // Delete the public.users row (removes the FK that auth.users cascades to).
  await db.from('users').delete().eq('id', params.id)

  // Now delete the auth user — no dependencies remain.
  const { error } = await db.auth.admin.deleteUser(params.id)
  if (error) {
    console.error('[admin/delete] deleteUser failed:', error.message, 'code:', (error as { code?: string }).code)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Delete dropzones that are now orphaned (no jumps and no user home_dropzone_id references)
  for (const dzId of dropzoneIds) {
    const [{ count: jumpRefs }, { count: homeRefs }] = await Promise.all([
      db.from('jumps').select('*', { count: 'exact', head: true }).eq('dropzone_id', dzId),
      db.from('users').select('*', { count: 'exact', head: true }).eq('home_dropzone_id', dzId),
    ])
    if ((jumpRefs ?? 0) === 0 && (homeRefs ?? 0) === 0) {
      await db.from('dropzones').delete().eq('id', dzId)
    }
  }

  revalidatePath('/admin/dashboard')
  revalidatePath('/admin/users')

  return NextResponse.json({ ok: true })
}
