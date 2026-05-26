import AsyncStorage from '@react-native-async-storage/async-storage';
import type { JumpFull } from './types';

const QUEUE_KEY = '@jumplogs/offline_jump_queue';

export interface QueuedJumpSignature {
  signature_data: string;
  signer_name: string;
  signer_licence_number: string;
  signer_user_id: string;
  outcome: string | null;
  notes: string | null;
}

export interface QueuedJump {
  localId: string;
  payload: Record<string, any>;
  signature?: QueuedJumpSignature;
  createdAt: string;
}

/** Persist a jump payload (and optional signature) locally when the network is unavailable. */
export async function enqueueJump(
  payload: Record<string, any>,
  signature?: QueuedJumpSignature,
): Promise<string> {
  const localId = `local_${Date.now()}`;
  const queue = await getRawQueue();
  queue.push({ localId, payload, signature, createdAt: new Date().toISOString() });
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  return localId;
}

export async function getRawQueue(): Promise<QueuedJump[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function removeFromQueue(localId: string): Promise<void> {
  const queue = await getRawQueue();
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue.filter(j => j.localId !== localId)));
}

/** Try to push every queued jump (and its signature) to Supabase. Stops on first network failure. */
export async function trySyncQueue(supabase: any): Promise<void> {
  const queue = await getRawQueue();
  for (const item of queue) {
    try {
      // Check first: the jump may already be in the DB if a previous sync attempt
      // succeeded at the server but the response never reached the client (flaky
      // network). Without this guard every fetchAll would create another duplicate.
      const { data: existing, error: checkError } = await supabase
        .from('jumps')
        .select('id')
        .eq('user_id', item.payload.user_id)
        .eq('jump_number', item.payload.jump_number)
        .is('deleted_at', null)
        .maybeSingle();

      if (checkError && isOfflineError(checkError.message)) {
        break; // can't reach DB — stop trying
      }

      if (!existing) {
        // Not in DB yet — insert it
        const { error: insertError } = await supabase.from('jumps').insert(item.payload);
        if (insertError) {
          if (isOfflineError(insertError.message)) break;
          continue; // other DB error — leave in queue, try next item
        }
      }

      // Jump is now in DB (either pre-existing or just inserted) — safe to remove
      await removeFromQueue(item.localId);

      // Best-effort: attach signature
      if (item.signature) {
        // Prefer the id we already fetched; only query when we had to do a fresh insert
        let jumpId: string | undefined = existing?.id;
        if (!jumpId) {
          const { data: jumpRow } = await supabase
            .from('jumps')
            .select('id')
            .eq('user_id', item.payload.user_id)
            .eq('jump_number', item.payload.jump_number)
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          jumpId = jumpRow?.id;
        }
        if (jumpId) {
          await supabase.from('signatures').insert({
            jump_id: jumpId,
            ...item.signature,
          }).then(null, () => null);
        }
      }
    } catch {
      break;
    }
  }
}

/** Convert a locally-queued jump into a JumpFull shape for display in the list. */
export function queuedToJumpFull(item: QueuedJump): JumpFull {
  const p = item.payload;
  return {
    id: item.localId,
    _localId: item.localId,
    _synced: false,
    user_id: p.user_id ?? '',
    jump_number: p.jump_number ?? 0,
    date: typeof p.date === 'string' ? p.date.slice(0, 10) : item.createdAt.slice(0, 10),
    dropzone_id: p.dropzone_id ?? null,
    aircraft_type: p.aircraft_type ?? null,
    aircraft_rego: p.aircraft_rego ?? null,
    exit_altitude_ft: p.exit_altitude_ft ?? null,
    pull_altitude_ft: p.pull_altitude_ft ?? null,
    deploy_altitude_ft: p.deploy_altitude_ft ?? null,
    freefall_seconds: p.freefall_seconds ?? null,
    canopy_seconds: p.canopy_seconds ?? null,
    jump_type: p.jump_type ?? null,
    jumper_type: p.jumper_type ?? null,
    is_favourite: p.is_favourite ?? false,
    is_draft: false,
    notes: p.notes ?? null,
    landing_accuracy_value: p.landing_accuracy_value ?? null,
    landing_accuracy_unit: p.landing_accuracy_unit ?? null,
    photo_url: null,
    coordinates_lat: null,
    coordinates_lng: null,
    created_at: item.createdAt,
    updated_at: item.createdAt,
    deleted_at: null,
    dropzones: null,
  };
}

/** Returns true when an error message indicates a network / fetch failure. */
export function isOfflineError(message: string | undefined): boolean {
  return /fetch failed|failed to fetch|network request failed|networkerror|fetcherror|internet connection|appears to be offline/i.test(message ?? '');
}
