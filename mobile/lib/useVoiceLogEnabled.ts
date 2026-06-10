/**
 * useVoiceLogEnabled — resolves whether the voice logging (microphone) feature
 * is available for the current user.
 *
 * Resolution order (highest priority first):
 *   1. Per-user override (users.voice_log_enabled IS NOT NULL)
 *   2. Global flag       (app_config.voice_log_enabled)
 *   3. Default           true (optimistic — avoids flash-hiding the FAB)
 *
 * Subscribes to app_config Realtime so an admin toggle propagates instantly
 * to all connected clients without a restart.
 */
import { useEffect, useRef, useState } from 'react';
import { supabase } from './supabase';

export function useVoiceLogEnabled(): boolean {
  const [enabled, setEnabled] = useState(false);
  // Track current values so realtime can recompute without a full reload
  const globalRef = useRef<boolean>(false);
  const userRef   = useRef<boolean | null>(null); // null = not loaded yet

  useEffect(() => {
    let cancelled = false;

    function compute() {
      // Per-user override (non-null) always wins — even over global disable.
      // null means "inherit global".
      const result = userRef.current !== null ? userRef.current : globalRef.current;
      if (!cancelled) setEnabled(result);
    }

    async function load() {
      // Fetch global flag and user row in parallel
      const [{ data: { user } }, { data: config, error: configErr }] = await Promise.all([
        supabase.auth.getUser().catch(() => ({ data: { user: null } } as any)),
        supabase
          .from('app_config')
          .select('voice_log_enabled')
          .eq('id', 'singleton')
          .single(),
      ]);

      if (cancelled) return;

      console.log('[VoiceLog] app_config row:', JSON.stringify(config), 'err:', configErr?.message);
      globalRef.current = config?.voice_log_enabled ?? false;

      if (user) {
        const { data: userRow, error: userErr } = await supabase
          .from('users')
          .select('voice_log_enabled')
          .eq('id', user.id)
          .single();
        if (cancelled) return;
        console.log('[VoiceLog] user row:', JSON.stringify(userRow), 'err:', userErr?.message);
        // null column value means "inherit global"
        userRef.current = userRow?.voice_log_enabled ?? null;
      } else {
        console.log('[VoiceLog] no authenticated user');
      }

      console.log('[VoiceLog] globalRef:', globalRef.current, 'userRef:', userRef.current);
      compute();
    }

    load();

    // Realtime: app_config changes propagate immediately to all clients
    const channel = supabase
      .channel(`voice_log_flag_watch:${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'app_config', filter: 'id=eq.singleton' },
        (payload) => {
          const row = payload.new as { voice_log_enabled?: boolean };
          globalRef.current = row?.voice_log_enabled ?? false;
          compute();
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  return enabled;
}
