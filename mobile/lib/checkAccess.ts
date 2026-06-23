import { supabase } from '@/lib/supabase';

/**
 * Returns true if the current user has an active subscription or is within
 * their free trial window. Returns false if trial expired or cancelled out
 * of grace period — the caller should redirect to /paywall.
 */
export async function checkAccess(): Promise<boolean> {
  // Refresh session so user_metadata (trial_ends_at) reflects latest admin changes
  await supabase.auth.refreshSession().catch(() => null);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: adminFlag } = await supabase.rpc('is_admin');
  if (adminFlag === true) return true;

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('status, renews_at')
    .eq('user_id', user.id)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const cancelledInGrace =
    sub?.status === 'cancelled' &&
    !!sub?.renews_at &&
    new Date(sub.renews_at) > new Date();

  const subActive =
    sub?.status === 'active' ||
    sub?.status === 'overdue' ||
    cancelledInGrace;

  if (subActive) return true;

  const trialEndsAt = user.user_metadata?.trial_ends_at as string | undefined;
  const trialEnd = (() => {
    if (trialEndsAt) { const d = new Date(trialEndsAt); if (!isNaN(d.getTime())) return d; }
    return new Date(new Date(user.created_at).getTime() + 14 * 86400000);
  })();

  const noActiveSub = !sub || sub.status === 'trial';
  return noActiveSub && Date.now() < trialEnd.getTime();
}
