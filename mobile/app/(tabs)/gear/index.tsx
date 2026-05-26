import { useCallback, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, SafeAreaView, ActivityIndicator,
  TouchableOpacity, RefreshControl, ScrollView,
} from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { colors, spacing, radii } from '@/constants/tokens';
import type { Gear } from '@/lib/types';

type FilterKey = 'All' | 'rig' | 'canopy' | 'aad' | 'due';

const FILTER_CHIPS: { key: FilterKey; label: string }[] = [
  { key: 'All', label: 'All' },
  { key: 'rig', label: 'Rigs' },
  { key: 'canopy', label: 'Canopies' },
  { key: 'aad', label: 'AADs' },
  { key: 'due', label: 'Due soon' },
];

const TYPE_ICON: Record<string, string> = {
  rig: 'briefcase-outline',
  canopy: 'umbrella-outline',
  reserve: 'shield-checkmark-outline',
  aad: 'hardware-chip-outline',
  other: 'cube-outline',
};

function gearStatusColor(g: Gear): string {
  // Simple heuristic: if no dom or no serial, treat as ok
  return colors.sky;
}

export default function GearScreen() {
  const [gear, setGear] = useState<Gear[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterKey>('All');

  const fetchGear = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from('gear')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setGear((data ?? []) as Gear[]);
    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(useCallback(() => { fetchGear(); }, []));

  const filtered = gear.filter(g => {
    if (activeFilter === 'All') return true;
    if (activeFilter === 'due') return false; // placeholder
    return g.type === activeFilter;
  });

  if (loading) {
    return <View style={[styles.center, { backgroundColor: colors.bg }]}><ActivityIndicator color={colors.sky} /></View>;
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Gear</Text>
          <Text style={styles.sub}>{gear.length} ITEMS</Text>
        </View>
        <TouchableOpacity
          style={[styles.iconBtn, styles.addBtn]}
          onPress={() => router.push('/(tabs)/gear/new')}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={22} color={colors.onSky} />
        </TouchableOpacity>
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipScroll}
        contentContainerStyle={styles.chipContent}
      >
        {FILTER_CHIPS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.chip, activeFilter === f.key && styles.chipActive]}
            onPress={() => setActiveFilter(f.key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, activeFilter === f.key && styles.chipTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={g => g.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchGear(); }} tintColor={colors.sky} />}
        renderItem={({ item: g }) => {
          const iconColor = gearStatusColor(g);
          return (
            <TouchableOpacity style={styles.card} onPress={() => router.push(`/(tabs)/gear/${g.id}`)} activeOpacity={0.7}>
              <View style={styles.cardRow}>
                <View style={[styles.gearIcon, { borderColor: iconColor }]}>
                  <Ionicons name={(TYPE_ICON[g.type] ?? 'cube-outline') as any} size={22} color={iconColor} />
                </View>
                <View style={styles.cardInfo}>
                  <View style={styles.cardTop}>
                    <Text style={styles.gearName}>{g.make_model}</Text>
                    <View style={[styles.badge, styles.badgeOk]}>
                      <Text style={[styles.badgeText, { color: colors.ok }]}>In service</Text>
                    </View>
                  </View>
                  {g.serial_number ? (
                    <Text style={styles.gearSN}>S/N {g.serial_number}</Text>
                  ) : null}
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: '70%', backgroundColor: colors.ok }]} />
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="briefcase-outline" size={44} color={colors.fg3} />
            <Text style={styles.emptyTitle}>No gear added yet</Text>
            <Text style={styles.emptySub}>Track your rig, canopy & AAD</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: spacing[5], paddingTop: spacing[5], paddingBottom: spacing[3] },
  title: { fontFamily: 'InterTight-Bold', fontSize: 28, color: colors.fg, letterSpacing: -0.5 },
  sub: { fontFamily: 'JetBrainsMono-Regular', fontSize: 11, letterSpacing: 0.8, color: colors.fg3, marginTop: 3 },
  iconBtn: { width: 36, height: 36, borderRadius: radii.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', alignItems: 'center' },
  addBtn: { backgroundColor: colors.sky, borderColor: colors.sky },
  chipScroll: { flexGrow: 0, marginBottom: spacing[2] },
  chipContent: { paddingHorizontal: spacing[5], gap: spacing[2] },
  chip: { paddingHorizontal: spacing[3], paddingVertical: spacing[1.5], borderRadius: radii.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.sky, borderColor: colors.sky },
  chipText: { fontFamily: 'InterTight-Medium', fontSize: 13, color: colors.fg2 },
  chipTextActive: { color: colors.onSky },
  list: { paddingHorizontal: spacing[5], paddingBottom: spacing[10] },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing[3.5], marginBottom: spacing[3] },
  cardRow: { flexDirection: 'row', gap: spacing[3] },
  gearIcon: { width: 44, height: 44, borderRadius: radii.md, backgroundColor: colors.surface2, borderWidth: 1, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  cardInfo: { flex: 1 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[1] },
  gearName: { fontFamily: 'InterTight-SemiBold', fontSize: 15, color: colors.fg, flex: 1, marginRight: spacing[2] },
  gearSN: { fontFamily: 'JetBrainsMono-Regular', fontSize: 11, color: colors.fg3, marginBottom: spacing[2] },
  badge: { paddingHorizontal: spacing[2], paddingVertical: 2, borderRadius: radii.sm },
  badgeOk: { backgroundColor: colors.okBg },
  badgeWarn: { backgroundColor: 'rgba(255,183,74,0.12)' },
  badgeDanger: { backgroundColor: 'rgba(255,107,107,0.12)' },
  badgeText: { fontFamily: 'JetBrainsMono-Regular', fontSize: 10, letterSpacing: 0.3 },
  progressTrack: { height: 3, borderRadius: 2, backgroundColor: colors.surface2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  empty: { alignItems: 'center', paddingTop: spacing[16], gap: spacing[2] },
  emptyTitle: { fontFamily: 'InterTight-SemiBold', fontSize: 17, color: colors.fg, marginTop: spacing[3] },
  emptySub: { fontFamily: 'InterTight-Regular', fontSize: 14, color: colors.fg3 },
});
