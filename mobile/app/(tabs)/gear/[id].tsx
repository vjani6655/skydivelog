import { useEffect, useState, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView, ActivityIndicator,
  TouchableOpacity, Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { spacing, radii } from '@/constants/tokens';
import type { ColorSet } from '@/constants/tokens';
import { useColors } from '@/lib/theme';
import type { Gear } from '@/lib/types';

const TYPE_ICON: Record<string, string> = {
  container: 'briefcase-outline',
  main: 'umbrella-outline',
  reserve: 'shield-checkmark-outline',
  aad: 'hardware-chip-outline',
  other: 'cube-outline',
};

export default function GearDetailScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const [gear, setGear] = useState<Gear | null>(null);
  const [loading, setLoading] = useState(true);
  const [jumpCount, setJumpCount] = useState<number | null>(null);

  useEffect(() => {
    supabase.from('gear').select('*').eq('id', id).single().then(({ data }) => {
      setGear(data as Gear | null);
      setLoading(false);
    });
    // Count jumps logged against this gear item
    supabase
      .from('jumps')
      .select('id', { count: 'exact', head: true })
      .eq('canopy_gear_id', id)
      .is('deleted_at', null)
      .then(({ count }) => setJumpCount(count ?? 0));
  }, [id]);

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

  const specs: [string, string][] = [
    ['Type', gear.type],
    ['Make / Model', gear.make_model],
    ['Serial number', gear.serial_number],
    ['Date of manufacture', gear.manufactured_date ?? '—'],
    ...(gear.type === 'canopy' && jumpCount !== null ? [['Jumps logged', String(jumpCount)] as [string, string]] : []),
  ];

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.back} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={colors.fg} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{gear.make_model}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {/* Icon + name */}
        <View style={styles.heroRow}>
          <View style={styles.gearIcon}>
            <Ionicons name={(TYPE_ICON[gear.type] ?? 'cube-outline') as any} size={32} color={colors.sky} />
          </View>
          <View style={{ flex: 1, marginLeft: spacing[4] }}>
            <Text style={styles.gearName}>{gear.make_model}</Text>
            <Text style={styles.gearType}>{gear.type.toUpperCase()}</Text>
            {gear.serial_number ? (
              <Text style={styles.gearSN}>S/N {gear.serial_number}</Text>
            ) : null}
          </View>
        </View>

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
  headerTitle: { flex: 1, textAlign: 'center', fontFamily: 'InterTight-SemiBold', fontSize: 17, color: c.fg, paddingHorizontal: spacing[2] },
  body: { padding: spacing[5], paddingBottom: spacing[12] },
  heroRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: radii.md, padding: spacing[4], marginBottom: spacing[5] },
  gearIcon: { width: 60, height: 60, borderRadius: radii.md, backgroundColor: c.surface2, justifyContent: 'center', alignItems: 'center' },
  gearName: { fontFamily: 'InterTight-SemiBold', fontSize: 18, color: c.fg },
  gearType: { fontFamily: 'JetBrainsMono-Regular', fontSize: 10, letterSpacing: 0.8, color: c.fg3, marginTop: 3 },
  gearSN: { fontFamily: 'JetBrainsMono-Regular', fontSize: 11, color: c.fg3, marginTop: 3 },
  sectionTitle: { fontFamily: 'InterTight-SemiBold', fontSize: 13, color: c.fg3, letterSpacing: 0.3, marginBottom: spacing[2] },
  card: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: radii.md, marginBottom: spacing[5], overflow: 'hidden' },
  specRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing[4], paddingVertical: spacing[3.5] },
  specRowBorder: { borderBottomWidth: 1, borderBottomColor: c.border },
  specLabel: { fontFamily: 'InterTight-Regular', fontSize: 14, color: c.fg2 },
  specValue: { fontFamily: 'InterTight-Medium', fontSize: 14, color: c.fg, flexShrink: 1, textAlign: 'right', marginLeft: spacing[3], textTransform: 'capitalize' },
  notesText: { fontFamily: 'InterTight-Regular', fontSize: 14, color: c.fg2, padding: spacing[4] },
  deleteBtn: { paddingVertical: spacing[4] },
  deleteBtnText: { fontFamily: 'InterTight-Medium', fontSize: 14, color: c.danger },
  });
}
