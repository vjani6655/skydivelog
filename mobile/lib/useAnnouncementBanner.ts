import { useEffect, useState, useCallback, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import type { AnnouncementItem } from '@/components/ui/AnnouncementBanner';

const DISMISSED_KEY = '@jumplogs/dismissed_banners';

async function getDismissed(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(DISMISSED_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

async function saveDismissed(ids: Set<string>): Promise<void> {
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
 * Fetches once on mount. The RLS policy on `announcements` already filters
 * to `status = 'sent' AND 'in_app_banner' = any(channels)`.
 */
export function useAnnouncementBanner(): {
  announcement: AnnouncementItem | null;
  dismiss: (id: string) => void;
} {
  const [queue,        setQueue]        = useState<AnnouncementItem[]>([]);
  const [dismissed,    setDismissed]    = useState<Set<string>>(new Set());
  const [ready,        setReady]        = useState(false);
  const dismissedRef = useRef<Set<string>>(new Set());

  const fetchBanners = useCallback(async () => {
    const [seenIds, { data, error: _err }] = await Promise.all([
      getDismissed(),
      supabase
        .from('announcements')
        .select('id, title, body, deep_link')
        .eq('status', 'sent')
        .contains('channels', ['in_app_banner'])
        .order('sent_at', { ascending: true }),
    ]);
    dismissedRef.current = seenIds;
    setDismissed(seenIds);
    setQueue((data ?? []) as AnnouncementItem[]);
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
      saveDismissed(next);
      return next;
    });
  }, []);

  if (!ready) return { announcement: null, dismiss };

  const next = queue.find(a => !dismissed.has(a.id)) ?? null;
  return { announcement: next, dismiss };
}
