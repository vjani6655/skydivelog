import { useState, useMemo, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  ActivityIndicator, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import Constants from 'expo-constants';
import { supabase } from '@/lib/supabase';
import { checkAccess } from '@/lib/checkAccess';
import { spacing, radii } from '@/constants/tokens';
import type { ColorSet } from '@/constants/tokens';
import { useColors } from '@/lib/theme';
import Toggle from '@/components/ui/Toggle';
import { JUMP_TYPES } from '@/lib/jumpTypes';
import { CollapsibleChipRow } from '@/components/log/CollapsibleChipRow';
import type { TagData } from '@/lib/types';

const DATE_RANGES = ['All time', 'This year', 'Last 90 days', 'This month', 'Custom'] as const;
type DateRange = typeof DATE_RANGES[number];

function resolveWebUrl(): string {
  const base = process.env.EXPO_PUBLIC_WEB_URL ?? 'https://www.jumplogs.com';
  if (!__DEV__ || !base.includes('localhost')) return base;
  const host =
    (Constants.expoConfig as { hostUri?: string } | null)?.hostUri?.split(':')[0] ??
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Constants as any).manifest?.debuggerHost?.split(':')[0];
  return host ? base.replace('localhost', host) : base;
}

const WEB_URL = resolveWebUrl();

function fmtDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getDateBounds(range: DateRange, from: Date, to: Date) {
  if (range === 'This year') return { gte: `${new Date().getFullYear()}-01-01`, lte: undefined };
  if (range === 'Last 90 days') {
    const d = new Date(); d.setDate(d.getDate() - 90);
    return { gte: d.toISOString().slice(0, 10), lte: undefined };
  }
  if (range === 'This month') {
    const n = new Date();
    return { gte: `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-01`, lte: undefined };
  }
  if (range === 'Custom') {
    return { gte: from.toISOString().slice(0, 10), lte: to.toISOString().slice(0, 10) };
  }
  return { gte: undefined, lte: undefined };
}

async function resolveJumpIds(
  userId: string,
  range: DateRange, customFrom: Date, customTo: Date,
  jumpTypes: string[], tags: string[],
  favouritesOnly: boolean, signedOnly: boolean,
  jumpNumbers: string,
): Promise<string[]> {
  const nums = jumpNumbers.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n) && n > 0);

  if (nums.length > 0) {
    const { data } = await supabase.from('jumps').select('id')
      .eq('user_id', userId).is('deleted_at', null)
      .in('jump_number', nums).order('jump_number', { ascending: true });
    return (data ?? []).map((j: { id: string }) => j.id);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = supabase.from('jumps')
    .select('id, is_favourite, jump_tags(tags(id)), signatures(id)')
    .eq('user_id', userId).is('deleted_at', null)
    .order('jump_number', { ascending: true });

  const bounds = getDateBounds(range, customFrom, customTo);
  if (bounds.gte) q = q.gte('date', bounds.gte);
  if (bounds.lte) q = q.lte('date', bounds.lte);
  if (jumpTypes.length > 0) q = q.in('jump_type', jumpTypes);
  if (favouritesOnly) q = q.eq('is_favourite', true);

  const { data } = await q;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let rows = (data ?? []) as any[];

  if (tags.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rows = rows.filter(j => j.jump_tags?.some((jt: any) => tags.includes(jt.tags?.id)));
  }
  if (signedOnly) {
    rows = rows.filter(j => (j.signatures?.length ?? 0) > 0);
  }

  return rows.map(j => j.id);
}

export default function ExportScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [format, setFormat] = useState<'PDF' | 'CSV'>('PDF');
  const [range, setRange] = useState<DateRange>('All time');
  const [customFrom, setCustomFrom] = useState(() => {
    const d = new Date(); d.setFullYear(d.getFullYear() - 1); return d;
  });
  const [customTo, setCustomTo] = useState(new Date());
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [jumpTypes, setJumpTypes] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [favouritesOnly, setFavouritesOnly] = useState(false);
  const [signedOnly, setSignedOnly] = useState(false);
  const [jumpNumbers, setJumpNumbers] = useState('');
  const [userTags, setUserTags] = useState<TagData[]>([]);
  const [jumpCount, setJumpCount] = useState<number | null>(null);
  const [loading, setLoading] = useState<'single' | 'ten' | 'csv' | null>(null);

  const jumpNumbersActive = jumpNumbers.trim().length > 0;
  const hasFilters = range !== 'All time' || jumpTypes.length > 0 || tags.length > 0
    || favouritesOnly || signedOnly || jumpNumbersActive;

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase.from('tags').select('id, name, color')
        .eq('user_id', session.user.id).order('name');
      setUserTags(data ?? []);
    })();
  }, []);

  const resetCount = useCallback(() => setJumpCount(null), []);

  const clearFilters = useCallback(() => {
    setRange('All time');
    setJumpTypes([]);
    setTags([]);
    setFavouritesOnly(false);
    setSignedOnly(false);
    setJumpNumbers('');
    setJumpCount(null);
  }, []);

  const fetchCount = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const ids = await resolveJumpIds(
      session.user.id, range, customFrom, customTo,
      jumpTypes, tags, favouritesOnly, signedOnly, jumpNumbers,
    );
    setJumpCount(ids.length);
  };

  const handleCsvExport = async () => {
    if (!await checkAccess()) {
      router.push({ pathname: '/paywall', params: { reason: 'trial_expired' } } as any);
      return;
    }
    setLoading('csv');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const jumpIds = await resolveJumpIds(
        session.user.id, range, customFrom, customTo,
        jumpTypes, tags, favouritesOnly, signedOnly, jumpNumbers,
      );
      if (jumpIds.length === 0) {
        Alert.alert('No jumps', 'No jumps match the selected filters.');
        return;
      }

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

      const { data: jumps, error } = await supabase
        .from('jumps')
        .select('jump_number, date, aircraft_type, aircraft_rego, jump_type, jumper_type, exit_altitude_ft, pull_altitude_ft, deploy_altitude_ft, freefall_seconds, canopy_seconds, landing_accuracy_value, landing_accuracy_unit, coordinates_lat, coordinates_lng, notes, dropzones(name, region)')
        .in('id', jumpIds).order('jump_number', { ascending: true });
      if (error) throw new Error(error.message);

      const escape = (v: unknown) => {
        if (v === null || v === undefined) return '';
        const s = String(v);
        return s.includes(',') || s.includes('"') || s.includes('\n')
          ? `"${s.replace(/"/g, '""')}"` : s;
      };

      const headerRow = COLS.map(c => HEADERS[c]).join(',');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dataRows = (jumps ?? []).map((r: any) =>
        COLS.map(c => {
          if (c === 'dz_name')   return escape(r.dropzones?.name ?? null);
          if (c === 'dz_region') return escape(r.dropzones?.region ?? null);
          return escape(r[c]);
        }).join(',')
      );
      const csv = '﻿' + [headerRow, ...dataRows].join('\n');

      const fileUri = `${FileSystem.cacheDirectory}jumplogs-${Date.now()}.csv`;
      await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(fileUri, { mimeType: 'text/csv', dialogTitle: 'Export Logbook' });
    } catch (err: unknown) {
      Alert.alert('Export failed', err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(null);
    }
  };

  const handlePdfExport = async (layout: 'single' | 'ten') => {
    if (!await checkAccess()) {
      router.push({ pathname: '/paywall', params: { reason: 'trial_expired' } } as any);
      return;
    }
    setLoading(layout);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { Alert.alert('Not signed in'); return; }

      const jumpIds = await resolveJumpIds(
        session.user.id, range, customFrom, customTo,
        jumpTypes, tags, favouritesOnly, signedOnly, jumpNumbers,
      );
      if (jumpIds.length === 0) {
        Alert.alert('No jumps', 'No jumps match the selected filters.');
        return;
      }

      const res = await fetch(`${WEB_URL}/api/export/logbook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ jumpIds, layout }),
      });

      if (!res.ok) throw new Error(await res.text() || `Server error ${res.status}`);

      const ab = await res.arrayBuffer();
      const uint8 = new Uint8Array(ab);
      let binary = '';
      const CHUNK = 8192;
      for (let i = 0; i < uint8.byteLength; i += CHUNK) binary += String.fromCharCode(...uint8.subarray(i, i + CHUNK));
      const base64 = btoa(binary);
      const fileUri = `${FileSystem.cacheDirectory}jumplogs-export-${Date.now()}.pdf`;
      await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 });
      await Sharing.shareAsync(fileUri, { mimeType: 'application/pdf', dialogTitle: 'Export Logbook' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const hint = __DEV__ && (msg.toLowerCase().includes('fetch') || msg.toLowerCase().includes('network'))
        ? `\n\nMake sure the web server is running:\ncd web && npm run dev\n\nTarget: ${WEB_URL}` : '';
      Alert.alert('Export failed', msg + hint);
    } finally {
      setLoading(null);
    }
  };

  const toggleType = (t: string) => {
    setJumpTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
    resetCount();
  };
  const toggleTag = (id: string) => {
    setTags(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    resetCount();
  };

  const previewSub = [
    format,
    range === 'Custom' ? `${fmtDate(customFrom)} – ${fmtDate(customTo)}` : (range !== 'All time' ? range : null),
    jumpTypes.length > 0 ? `${jumpTypes.length} type${jumpTypes.length > 1 ? 's' : ''}` : null,
    tags.length > 0 ? `${tags.length} tag${tags.length > 1 ? 's' : ''}` : null,
    favouritesOnly ? 'Favourites' : null,
    signedOnly ? 'Signed' : null,
    jumpNumbersActive ? 'Custom #s' : null,
  ].filter(Boolean).join(' · ');

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={colors.fg} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Export logbook</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">

        {/* FORMAT */}
        <Text style={styles.sectionLabel}>FORMAT</Text>
        <View style={styles.formatRow}>
          {(['PDF', 'CSV'] as const).map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.chip, format === f && styles.chipActive]}
              onPress={() => { setFormat(f); resetCount(); }}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, format === f && styles.chipTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* FILTERS header */}
        <View style={styles.filterHeader}>
          <Text style={styles.filterHeaderLabel}>FILTERS</Text>
          {hasFilters && (
            <TouchableOpacity onPress={clearFilters} activeOpacity={0.7}>
              <Text style={styles.clearText}>Clear all</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* DATE */}
        <Text style={styles.subLabel}>DATE</Text>
        <View style={styles.wrapRow}>
          {DATE_RANGES.map(r => (
            <TouchableOpacity
              key={r}
              style={[styles.fchip, range === r && styles.fchipActive]}
              onPress={() => { setRange(r); resetCount(); }}
              activeOpacity={0.7}
            >
              <Text style={[styles.fchipText, range === r && styles.fchipTextActive]}>{r}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {range === 'Custom' && (
          <View style={styles.customDateRow}>
            <View style={styles.customDateField}>
              <Text style={styles.customDateLabel}>FROM</Text>
              {Platform.OS === 'ios' ? (
                <DateTimePicker
                  value={customFrom}
                  mode="date"
                  display="compact"
                  maximumDate={customTo}
                  themeVariant="dark"
                  onChange={(_, d) => { if (d) { setCustomFrom(d); resetCount(); } }}
                />
              ) : (
                <>
                  <TouchableOpacity style={styles.dateBtn} onPress={() => setShowFromPicker(true)} activeOpacity={0.7}>
                    <Ionicons name="calendar-outline" size={14} color={colors.sky} />
                    <Text style={styles.dateBtnText}>{fmtDate(customFrom)}</Text>
                  </TouchableOpacity>
                  {showFromPicker && (
                    <DateTimePicker
                      value={customFrom}
                      mode="date"
                      display="default"
                      maximumDate={customTo}
                      onChange={(_, d) => { setShowFromPicker(false); if (d) { setCustomFrom(d); resetCount(); } }}
                    />
                  )}
                </>
              )}
            </View>
            <View style={styles.customDateField}>
              <Text style={styles.customDateLabel}>TO</Text>
              {Platform.OS === 'ios' ? (
                <DateTimePicker
                  value={customTo}
                  mode="date"
                  display="compact"
                  minimumDate={customFrom}
                  maximumDate={new Date()}
                  themeVariant="dark"
                  onChange={(_, d) => { if (d) { setCustomTo(d); resetCount(); } }}
                />
              ) : (
                <>
                  <TouchableOpacity style={styles.dateBtn} onPress={() => setShowToPicker(true)} activeOpacity={0.7}>
                    <Ionicons name="calendar-outline" size={14} color={colors.sky} />
                    <Text style={styles.dateBtnText}>{fmtDate(customTo)}</Text>
                  </TouchableOpacity>
                  {showToPicker && (
                    <DateTimePicker
                      value={customTo}
                      mode="date"
                      display="default"
                      minimumDate={customFrom}
                      maximumDate={new Date()}
                      onChange={(_, d) => { setShowToPicker(false); if (d) { setCustomTo(d); resetCount(); } }}
                    />
                  )}
                </>
              )}
            </View>
          </View>
        )}

        {/* JUMP TYPE */}
        <Text style={[styles.subLabel, { marginTop: spacing[4] }]}>JUMP TYPE</Text>
        <CollapsibleChipRow
          items={JUMP_TYPES as unknown as string[]}
          renderChip={(type) => (
            <TouchableOpacity
              style={[styles.fchip, jumpTypes.includes(type) && styles.fchipActive]}
              onPress={() => toggleType(type)}
              activeOpacity={0.7}
            >
              <Text style={[styles.fchipText, jumpTypes.includes(type) && styles.fchipTextActive]}>{type}</Text>
            </TouchableOpacity>
          )}
          style={{ marginBottom: spacing[2] }}
        />

        {/* TAGS */}
        {userTags.length > 0 && (
          <>
            <Text style={[styles.subLabel, { marginTop: spacing[4] }]}>TAGS</Text>
            <View style={styles.wrapRow}>
              {userTags.map(tag => {
                const active = tags.includes(tag.id);
                return (
                  <TouchableOpacity
                    key={tag.id}
                    style={[
                      styles.fchip,
                      { borderColor: active ? tag.color : colors.border },
                      active && { backgroundColor: `${tag.color}18` },
                    ]}
                    onPress={() => toggleTag(tag.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.tagDot, { backgroundColor: tag.color }]} />
                    <Text style={[styles.fchipText, active && { color: tag.color }]}>{tag.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {/* TOGGLES */}
        <View style={[styles.toggleRow, { marginTop: spacing[4] }]}>
          <Text style={styles.toggleLabel}>Favourites only</Text>
          <Toggle on={favouritesOnly} onChange={v => { setFavouritesOnly(v); resetCount(); }} />
        </View>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Signed only</Text>
          <Toggle on={signedOnly} onChange={v => { setSignedOnly(v); resetCount(); }} />
        </View>

        {/* JUMP NUMBERS */}
        <Text style={[styles.subLabel, { marginTop: spacing[4] }]}>JUMP NUMBERS</Text>
        <TextInput
          style={[styles.numbersInput, jumpNumbersActive && styles.numbersInputActive]}
          placeholder="e.g. 1, 5, 100, 250"
          placeholderTextColor={colors.fg3}
          value={jumpNumbers}
          onChangeText={v => { setJumpNumbers(v); resetCount(); }}
          keyboardType="default"
          returnKeyType="done"
        />
        {jumpNumbersActive && (
          <Text style={styles.numbersHint}>Overrides all filters above — only these jump numbers are exported</Text>
        )}

        {/* PREVIEW */}
        <View style={styles.previewCard}>
          <TouchableOpacity onPress={fetchCount} activeOpacity={0.7}>
            {jumpCount === null ? (
              <Text style={styles.previewHint}>Tap to preview jump count</Text>
            ) : (
              <Text style={styles.previewCount}>{jumpCount} JUMPS</Text>
            )}
          </TouchableOpacity>
          <Text style={styles.previewSub}>{previewSub}</Text>
        </View>

        {/* PDF LAYOUT / EXPORT BUTTON */}
        {format === 'PDF' ? (
          <>
            <Text style={styles.sectionLabel}>PDF LAYOUT</Text>
            <View style={styles.pdfRow}>

              <TouchableOpacity
                style={[styles.pdfCard, loading === 'single' && styles.pdfCardLoading]}
                onPress={() => handlePdfExport('single')}
                disabled={loading !== null}
                activeOpacity={0.75}
              >
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
                <Text style={styles.pdfCardTitle}>{loading === 'single' ? 'Generating…' : '1 jump per page'}</Text>
                <Text style={styles.pdfCardSub}>Classic formal{'\n'}Full detail + signature</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.pdfCard, loading === 'ten' && styles.pdfCardLoading]}
                onPress={() => handlePdfExport('ten')}
                disabled={loading !== null}
                activeOpacity={0.75}
              >
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
                <Text style={styles.pdfCardTitle}>{loading === 'ten' ? 'Generating…' : '6 jumps per page'}</Text>
                <Text style={styles.pdfCardSub}>Journal cards{'\n'}Compact overview</Text>
              </TouchableOpacity>

            </View>
          </>
        ) : (
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

    sectionLabel: { fontFamily: 'JetBrainsMono-Regular', fontSize: 10, letterSpacing: 0.8, color: c.fg3, marginTop: spacing[5], marginBottom: spacing[2] },
    subLabel: { fontFamily: 'JetBrainsMono-Regular', fontSize: 10, letterSpacing: 0.8, color: c.fg3, marginBottom: spacing[2] },

    // Format chips (equal width, full row)
    formatRow: { flexDirection: 'row', gap: spacing[2] },
    chip: { flex: 1, paddingVertical: spacing[3], borderRadius: radii.md, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, alignItems: 'center' },
    chipActive: { borderColor: c.sky, backgroundColor: 'rgba(74,158,255,0.08)' },
    chipText: { fontFamily: 'InterTight-Medium', fontSize: 13, color: c.fg2 },
    chipTextActive: { color: c.sky },

    // Filters section header
    filterHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing[6], marginBottom: spacing[4], paddingBottom: spacing[3], borderBottomWidth: 1, borderBottomColor: c.border },
    filterHeaderLabel: { fontFamily: 'JetBrainsMono-Regular', fontSize: 10, letterSpacing: 0.8, color: c.fg3 },
    clearText: { fontFamily: 'InterTight-Medium', fontSize: 12, color: c.sky },

    // Auto-width filter chips
    wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], marginBottom: spacing[2] },
    fchip: { paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderRadius: radii.pill, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
    fchipActive: { borderColor: c.sky, backgroundColor: 'rgba(74,158,255,0.08)' },
    fchipText: { fontFamily: 'InterTight-Medium', fontSize: 13, color: c.fg2 },
    fchipTextActive: { color: c.sky },

    // Custom date pickers
    customDateRow: { flexDirection: 'row', gap: spacing[3], marginTop: spacing[2], marginBottom: spacing[2] },
    customDateField: { flex: 1 },
    customDateLabel: { fontFamily: 'JetBrainsMono-Regular', fontSize: 9, letterSpacing: 0.6, color: c.fg3, marginBottom: spacing[1] },
    dateBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], paddingHorizontal: spacing[3], paddingVertical: spacing[3], borderRadius: radii.md, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
    dateBtnText: { fontFamily: 'InterTight-Medium', fontSize: 13, color: c.fg },

    tagDot: { width: 6, height: 6, borderRadius: 3 },

    // Toggles
    toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing[3], borderTopWidth: 1, borderTopColor: c.border },
    toggleLabel: { fontFamily: 'InterTight-Medium', fontSize: 15, color: c.fg },

    // Jump numbers
    numbersInput: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: radii.md, paddingHorizontal: spacing[4], paddingVertical: spacing[3], fontFamily: 'InterTight-Regular', fontSize: 14, color: c.fg },
    numbersInputActive: { borderColor: c.sky },
    numbersHint: { fontFamily: 'InterTight-Regular', fontSize: 12, color: c.fg3, marginTop: spacing[2] },

    // Preview card
    previewCard: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: radii.lg, padding: spacing[6], alignItems: 'center', marginTop: spacing[5], marginBottom: spacing[5] },
    previewHint: { fontFamily: 'InterTight-Regular', fontSize: 14, color: c.fg3 },
    previewCount: { fontFamily: 'InterTight-Bold', fontSize: 36, color: c.fg, letterSpacing: -1 },
    previewSub: { fontFamily: 'JetBrainsMono-Regular', fontSize: 11, color: c.fg3, marginTop: spacing[2], textAlign: 'center' },

    // Export button (CSV)
    exportBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: c.sky, borderRadius: radii.md, paddingVertical: spacing[4], gap: spacing[2] },
    exportBtnText: { fontFamily: 'InterTight-SemiBold', fontSize: 15, color: c.onSky },

    // PDF layout cards
    pdfRow: { flexDirection: 'row', gap: spacing[3] },
    pdfCard: { flex: 1, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: radii.lg, padding: spacing[4], alignItems: 'center' },
    pdfCardLoading: { borderColor: c.sky, backgroundColor: 'rgba(74,158,255,0.06)' },
    pdfCardTitle: { fontFamily: 'InterTight-SemiBold', fontSize: 13, color: c.fg, marginTop: spacing[2], textAlign: 'center' },
    pdfCardSub: { fontFamily: 'InterTight-Regular', fontSize: 11, color: c.fg3, marginTop: spacing[1], textAlign: 'center', lineHeight: 16 },
    miniPage: { width: '100%', aspectRatio: 0.707, backgroundColor: '#FAFAF7', borderRadius: 3, padding: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    miniHeader: { height: 4, backgroundColor: '#1A1A1A', borderRadius: 1, marginBottom: 5, width: '60%' },
    miniBigNum: { height: 12, backgroundColor: '#0A1220', borderRadius: 2, width: '30%', marginBottom: 5 },
    miniLine: { height: 1, backgroundColor: '#1A1A1A', marginBottom: 5 },
    miniGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 3 },
    miniCell: { width: '30%', height: 6, backgroundColor: '#D8D4C8', borderRadius: 1 },
    miniCardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 3, marginTop: 4 },
    miniCardCell: { width: '47%', height: 14, backgroundColor: '#D8D4C8', borderRadius: 2 },
  });
}
