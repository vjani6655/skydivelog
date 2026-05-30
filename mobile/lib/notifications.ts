import type * as NotificationsType from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SupabaseClient } from '@supabase/supabase-js';

const PUSH_TOKEN_KEY = '@jumplogs/push_token';

// Lazy-load expo-notifications — the static import throws in Expo Go / old dev
// builds where the ExpoPushTokenManager native module isn't compiled in.
let Notifications: typeof NotificationsType | null = null;
try {
  Notifications = require('expo-notifications');
  Notifications?.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
} catch {
  // expo-notifications native module not available in this environment
}

export interface NotifPrefs {
  jump_logged: boolean;
  weekly_recap: boolean;
  cert_expiry: boolean;
  repack_due: boolean;
  currency_alert: boolean;
  announcements: boolean;
}

/** The default prefs applied optimistically before DB load completes. */
export const DEFAULT_PREFS: NotifPrefs = {
  jump_logged: true,
  weekly_recap: true,
  cert_expiry: true,
  repack_due: true,
  currency_alert: true,
  announcements: false,
};

// Maps NotifPrefs keys → DB column names
const DB_FIELD: Record<keyof NotifPrefs, string> = {
  jump_logged: 'jump_logged',
  weekly_recap: 'weekly_recap',
  cert_expiry: 'expiry_warnings',
  repack_due: 'repack_reminders',
  currency_alert: 'currency_alerts',
  announcements: 'announcements',
};

/**
 * Request push permission, obtain an Expo push token, and persist it to both
 * AsyncStorage (for local use) and the notification_preferences row in Supabase.
 *
 * Safe to call multiple times — it upserts on conflict.
 * Silently swallows all errors: push token is non-critical.
 */
export async function registerPushToken(
  supabase: SupabaseClient,
  userId: string,
): Promise<string | null> {
  try {
    if (!Notifications) return null; // native module not available

    // Android requires a named channel before requestPermissionsAsync
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Jump Logs',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return null;

    // EAS sets projectId automatically; fall back for local dev
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      (Constants as any)?.easConfig?.projectId;

    if (!projectId) return null; // local Expo Go dev — skip

    const { data: tokenData } = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenData;

    await AsyncStorage.setItem(PUSH_TOKEN_KEY, token).catch(() => null);

    // Clear this token from any other user who previously held it (e.g. after
    // signing into a different account on the same device), then claim it.
    await supabase
      .from('notification_preferences')
      .update({ push_token: null })
      .eq('push_token', token)
      .neq('user_id', userId);

    await supabase
      .from('notification_preferences')
      .upsert({ user_id: userId, push_token: token }, { onConflict: 'user_id' });

    return token;
  } catch {
    return null;
  }
}

/** Return the cached local push token (fast, no network). */
export async function getCachedPushToken(): Promise<string | null> {
  return AsyncStorage.getItem(PUSH_TOKEN_KEY).catch(() => null);
}

/** Load notification preferences from Supabase. */
export async function loadNotifPrefs(
  supabase: SupabaseClient,
  userId: string,
): Promise<NotifPrefs | null> {
  const { data } = await supabase
    .from('notification_preferences')
    .select(
      'jump_logged, weekly_recap, expiry_warnings, repack_reminders, currency_alerts, announcements',
    )
    .eq('user_id', userId)
    .maybeSingle();

  if (!data) return null;

  return {
    jump_logged: data.jump_logged,
    weekly_recap: data.weekly_recap,
    cert_expiry: data.expiry_warnings,
    repack_due: data.repack_reminders,
    currency_alert: data.currency_alerts,
    announcements: data.announcements,
  };
}

/** Persist a single preference toggle to Supabase. */
export async function saveNotifPref(
  supabase: SupabaseClient,
  userId: string,
  key: keyof NotifPrefs,
  value: boolean,
): Promise<void> {
  await supabase
    .from('notification_preferences')
    .upsert({ user_id: userId, [DB_FIELD[key]]: value }, { onConflict: 'user_id' });
}

// ─── Notification inbox ──────────────────────────────────────────────────────

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  read: boolean;
  created_at: string;
}

export async function fetchNotifications(
  supabase: SupabaseClient,
  userId: string,
): Promise<NotificationItem[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, title, body, data, read, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return (data ?? []) as NotificationItem[];
}

export async function markNotificationRead(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  await supabase.from('notifications').update({ read: true }).eq('id', id);
}

export async function markAllNotificationsRead(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false);
}

export async function getUnreadCount(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false);
  return count ?? 0;
}
