/**
 * useForceUpgrade — subscribes to app_config via Supabase Realtime.
 *
 * Returns { required: boolean, config } in real time. When an admin flips
 * force_upgrade_enabled or changes minimum_version, all connected clients
 * are notified instantly via postgres_changes — no polling, no restart.
 *
 * Version logic: if the running app version is strictly below minimum_version,
 * required = true and the gate is shown.
 */
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from './supabase';

// ─── semver helpers ───────────────────────────────────────────────────────────

/**
 * Parse a version string into 4 numeric parts.
 * Accepts 3-part (1.0.0 → [1,0,0,0]) or 4-part (1.0.0.3 → [1,0,0,3]).
 */
function parseVer(v: string): [number, number, number, number] {
  const parts = (v ?? '0.0.0.0').split('.').map(n => parseInt(n, 10) || 0);
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0, parts[3] ?? 0];
}

/** Returns true if `current` is strictly below `minimum`. */
function isBelow(current: string, minimum: string): boolean {
  const [cMaj, cMin, cPat, cBld] = parseVer(current);
  const [mMaj, mMin, mPat, mBld] = parseVer(minimum);
  if (cMaj !== mMaj) return cMaj < mMaj;
  if (cMin !== mMin) return cMin < mMin;
  if (cPat !== mPat) return cPat < mPat;
  return cBld < mBld;
}

// ─── types ────────────────────────────────────────────────────────────────────

export type UpgradeConfig = {
  title: string;
  message: string;
  storeUrl: string | null;
};

type AppConfigRow = {
  force_upgrade_enabled: boolean;
  minimum_version: string;
  upgrade_title: string;
  upgrade_message: string;
  ios_store_url: string | null;
  android_store_url: string | null;
};

const DEFAULT_CONFIG: UpgradeConfig = {
  title: 'Update Required',
  message: 'A new version of Jump Logs is available. Please update to continue.',
  storeUrl: null,
};

// ─── hook ─────────────────────────────────────────────────────────────────────

/**
 * Returns the full composite version string: "major.minor.patch.build"
 * e.g. "1.0.0.3" — use this everywhere the version is displayed.
 * In Expo Go / dev mode (no native build), returns just "major.minor.patch".
 */
export function getAppVersion(): string {
  const semver = Constants.expoConfig?.version ?? '0.0.0';
  // nativeBuildVersion is set by the native layer in real builds (iOS buildNumber / Android versionCode).
  // Falls back to expoConfig values. Returns null in Expo Go dev mode.
  const buildNum: string | null =
    Constants.nativeBuildVersion ??
    (Platform.OS === 'ios'
      ? (Constants.expoConfig?.ios?.buildNumber ?? null)
      : (Constants.expoConfig?.android?.versionCode != null
          ? String(Constants.expoConfig.android.versionCode)
          : null));
  return buildNum ? `${semver} (${buildNum})` : semver;
}

export function useForceUpgrade(): { required: boolean; config: UpgradeConfig; appVersion: string } {
  const appVersion = getAppVersion();
  const [required, setRequired] = useState(false);
  const [config, setConfig] = useState<UpgradeConfig>(DEFAULT_CONFIG);

  const evaluate = (row: AppConfigRow) => {
    if (!row.force_upgrade_enabled) {
      setRequired(false);
      return;
    }
    const needs = isBelow(appVersion, row.minimum_version ?? '0.0.0');
    setRequired(needs);
    if (needs) {
      setConfig({
        title: row.upgrade_title ?? DEFAULT_CONFIG.title,
        message: row.upgrade_message ?? DEFAULT_CONFIG.message,
        storeUrl: Platform.OS === 'ios'
          ? (row.ios_store_url ?? null)
          : (row.android_store_url ?? null),
      });
    }
  };

  useEffect(() => {
    let cancelled = false;

    // 1. Initial fetch — check immediately on mount
    supabase
      .from('app_config')
      .select('force_upgrade_enabled, minimum_version, upgrade_title, upgrade_message, ios_store_url, android_store_url')
      .eq('id', 'singleton')
      .single()
      .then(({ data }) => {
        if (!cancelled && data) evaluate(data as AppConfigRow);
      });

    // 2. Realtime — fired instantly when admin changes the row
    const channel = supabase
      .channel('app_config_watch')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'app_config',
          filter: 'id=eq.singleton',
        },
        (payload) => {
          if (!cancelled) evaluate(payload.new as AppConfigRow);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  return { required, config, appVersion };
}
