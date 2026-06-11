import { useState, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView,
  ActivityIndicator, Alert, Share, Linking,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import Constants from 'expo-constants';
import { supabase } from '@/lib/supabase';
import { checkAccess } from '@/lib/checkAccess';
import { spacing, radii } from '@/constants/tokens';
import type { ColorSet } from '@/constants/tokens';
import { useColors } from '@/lib/theme';

const FORMATS     = ['PDF', 'CSV'];
const DATE_RANGES = ['All time', 'This year', 'Last 90 days'];

// In dev on a physical device, replace 'localhost' with the Expo bundler host
// (same machine IP that Metro is running on) so the device can reach the web server.
function resolveWebUrl(): string {
  const base = process.env.EXPO_PUBLIC_WEB_URL ?? 'http://localhost:3000';
  if (!__DEV__ || !base.includes('localhost')) return base;
  // expoConfig.hostUri looks like "192.168.x.x:8081"
  const host =
    (Constants.expoConfig as { hostUri?: string } | null)?.hostUri?.split(':')[0] ??
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Constants as any).manifest?.debuggerHost?.split(':')[0];
  return host ? base.replace('localhost', host) : base;
}

const WEB_URL = resolveWebUrl();

export default function ExportScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [format, setFormat]       = useState('CSV');
  const [range, setRange]         = useState('All time');
  const [jumpCount, setJumpCount] = useState<number | null>(null);
  const [loading, setLoading]     = useState<'single' | 'ten' | 'csv' | null>(null);

  const fetchCount = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    let query = supabase.from('jumps').select('id', { count: 'exact', head: true })
      .eq('user_id', session.user.id).is('deleted_at', null);
    if (range === 'This year') {
      query = query.gte('date', `${new Date().getFullYear()}-01-01`);
    } else if (range === 'Last 90 days') {
      const d = new Date(); d.setDate(d.getDate() - 90);
      query = query.gte('date', d.toISOString().slice(0, 10));
    }
    const { count } = await query;
    setJumpCount(count ?? 0);
  };

  // ── CSV export ────────────────────────────────────────────────────────────
  const handleCsvExport = async () => {
    if (!await checkAccess()) {
      router.push({ pathname: '/paywall', params: { reason: 'trial_expired' } } as any);
      return;
    }
    setLoading('csv');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const COLS = [
        'jump_number', 'date', 'dz_name', 'dz_region',
        'aircraft_type', 'aircraft_rego', 'jump_type', 'jumper_type',
        'exit_altitude_ft', 'pull_altitude_ft', 'deploy_altitude_ft',
        'freefall_seconds', 'canopy_seconds',
        'landing_accuracy_value', 'landing_accuracy_unit',
        'coordinates_lat', 'coordinates_lng', 'notes',
      ] as const;

      const HEADERS: Record<typeof COLS[number], string> = {
        jump_number: 'Jump #', date: 'Date',
        dz_name: 'Dropzone', dz_region: 'Region',
        aircraft_type: 'Aircraft Type', aircraft_rego: 'Aircraft Rego',
        jump_type: 'Jump Type', jumper_type: 'Jumper Category',
        exit_altitude_ft: 'Exit Altitude (ft)', pull_altitude_ft: 'Pull Altitude (ft)',
        deploy_altitude_ft: 'Deploy Altitude (ft)',
        freefall_seconds: 'Freefall (s)', canopy_seconds: 'Canopy (s)',
        landing_accuracy_value: 'Landing Accuracy', landing_accuracy_unit: 'Accuracy Unit',
        coordinates_lat: 'Latitude', coordinates_lng: 'Longitude',
        notes: 'Notes',
      };

      let query = supabase
        .from('jumps')
        .select('jump_number, date, aircraft_type, aircraft_rego, jump_type, jumper_type, exit_altitude_ft, pull_altitude_ft, deploy_altitude_ft, freefall_seconds, canopy_seconds, landing_accuracy_value, landing_accuracy_unit, coordinates_lat, coordinates_lng, notes, dropzones(name, region)')
        .eq('user_id', session.user.id)
        .is('deleted_at', null)
        .order('jump_number', { ascending: true });

      if (range === 'This year') query = query.gte('date', `${new Date().getFullYear()}-01-01`);
      else if (range === 'Last 90 days') {
        const d = new Date(); d.setDate(d.getDate() - 90);
        query = query.gte('date', d.toISOString().slice(0, 10));
      }

      const { data: jumps, error } = await query;
      if (error) throw new Error(error.message);
      const rows = jumps ?? [];

      if (rows.length === 0) {
        Alert.alert('No jumps', 'There are no jumps in the selected date range.');
        return;
      }

      const escape = (v: unknown) => {
        if (v === null || v === undefined) return '';
        const s = String(v);
        return s.includes(',') || s.includes('"') || s.includes('\n')
          ? `"${s.replace(/"/g, '""')}`  + '"'
          : s;
      };

      const headerRow = COLS.map(c => HEADERS[c]).join(',');
      const dataRows = rows.map((r: any) =>
        COLS.map(c => {
          if (c === 'dz_name')   return escape(r.dropzones?.name ?? null);
          if (c === 'dz_region') return escape(r.dropzones?.region ?? null);
          return escape(r[c]);
        }).join(',')
      );
      // Prefix with UTF-8 BOM so Numbers/Excel/iOS detect encoding correctly
      const csv = '\uFEFF' + [headerRow, ...dataRows].join('\n');

      const fileUri = `${FileSystem.cacheDirectory}jumplogs-${Date.now()}.csv`;
      await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType.UTF8 });
      await Share.share({ url: fileUri, title: 'Jump Logs export' });
    } catch (err: unknown) {
      Alert.alert('Export failed', err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(null);
    }
  };

  // ── PDF export ─────────────────────────────────────────────────────────────
  const handlePdfExport = async (layout: 'single' | 'ten') => {
    if (!await checkAccess()) {
      router.push({ pathname: '/paywall', params: { reason: 'trial_expired' } } as any);
      return;
    }
    setLoading(layout);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { Alert.alert('Not signed in'); return; }

      // Collect jump IDs for the selected date range
      let query = supabase.from('jumps').select('id')
        .eq('user_id', session.user.id).is('deleted_at', null)
        .order('jump_number', { ascending: true });
      if (range === 'This year') query = query.gte('date', `${new Date().getFullYear()}-01-01`);
      else if (range === 'Last 90 days') {
        const d = new Date(); d.setDate(d.getDate() - 90);
        query = query.gte('date', d.toISOString().slice(0, 10));
      }
      const { data: jumpRows } = await query;
      const jumpIds = (jumpRows ?? []).map((j: { id: string }) => j.id);

      if (jumpIds.length === 0) {
        Alert.alert('No jumps', 'There are no jumps in the selected date range.');
        return;
      }

      // Call the web API with a Bearer token
      const token = session.access_token;
      const res = await fetch(`${WEB_URL}/api/export/logbook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ jumpIds, layout }),
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || `Server error ${res.status}`);
      }

      // Convert the PDF response to base64 and write to the device cache
      // Note: blob.arrayBuffer() is not supported in Hermes — use res.arrayBuffer() directly
      const arrayBuffer = await res.arrayBuffer();
      const uint8       = new Uint8Array(arrayBuffer);
      let binary = '';
      const CHUNK = 8192;
      for (let i = 0; i < uint8.byteLength; i += CHUNK) {
        binary += String.fromCharCode(...uint8.subarray(i, i + CHUNK));
      }
      const base64  = btoa(binary);
      const fileUri = `${FileSystem.cacheDirectory}jumplogs-export-${Date.now()}.pdf`;
      await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 });

      // Opens the PDF in iOS Quick Look viewer — tap the share icon there to save/print/AirDrop
      await Linking.openURL(fileUri);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const hint = msg.toLowerCase().includes('fetch') || msg.toLowerCase().includes('network')
        ? `\n\nMake sure the web server is running:\ncd web && npm run dev\n\nTarget: ${WEB_URL}`
        : '';
      Alert.alert('Export failed', msg + hint);
    } finally {
      setLoading(null);
    }
  };

  const isPdf = format === 'PDF';

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={colors.fg} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Export logbook</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.sectionTitle}>FORMAT</Text>
        <View style={styles.chipRow}>
          {FORMATS.map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.chip, format === f && styles.chipActive]}
              onPress={() => { setFormat(f); setJumpCount(null); }}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, format === f && styles.chipTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>DATE RANGE</Text>
        <View style={styles.chipRow}>
          {DATE_RANGES.map(r => (
            <TouchableOpacity
              key={r}
              style={[styles.chip, range === r && styles.chipActive]}
              onPress={() => { setRange(r); setJumpCount(null); }}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, range === r && styles.chipTextActive]}>{r}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Preview count */}
        <View style={styles.previewCard}>
          <TouchableOpacity onPress={fetchCount} activeOpacity={0.7}>
            {jumpCount === null ? (
              <Text style={styles.previewHint}>Tap to preview jump count</Text>
            ) : (
              <Text style={styles.previewCount}>{jumpCount} JUMPS</Text>
            )}
          </TouchableOpacity>
          <Text style={styles.previewSub}>{format} · {range}</Text>
        </View>

        {/* ── PDF layout picker ── */}
        {isPdf ? (
          <>
            <Text style={styles.sectionTitle}>PDF LAYOUT</Text>
            <View style={styles.pdfRow}>

              {/* 1-per-page */}
              <TouchableOpacity
                style={[styles.pdfCard, loading === 'single' && styles.pdfCardLoading]}
                onPress={() => handlePdfExport('single')}
                disabled={loading !== null}
                activeOpacity={0.75}
              >
                {/* Mini preview */}
                <View style={styles.miniPage}>
                  <View style={styles.miniHeader} />
                  <View style={styles.miniBigNum} />
                  <View style={styles.miniLine} />
                  <View style={styles.miniGrid}>
                    {[0,1,2,3,4,5].map(i => <View key={i} style={styles.miniCell} />)}
                  </View>
                </View>
                {loading === 'single' ? (
                  <ActivityIndicator size="small" color={colors.sky} style={{ marginTop: spacing[2] }} />
                ) : (
                  <Ionicons name="document-text-outline" size={20} color={colors.sky} style={{ marginTop: spacing[2] }} />
                )}
                <Text style={styles.pdfCardTitle}>
                  {loading === 'single' ? 'Generating…' : '1 jump per page'}
                </Text>
                <Text style={styles.pdfCardSub}>Classic formal{'\n'}Full detail + signature</Text>
              </TouchableOpacity>

              {/* 6-per-page */}
              <TouchableOpacity
                style={[styles.pdfCard, loading === 'ten' && styles.pdfCardLoading]}
                onPress={() => handlePdfExport('ten')}
                disabled={loading !== null}
                activeOpacity={0.75}
              >
                {/* Mini preview */}
                <View style={styles.miniPage}>
                  <View style={styles.miniHeader} />
                  <View style={styles.miniCardGrid}>
                    {[0,1,2,3,4,5,6,7].map(i => <View key={i} style={styles.miniCardCell} />)}
                  </View>
                </View>
                {loading === 'ten' ? (
                  <ActivityIndicator size="small" color={colors.sky} style={{ marginTop: spacing[2] }} />
                ) : (
                  <Ionicons name="grid-outline" size={20} color={colors.sky} style={{ marginTop: spacing[2] }} />
                )}
                <Text style={styles.pdfCardTitle}>
                  {loading === 'ten' ? 'Generating…' : '6 jumps per page'}
                </Text>
                <Text style={styles.pdfCardSub}>Journal cards{'\n'}Compact overview</Text>
              </TouchableOpacity>

            </View>
          </>
        ) : (
          /* CSV / JSON export button */
          <TouchableOpacity
            style={[styles.exportBtn, loading !== null && { opacity: 0.6 }]}
            onPress={handleCsvExport}
            disabled={loading !== null}
            activeOpacity={0.8}
          >
            {loading === 'csv' ? <ActivityIndicator color={colors.onSky} /> : (
              <>
                <Ionicons name="share-outline" size={18} color={colors.onSky} />
                <Text style={styles.exportBtnText}>Export & share</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(c: ColorSet) {
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing[5], paddingVertical: spacing[3], borderBottomWidth: 1, borderBottomColor: c.border },
  backBtn: { width: 36, height: 36, justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontFamily: 'InterTight-SemiBold', fontSize: 17, color: c.fg },
  body: { padding: spacing[5], paddingBottom: spacing[12] },
  sectionTitle: { fontFamily: 'JetBrainsMono-Regular', fontSize: 10, letterSpacing: 0.8, color: c.fg3, marginBottom: spacing[2], marginTop: spacing[4] },
  chipRow: { flexDirection: 'row', gap: spacing[2], marginBottom: spacing[2] },
  chip: { flex: 1, paddingVertical: spacing[3], borderRadius: radii.md, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, alignItems: 'center' },
  chipActive: { borderColor: c.sky, backgroundColor: 'rgba(74,158,255,0.08)' },
  chipText: { fontFamily: 'InterTight-Medium', fontSize: 13, color: c.fg2 },
  chipTextActive: { color: c.sky },
  previewCard: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: radii.lg, padding: spacing[6], alignItems: 'center', marginTop: spacing[4], marginBottom: spacing[5] },
  previewHint: { fontFamily: 'InterTight-Regular', fontSize: 14, color: c.fg3 },
  previewCount: { fontFamily: 'InterTight-Bold', fontSize: 36, color: c.fg, letterSpacing: -1 },
  previewSub: { fontFamily: 'JetBrainsMono-Regular', fontSize: 11, color: c.fg3, marginTop: spacing[2] },
  exportBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: c.sky, borderRadius: radii.md, paddingVertical: spacing[4], gap: spacing[2] },
  exportBtnText: { fontFamily: 'InterTight-SemiBold', fontSize: 15, color: c.onSky },

  // PDF layout picker
  pdfRow: { flexDirection: 'row', gap: spacing[3] },
  pdfCard: {
    flex: 1,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: radii.lg,
    padding: spacing[4],
    alignItems: 'center',
  },
  pdfCardLoading: { borderColor: c.sky, backgroundColor: 'rgba(74,158,255,0.06)' },
  pdfCardTitle: { fontFamily: 'InterTight-SemiBold', fontSize: 13, color: c.fg, marginTop: spacing[2], textAlign: 'center' },
  pdfCardSub: { fontFamily: 'InterTight-Regular', fontSize: 11, color: c.fg3, marginTop: spacing[1], textAlign: 'center', lineHeight: 16 },

  // Mini page preview (1-per-page card)
  miniPage: { width: '100%', aspectRatio: 0.707, backgroundColor: '#FAFAF7', borderRadius: 3, padding: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  miniHeader: { height: 4, backgroundColor: '#1A1A1A', borderRadius: 1, marginBottom: 5, width: '60%' },
  miniBigNum: { height: 12, backgroundColor: '#0A1220', borderRadius: 2, width: '30%', marginBottom: 5 },
  miniLine: { height: 1, backgroundColor: '#1A1A1A', marginBottom: 5 },
  miniGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 3 },
  miniCell: { width: '30%', height: 6, backgroundColor: '#D8D4C8', borderRadius: 1 },

  // Mini card grid (10-per-page card)
  miniCardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 3, marginTop: 4 },
  miniCardCell: { width: '47%', height: 14, backgroundColor: '#D8D4C8', borderRadius: 2 },
  });
}
