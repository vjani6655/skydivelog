import { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet,  ActivityIndicator,
  TouchableOpacity, Alert, Image } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Svg, Path, Line, Rect } from 'react-native-svg';
import { supabase } from '@/lib/supabase';
import { spacing, radii } from '@/constants/tokens';
import type { ColorSet } from '@/constants/tokens';
import { useColors } from '@/lib/theme';
import type { Gear, EditLogEntry } from '@/lib/types';

function CanopyIcon({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <Path d="M6 28 C 8 18, 14 14, 22 14 L 42 14 C 50 14, 56 18, 58 28 L 50 26 L 42 28 L 32 26 L 22 28 L 14 26 Z" fill={color} stroke={color} strokeWidth={2} strokeLinejoin="round" />
      <Line x1="14" y1="26" x2="16" y2="14" stroke={color} strokeOpacity={0.45} strokeWidth={1.5} />
      <Line x1="22" y1="28" x2="24" y2="14" stroke={color} strokeOpacity={0.45} strokeWidth={1.5} />
      <Line x1="32" y1="26" x2="32" y2="14" stroke={color} strokeOpacity={0.45} strokeWidth={1.5} />
      <Line x1="42" y1="28" x2="40" y2="14" stroke={color} strokeOpacity={0.45} strokeWidth={1.5} />
      <Line x1="50" y1="26" x2="48" y2="14" stroke={color} strokeOpacity={0.45} strokeWidth={1.5} />
      <Path d="M10 28 L 32 50 L 54 28" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      <Rect x="29" y="48" width="6" height="10" rx="3" fill={color} />
    </Svg>
  );
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function GearDetailScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const [gear, setGear] = useState<Gear | null>(null);
  const [loading, setLoading] = useState(true);
  const [jumpCount, setJumpCount] = useState<number | null>(null);
  const [log, setLog] = useState<EditLogEntry[]>([]);
  const [photoSignedUrl, setPhotoSignedUrl] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    const [{ data: gearData }, { count }, { data: logData }] = await Promise.all([
      supabase.from('gear').select('*').eq('id', id).single(),
      supabase.from('jumps').select('id', { count: 'exact', head: true }).eq('canopy_gear_id', id).is('deleted_at', null),
      supabase.from('edit_log').select('*').eq('item_id', id).eq('item_type', 'gear').order('changed_at', { ascending: false }),
    ]);
    setGear(gearData as Gear | null);
    setJumpCount(count ?? 0);
    setLog((logData ?? []) as EditLogEntry[]);
    // Generate signed URL for photo (works whether bucket is public or private)
    const photoUrl = (gearData as Gear | null)?.photo_url ?? null;
    if (photoUrl) {
      const path = photoUrl.includes('/gear-photos/') ? photoUrl.split('/gear-photos/')[1] : null;
      if (path) {
        const { data: signed } = await supabase.storage.from('gear-photos').createSignedUrl(path, 3600);
        setPhotoSignedUrl(signed?.signedUrl ?? photoUrl);
      } else {
        setPhotoSignedUrl(photoUrl);
      }
    } else {
      setPhotoSignedUrl(null);
    }
    setLoading(false);
  }, [id]);

  useFocusEffect(useCallback(() => { fetchAll(); }, [fetchAll]));

  const handleDelete = () =>
    Alert.alert('Delete gear?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await supabase.from('gear').delete().eq('id', id);
          router.back();
        },
      },
    ]);

  if (loading) return <View style={[styles.center, { backgroundColor: colors.bg }]}><ActivityIndicator color={colors.sky} /></View>;
  if (!gear) return <View style={[styles.center, { backgroundColor: colors.bg }]}><Text style={{ color: colors.fg2 }}>Not found.</Text></View>;

  const isReserve = gear.type === 'canopy' && gear.canopy_sub_type === 'reserve';

  const specs: [string, string][] = [
    ['Type', gear.type + (gear.canopy_sub_type ? ` · ${gear.canopy_sub_type}` : '')],
    ['Make / Model', gear.make_model],
    ['Serial number', gear.serial_number],
    ['Date of manufacture', fmtDate(gear.manufactured_date)],
    ...(isReserve ? [['Last repacked on', fmtDate(gear.last_repack_date)] as [string, string]] : []),
    ...(isReserve ? [['Next repack date', fmtDate(gear.next_repack_date)] as [string, string]] : []),
    ...(gear.type === 'aad' ? [['Next service date', fmtDate(gear.next_service_date)] as [string, string]] : []),
    ...(gear.type === 'canopy' && jumpCount !== null ? [['Jumps logged', String(jumpCount)] as [string, string]] : []),
  ];

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.back} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={colors.fg} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{gear.make_model}</Text>
        <TouchableOpacity style={styles.editBtn} onPress={() => router.push({ pathname: '/(tabs)/gear/edit', params: { id } })} activeOpacity={0.7}>
          <Ionicons name="pencil-outline" size={16} color={colors.fg2} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {/* Icon + name */}
        <View style={styles.heroRow}>
          <View style={styles.gearIcon}>
            {gear.type === 'canopy' ? (
              <CanopyIcon size={32} color={colors.sky} />
            ) : gear.type === 'rig' ? (
              <Ionicons name="bag-handle-outline" size={32} color={colors.sky} />
            ) : (
              <Ionicons name="hardware-chip-outline" size={32} color={colors.sky} />
            )}
          </View>
          <View style={{ flex: 1, marginLeft: spacing[4] }}>
            <Text style={styles.gearName}>{gear.make_model}</Text>
            <Text style={styles.gearType}>{gear.type.toUpperCase()}</Text>
            {gear.serial_number ? (
              <Text style={styles.gearSN}>S/N {gear.serial_number}</Text>
            ) : null}
          </View>
        </View>

        {/* Photo */}
        {gear.photo_url && photoSignedUrl ? (
          <>
            <Text style={styles.sectionTitle}>Photo</Text>
            <Image source={{ uri: photoSignedUrl }} style={styles.photo} resizeMode="cover" />
          </>
        ) : null}

        {/* Specs card */}
        <Text style={styles.sectionTitle}>Specifications</Text>
        <View style={styles.card}>
          {specs.map(([label, value], i) => (
            <View key={label} style={[styles.specRow, i < specs.length - 1 && styles.specRowBorder]}>
              <Text style={styles.specLabel}>{label}</Text>
              <Text style={styles.specValue}>{value}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} activeOpacity={0.7}>
          <Text style={styles.deleteBtnText}>Delete gear item</Text>
        </TouchableOpacity>

        {/* Edit history */}
        {log.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Edit history</Text>
            <View style={styles.card}>
              {log.map((entry, ei) => (
                <View key={entry.id} style={[styles.logEntry, ei < log.length - 1 && styles.specRowBorder]}>
                  <Text style={styles.logDate}>{fmtDateTime(entry.changed_at)}</Text>
                  {entry.changes.map((ch, ci) => (
                    <View key={ci} style={styles.logChange}>
                      <Text style={styles.logField}>{ch.field}</Text>
                      <View style={styles.logValues}>
                        <Text style={styles.logFrom}>{ch.from ?? '—'}</Text>
                        <Ionicons name="arrow-forward" size={11} color={colors.fg3} style={{ marginHorizontal: 4 }} />
                        <Text style={styles.logTo}>{ch.to ?? '—'}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(c: ColorSet) {
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing[5], paddingVertical: spacing[3], borderBottomWidth: 1, borderBottomColor: c.border },
  back: { width: 36, height: 36, justifyContent: 'center' },
  editBtn: { width: 36, height: 36, borderRadius: radii.md, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontFamily: 'InterTight-SemiBold', fontSize: 17, color: c.fg, paddingHorizontal: spacing[2] },
  body: { padding: spacing[5], paddingBottom: spacing[12] },
  heroRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: radii.md, padding: spacing[4], marginBottom: spacing[5] },
  gearIcon: { width: 60, height: 60, borderRadius: radii.md, backgroundColor: c.surface2, justifyContent: 'center', alignItems: 'center' },
  gearName: { fontFamily: 'InterTight-SemiBold', fontSize: 18, color: c.fg },
  gearType: { fontFamily: 'JetBrainsMono-Regular', fontSize: 10, letterSpacing: 0.8, color: c.fg3, marginTop: 3 },
  gearSN: { fontFamily: 'JetBrainsMono-Regular', fontSize: 11, color: c.fg3, marginTop: 3 },
  sectionTitle: { fontFamily: 'InterTight-SemiBold', fontSize: 13, color: c.fg3, letterSpacing: 0.3, marginBottom: spacing[2] },
  photo: { width: '100%', height: 200, borderRadius: radii.md, marginBottom: spacing[5] },
  card: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: radii.md, marginBottom: spacing[5], overflow: 'hidden' },
  specRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing[4], paddingVertical: spacing[3.5] },
  specRowBorder: { borderBottomWidth: 1, borderBottomColor: c.border },
  specLabel: { fontFamily: 'InterTight-Regular', fontSize: 14, color: c.fg2 },
  specValue: { fontFamily: 'InterTight-Medium', fontSize: 14, color: c.fg, flexShrink: 1, textAlign: 'right', marginLeft: spacing[3], textTransform: 'capitalize' },
  notesText: { fontFamily: 'InterTight-Regular', fontSize: 14, color: c.fg2, padding: spacing[4] },
  deleteBtn: { paddingVertical: spacing[4] },
  deleteBtnText: { fontFamily: 'InterTight-Medium', fontSize: 14, color: c.danger },
  logEntry: { paddingHorizontal: spacing[4], paddingVertical: spacing[3] },
  logDate: { fontFamily: 'JetBrainsMono-Regular', fontSize: 10, color: c.fg3, letterSpacing: 0.3, marginBottom: spacing[2] },
  logChange: { marginBottom: spacing[1.5] },
  logField: { fontFamily: 'InterTight-Medium', fontSize: 13, color: c.fg2, marginBottom: 2 },
  logValues: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  logFrom: { fontFamily: 'JetBrainsMono-Regular', fontSize: 11, color: c.danger, textDecorationLine: 'line-through' },
  logTo: { fontFamily: 'JetBrainsMono-Regular', fontSize: 11, color: c.ok },
  });
}
