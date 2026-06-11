import { useEffect, useState, useCallback, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import type { AnnouncementItem } from '@/components/ui/AnnouncementBanner';

const DISMISSED_KEY = '@jumplogs/dismissed_banners';

async function getLocalDismissed(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(DISMISSED_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

async function saveLocalDismissed(ids: Set<string>): Promise<void> {
  try {
    // Cap stored set at 100 entries to avoid unbounded growth
    const trimmed = Array.from(ids).slice(-100);
    await AsyncStorage.setItem(DISMISSED_KEY, JSON.stringify(trimmed));
  } catch {}
}

/**
 * Returns the oldest unseen in-app banner for the current user, plus a
 * dismiss callback. Returns null when there's nothing to show.
 *
 * Dismissals are persisted in:
 *   1. AsyncStorage (instant, device-local)
 *   2. notification_preferences.dismissed_announcement_ids (synced cross-device)
 *
 * Banners sent before the user's account creation date are never shown
 * (prevents new users from seeing stale historical announcements).
 */
export function useAnnouncementBanner(): {
  announcement: AnnouncementItem | null;
  dismiss: (id: string) => void;
} {
  const [queue,     setQueue]     = useState<AnnouncementItem[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [ready,     setReady]     = useState(false);
  const dismissedRef = useRef<Set<string>>(new Set());

  const fetchBanners = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;

    // Run all fetches in parallel
    const [localDismissed, announcementsResult, prefResult] = await Promise.all([
      getLocalDismissed(),
      supabase
        .from('announcements')
        .select('id, title, body, deep_link')
        .eq('status', 'sent')
        .contains('channels', ['in_app_banner'])
        // Only show banners created on or after the user's signup date so that
        // new users / re-installs don't see historical announcements.
        .gte('sent_at', user?.created_at ?? '1970-01-01T00:00:00Z')
        .order('sent_at', { ascending: true }),
      user
        ? supabase
            .from('notification_preferences')
            .select('dismissed_announcement_ids')
            .eq('user_id', user.id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    // Merge local + server dismissed sets so either source wins
    const serverIds: string[] =
      (prefResult?.data as any)?.dismissed_announcement_ids ?? [];
    const merged = new Set([...localDismissed, ...serverIds]);

    dismissedRef.current = merged;
    setDismissed(merged);
    setQueue((announcementsResult.data ?? []) as AnnouncementItem[]);
    setReady(true);
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  // Re-fetch when app comes to foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') fetchBanners();
    });
    return () => sub.remove();
  }, [fetchBanners]);

  const dismiss = useCallback((id: string) => {
    setDismissed(prev => {
      const next = new Set(prev).add(id);
      dismissedRef.current = next;

      // 1. Persist locally (instant)
      saveLocalDismissed(next);

      // 2. Sync to DB so other devices see the dismissal
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session?.user) return;
        supabase
          .from('notification_preferences')
          .update({ dismissed_announcement_ids: Array.from(next) })
          .eq('user_id', session.user.id)
          .then(null, () => null); // best-effort, ignore errors
      });

      return next;
    });
  }, []);

  if (!ready) return { announcement: null, dismiss };

  const next = queue.find(a => !dismissed.has(a.id)) ?? null;
  return { announcement: next, dismiss };
}

