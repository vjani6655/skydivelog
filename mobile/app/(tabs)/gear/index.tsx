import { useCallback, useState, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, SafeAreaView, ActivityIndicator,
  TouchableOpacity, RefreshControl, ScrollView,
} from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Svg, Path, Line, Rect } from 'react-native-svg';
import { supabase } from '@/lib/supabase';
import { checkAccess } from '@/lib/checkAccess';
import { spacing, radii } from '@/constants/tokens';
import type { ColorSet } from '@/constants/tokens';
import { useColors } from '@/lib/theme';
import type { Gear } from '@/lib/types';

const REPACK_INTERVAL_DAYS = 180;

function daysUntilRepack(g: Gear): number | null {
  if (g.type !== 'canopy' || g.canopy_sub_type !== 'reserve' || !g.repack_reminder_enabled) return null;
  if (!g.next_repack_date) return null;
  return Math.ceil((new Date(g.next_repack_date).getTime() - Date.now()) / 86400000);
}

function daysUntilService(g: Gear): number | null {
  if (g.type !== 'aad') return null;
  if (!g.next_service_date) return null;
  return Math.ceil((new Date(g.next_service_date).getTime() - Date.now()) / 86400000);
}

function isDueSoon(g: Gear): boolean {
  if (g.type === 'canopy' && g.canopy_sub_type === 'reserve' && g.repack_reminder_enabled) {
    if (!g.next_repack_date) return true;
    const days = daysUntilRepack(g);
    return days !== null && days <= 30;
  }
  if (g.type === 'aad') {
    if (!g.next_service_date) return true;
    const days = daysUntilService(g);
    return days !== null && days <= 30;
  }
  return false;
}

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

type FilterKey = 'All' | 'rig' | 'canopy' | 'aad' | 'due';

const FILTER_CHIPS: { key: FilterKey; label: string }[] = [
  { key: 'All', label: 'All' },
  { key: 'rig', label: 'Rigs' },
  { key: 'canopy', label: 'Canopies' },
  { key: 'aad', label: 'AADs' },
  { key: 'due', label: 'Due soon' },
];

export default function GearScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

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
    if (activeFilter === 'due') return isDueSoon(g);
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
          onPress={async () => {
            if (!await checkAccess()) {
              router.push({ pathname: '/paywall', params: { reason: 'trial_expired' } } as any);
              return;
            }
            router.push('/(tabs)/gear/new');
          }}
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
        ListHeaderComponent={activeFilter === 'due' ? (
          <View style={styles.infoBanner}>
            <Ionicons name="information-circle-outline" size={15} color={colors.warn} style={{ marginTop: 1 }} />
            <Text style={styles.infoBannerText}>Items overdue or due for maintenance within 30 days — reserve canopy repacks and AAD services.</Text>
          </View>
        ) : null}
        renderItem={({ item: g }) => {
          const days = daysUntilRepack(g);
          const serviceDays = daysUntilService(g);
          const isOverdue = days !== null && days < 0;
          const isWarn = days !== null && days >= 0 && days <= 30;
          const notSetUp = g.type === 'canopy' && g.canopy_sub_type === 'reserve' && g.repack_reminder_enabled && !g.next_repack_date;
          const isServiceOverdue = serviceDays !== null && serviceDays < 0;
          const isServiceWarn = serviceDays !== null && serviceDays >= 0 && serviceDays <= 30;
          const aadNotSetUp = g.type === 'aad' && !g.next_service_date;
          const iconColor = (isOverdue || isServiceOverdue) ? colors.danger
            : (isWarn || notSetUp || isServiceWarn || aadNotSetUp) ? colors.warn
            : colors.sky;
          return (
            <TouchableOpacity style={styles.card} onPress={() => router.push(`/(tabs)/gear/${g.id}`)} activeOpacity={0.7}>
              <View style={styles.cardRow}>
                <View style={[styles.gearIcon, { borderColor: iconColor }]}>
                  {g.type === 'canopy' ? (
                    <CanopyIcon size={22} color={iconColor} />
                  ) : g.type === 'rig' ? (
                    <Ionicons name="bag-handle-outline" size={22} color={iconColor} />
                  ) : (
                    <Ionicons name="hardware-chip-outline" size={22} color={iconColor} />
                  )}
                </View>
                <View style={styles.cardInfo}>
                  <View style={styles.cardTop}>
                    <Text style={styles.gearName}>{g.make_model}</Text>
                    {(notSetUp || aadNotSetUp) ? (
                      <View style={[styles.badge, styles.badgeWarn]}>
                        <Text style={[styles.badgeText, { color: colors.warn }]}>SETUP NEEDED</Text>
                      </View>
                    ) : (isOverdue && days !== null) ? (
                      <View style={[styles.badge, styles.badgeDanger]}>
                        <Text style={[styles.badgeText, { color: colors.danger }]}>OVERDUE {-days}D</Text>
                      </View>
                    ) : (isServiceOverdue && serviceDays !== null) ? (
                      <View style={[styles.badge, styles.badgeDanger]}>
                        <Text style={[styles.badgeText, { color: colors.danger }]}>SERVICE OVERDUE {-serviceDays}D</Text>
                      </View>
                    ) : (isWarn && days !== null) ? (
                      <View style={[styles.badge, styles.badgeWarn]}>
                        <Text style={[styles.badgeText, { color: colors.warn }]}>DUE IN {days}D</Text>
                      </View>
                    ) : (isServiceWarn && serviceDays !== null) ? (
                      <View style={[styles.badge, styles.badgeWarn]}>
                        <Text style={[styles.badgeText, { color: colors.warn }]}>SERVICE IN {serviceDays}D</Text>
                      </View>
                    ) : (
                      <View style={[styles.badge, styles.badgeOk]}>
                        <Text style={[styles.badgeText, { color: colors.ok }]}>In service</Text>
                      </View>
                    )}
                  </View>
                  {g.serial_number ? (
                    <Text style={styles.gearSN}>S/N {g.serial_number}</Text>
                  ) : null}
                  {days !== null && !notSetUp ? (
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, {
                        width: `${Math.max(0, Math.min(100, ((REPACK_INTERVAL_DAYS - Math.max(0, days)) / REPACK_INTERVAL_DAYS) * 100))}%`,
                        backgroundColor: isOverdue ? colors.danger : isWarn ? colors.warn : colors.ok,
                      }]} />
                    </View>
                  ) : null}
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

function makeStyles(c: ColorSet) {
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: spacing[5], paddingTop: spacing[5], paddingBottom: spacing[3] },
  title: { fontFamily: 'InterTight-Bold', fontSize: 28, color: c.fg, letterSpacing: -0.5 },
  sub: { fontFamily: 'JetBrainsMono-Regular', fontSize: 11, letterSpacing: 0.8, color: c.fg3, marginTop: 3 },
  iconBtn: { width: 36, height: 36, borderRadius: radii.md, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, justifyContent: 'center', alignItems: 'center' },
  addBtn: { backgroundColor: c.sky, borderColor: c.sky },
  chipScroll: { flexGrow: 0, marginBottom: spacing[2] },
  chipContent: { paddingHorizontal: spacing[5], gap: spacing[2] },
  chip: { paddingHorizontal: spacing[3], paddingVertical: spacing[1.5], borderRadius: radii.pill, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
  chipActive: { backgroundColor: c.sky, borderColor: c.sky },
  chipText: { fontFamily: 'InterTight-Medium', fontSize: 13, color: c.fg2 },
  chipTextActive: { color: c.onSky },
  list: { paddingHorizontal: spacing[5], paddingTop: spacing[3], paddingBottom: spacing[10] },
  infoBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[2], backgroundColor: 'rgba(255,183,74,0.1)', borderWidth: 1, borderColor: 'rgba(255,183,74,0.25)', borderRadius: radii.md, padding: spacing[3], marginBottom: spacing[3] },
  infoBannerText: { flex: 1, fontFamily: 'InterTight-Regular', fontSize: 13, color: c.warn, lineHeight: 18 },
  card: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: radii.md, padding: spacing[3.5], marginBottom: spacing[3] },
  cardRow: { flexDirection: 'row', gap: spacing[3] },
  gearIcon: { width: 44, height: 44, borderRadius: radii.md, backgroundColor: c.surface2, borderWidth: 1, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  cardInfo: { flex: 1 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[1] },
  gearName: { fontFamily: 'InterTight-SemiBold', fontSize: 15, color: c.fg, flex: 1, marginRight: spacing[2] },
  gearSN: { fontFamily: 'JetBrainsMono-Regular', fontSize: 11, color: c.fg3, marginBottom: spacing[2] },
  badge: { paddingHorizontal: spacing[2], paddingVertical: 2, borderRadius: radii.sm },
  badgeOk: { backgroundColor: c.okBg },
  badgeWarn: { backgroundColor: 'rgba(255,183,74,0.12)' },
  badgeDanger: { backgroundColor: 'rgba(255,107,107,0.12)' },
  badgeText: { fontFamily: 'JetBrainsMono-Regular', fontSize: 10, letterSpacing: 0.3 },
  progressTrack: { height: 3, borderRadius: 2, backgroundColor: c.surface2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  empty: { alignItems: 'center', paddingTop: spacing[16], gap: spacing[2] },
  emptyTitle: { fontFamily: 'InterTight-SemiBold', fontSize: 17, color: c.fg, marginTop: spacing[3] },
  emptySub: { fontFamily: 'InterTight-Regular', fontSize: 14, color: c.fg3 },
  });
}
