/**
 * UserPrefsContext — provides display preferences (altitude unit, date format, theme)
 * across the mobile app. Loads from AsyncStorage immediately, then syncs from DB.
 */
import { createContext, useContext, useEffect, useState } from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';

export type AltUnit = 'ft' | 'm';
export type DateFmt = 'DD MMM YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
export type ThemePref = 'dark' | 'light' | 'system';

export interface UserPrefs {
  altUnit: AltUnit;
  dateFormat: DateFmt;
  theme: ThemePref;
}

const DEFAULTS: UserPrefs = { altUnit: 'ft', dateFormat: 'DD MMM YYYY', theme: 'dark' };
const STORAGE_KEY = '@jumplogs/display_prefs';

interface PrefsCtx {
  prefs: UserPrefs;
  updatePrefs: (next: Partial<UserPrefs>) => Promise<void>;
}

const Context = createContext<PrefsCtx>({ prefs: DEFAULTS, updatePrefs: async () => {} });

export function usePrefs() {
  return useContext(Context);
}

/** Format a YYYY-MM-DD date string per the user's date format preference. */
export function fmtDate(iso: string | null | undefined, fmt: DateFmt): string {
  if (!iso) return '—';
  const [year, month, day] = iso.slice(0, 10).split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  switch (fmt) {
    case 'MM/DD/YYYY':
      return `${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}/${year}`;
    case 'YYYY-MM-DD':
      return iso.slice(0, 10);
    case 'DD MMM YYYY':
    default:
      return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  }
}

/** Format altitude (ft) per the user's unit preference. */
export function fmtAlt(ft: number | null | undefined, unit: AltUnit): string {
  if (ft == null) return '—';
  if (unit === 'm') return `${Math.round(ft * 0.3048)}m`;
  return `${Math.round(ft / 1000)}k`;
}

/** Format altitude with full label, e.g. "14,000 ft" or "4,267 m" */
export function fmtAltFull(ft: number | null | undefined, unit: AltUnit): string {
  if (ft == null) return '—';
  if (unit === 'm') return `${Math.round(ft * 0.3048).toLocaleString()} m`;
  return `${ft.toLocaleString()} ft`;
}

/**
 * Raw numeric altitude string for TelCell value (no unit suffix).
 * e.g. 14000 ft → "14,000", 14000 ft in m → "4,267"
 */
export function altNumStr(ft: number | null | undefined, unit: AltUnit): string {
  if (ft == null) return '—';
  if (unit === 'm') return Math.round(ft * 0.3048).toLocaleString();
  return ft.toLocaleString();
}

/**
 * Compact altitude with unit suffix for mini telemetry cells.
 * e.g. 14000 ft → "14k ft", 14000 ft in m → "4.3k m"
 */
export function fmtAltMini(ft: number | null | undefined, unit: AltUnit): string {
  if (ft == null) return '—';
  if (unit === 'm') {
    const m = Math.round(ft * 0.3048);
    return m >= 1000 ? `${Math.round(m / 100) / 10}k m` : `${m} m`;
  }
  return ft >= 1000 ? `${Math.round(ft / 1000)}k ft` : `${ft} ft`;
}

/**
 * Format a timestamp string for jump detail views.
 * Shows: "Sat 26 May 2026 · 14:30" (date part respects user's date format).
 */
export function fmtDetailDate(iso: string | null | undefined, fmt: DateFmt): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const datePart = fmtDate(iso.slice(0, 10), fmt);
  return `${days[d.getDay()]} ${datePart} · ${hh}:${mm}`;
}

function applyTheme(theme: ThemePref) {
  if (theme === 'system') {
    Appearance.setColorScheme(null);
  } else {
    Appearance.setColorScheme(theme);
  }
}

export function UserPrefsProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<UserPrefs>(DEFAULTS);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // 1. Load cached prefs first (fast path)
      const cached = await AsyncStorage.getItem(STORAGE_KEY).catch(() => null);
      if (cached && !cancelled) {
        const parsed = JSON.parse(cached) as UserPrefs;
        setPrefs(parsed);
        applyTheme(parsed.theme);
      }
      // 2. Sync from DB
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user || cancelled) return;
      const { data } = await supabase
        .from('users')
        .select('preferred_altitude_unit, date_format, theme')
        .eq('id', session.user.id)
        .single();
      if (data && !cancelled) {
        const next: UserPrefs = {
          altUnit: (data.preferred_altitude_unit ?? 'ft') as AltUnit,
          dateFormat: (data.date_format ?? 'DD MMM YYYY') as DateFmt,
          theme: (data.theme ?? 'dark') as ThemePref,
        };
        setPrefs(next);
        applyTheme(next.theme);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => null);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const updatePrefs = async (updates: Partial<UserPrefs>) => {
    const next = { ...prefs, ...updates };
    setPrefs(next);
    applyTheme(next.theme);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => null);
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await supabase.from('users').update({
        preferred_altitude_unit: next.altUnit,
        date_format: next.dateFormat,
        theme: next.theme,
      }).eq('id', session.user.id);
    }
  };

  return <Context.Provider value={{ prefs, updatePrefs }}>{children}</Context.Provider>;
}
