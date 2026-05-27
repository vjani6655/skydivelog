import { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  TextInput,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { trySyncQueue, getRawQueue, queuedToJumpFull } from '@/lib/offlineQueue';
import { spacing, radii } from '@/constants/tokens';
import type { ColorSet } from '@/constants/tokens';
import { useColors } from '@/lib/theme';
import type { JumpFull } from '@/lib/types';
import CompactRow from '@/components/log/CompactRow';
import DataCard from '@/components/log/DataCard';
import TimelineGroup from '@/components/log/TimelineGroup';
import { FilterSheet, DEFAULT_FILTER } from '@/components/log/FilterSheet';
import { usePrefs } from '@/lib/prefsContext';
import type { FilterState } from '@/components/log/FilterSheet';

type Layout = 'Compact' | 'Cards' | 'Timeline';

const JUMP_CACHE_KEY = '@jumplogs/jumps_list_cache';

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmtTotalFF(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}H ${String(m).padStart(2, '0')}M`;
}

function monthKey(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' }).toUpperCase();
}

// ─── screen ──────────────────────────────────────────────────────────────────

export default function LogScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { prefs } = usePrefs();
  const [jumps, setJumps] = useState<JumpFull[]>([]);
  const [layout, setLayout] = useState<Layout>('Cards');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [filterVisible, setFilterVisible] = useState(false);
  const [filter, setFilter] = useState<FilterState>(DEFAULT_FILTER);
  const [userCreatedAt, setUserCreatedAt] = useState<string | null>(null);
  const [subActive, setSubActive] = useState(false);

  // ── data fetch ────────────────────────────────────────────────────────────
  const fetchAll = async () => {
    try {
    const { data: sessionData } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
    const user = sessionData?.session?.user;
    if (!user) { setLoading(false); return; }

    // Flush any locally-queued jumps first
    await trySyncQueue(supabase).catch(() => null);

    const [{ data: userData }, { data: jumpData }, { data: subData }] = await Promise.all([
      supabase.from('users').select('display_layout_jump_list').eq('id', user.id).single(),
      supabase
        .from('jumps')
        .select('*, dropzones(name, region, latitude, longitude)')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('date', { ascending: false })
        .order('jump_number', { ascending: false }),
      supabase
        .from('subscriptions')
        .select('status')
        .eq('user_id', user.id)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    setUserCreatedAt(user.created_at);
    setSubActive(subData?.status === 'active' || subData?.status === 'overdue');

    if (userData?.display_layout_jump_list) {
      setLayout(userData.display_layout_jump_list as Layout);
    }
    // Merge queued (unsynced) jumps with DB/cached jumps, then sort by jump number
    const queuedJumps = (await getRawQueue()).map(queuedToJumpFull);
    let displayJumps: JumpFull[] = [];
    if (jumpData) {
      // Online: cache the fresh data for offline use later
      await AsyncStorage.setItem(JUMP_CACHE_KEY, JSON.stringify(jumpData)).catch(() => null);
      displayJumps = jumpData as JumpFull[];
    } else {
      // Offline: fall back to cached list
      const raw = await AsyncStorage.getItem(JUMP_CACHE_KEY).catch(() => null);
      if (raw) displayJumps = JSON.parse(raw);
    }
    const merged = [...queuedJumps, ...displayJumps];
    merged.sort((a, b) => (b.jump_number ?? 0) - (a.jump_number ?? 0));
    setJumps(merged);
    setLoading(false);
    setRefreshing(false);
    } catch {
      // On any unexpected error (e.g. offline token refresh), fall back to
      // the cached list merged with anything still in the offline queue.
      const queuedJumps = (await getRawQueue().catch(() => [])).map(queuedToJumpFull);
      const raw = await AsyncStorage.getItem(JUMP_CACHE_KEY).catch(() => null);
      const cached: JumpFull[] = raw ? JSON.parse(raw) : [];
      const merged = [...queuedJumps, ...cached];
      merged.sort((a, b) => (b.jump_number ?? 0) - (a.jump_number ?? 0));
      setJumps(merged);
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchAll(); }, []));

  // ── subscription gate ─────────────────────────────────────────────────────
  const trialEnd = userCreatedAt
    ? new Date(new Date(userCreatedAt).getTime() + 14 * 86400000)
    : null;
  const inTrial = !subActive && !!trialEnd && Date.now() < trialEnd.getTime();
  const trialExpired = !subActive && !!trialEnd && Date.now() >= trialEnd.getTime();

  const handleAddJump = () => {
    if (trialExpired) {
      router.push({ pathname: '/paywall', params: { reason: 'trial_expired' } } as any);
    } else if (inTrial && jumps.length >= 5) {
      router.push({ pathname: '/paywall', params: { skippable: '1', reason: 'trial_limit' } } as any);
    } else {
      router.push('/(tabs)/log/new');
    }
  };
  const totalFF = useMemo(
    () => jumps.reduce((s, j) => s + (j.freefall_seconds ?? 0), 0),
    [jumps],
  );

  const filterTypes = useMemo(
    () => ['All', ...Array.from(new Set(jumps.map(j => j.jump_type).filter(Boolean) as string[]))],
    [jumps],
  );

  // ── filtered list ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = jumps;
    if (activeFilter !== 'All') {
      list = list.filter(j => j.jump_type === activeFilter);
    }
    if (filter.jumpTypes.length > 0) {
      list = list.filter(j => filter.jumpTypes.includes(j.jump_type ?? ''));
    }
    if (filter.favouritesOnly) {
      list = list.filter(j => j.is_favourite);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(j =>
        j.dropzones?.name?.toLowerCase().includes(q) ||
        j.jump_type?.toLowerCase().includes(q) ||
        String(j.jump_number).includes(q),
      );
    }
    // Sort
    if (filter.sort === 'date_asc') {
      list = [...list].sort((a, b) => a.date.localeCompare(b.date));
    } else if (filter.sort === 'jump_num') {
      list = [...list].sort((a, b) => (b.jump_number ?? 0) - (a.jump_number ?? 0));
    } else if (filter.sort === 'freefall') {
      list = [...list].sort((a, b) => (b.freefall_seconds ?? 0) - (a.freefall_seconds ?? 0));
    }
    return list;
  }, [jumps, activeFilter, searchQuery, filter]);

  // ── timeline groups ───────────────────────────────────────────────────────
  const timelineGroups = useMemo(() => {
    const map = new Map<string, JumpFull[]>();
    filtered.forEach(j => {
      const k = monthKey(j.date);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(j);
    });
    return Array.from(map.entries()).map(([month, items]) => ({ month, items }));
  }, [filtered]);

  // ── loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.sky} />
      </View>
    );
  }

  // ── header ────────────────────────────────────────────────────────────────
  const Header = (
    <View>
      {/* Title row */}
      <View style={styles.titleRow}>
        <View>
          <Text style={styles.title}>Logbook</Text>
          {layout === 'Compact' ? (
            <Text style={styles.subtitle}>
              {jumps.length} JUMPS · {fmtTotalFF(totalFF)} FREEFALL
            </Text>
          ) : (
            <Text style={styles.subtitle}>{jumps.length} JUMPS LOGGED</Text>
          )}
        </View>
        <View style={styles.titleActions}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => { setSearchOpen(v => !v); setSearchQuery(''); }}
          >
            <Ionicons
              name={searchOpen ? 'close' : 'search'}
              size={20}
              color={colors.fg2}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => setFilterVisible(true)}
          >
            <Ionicons name="options-outline" size={19} color={colors.fg2} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconBtn, styles.addBtn]}
            onPress={handleAddJump}
          >
            <Ionicons name="add" size={22} color={colors.onSky} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search bar */}
      {searchOpen && (
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={16} color={colors.fg3} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by DZ, type, tag..."
            placeholderTextColor={colors.fg3}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </View>
      )}

      {/* Filter chips — only on Compact layout */}
      {layout === 'Compact' && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroll}
          contentContainerStyle={styles.chipContent}
        >
          {filterTypes.map(type => (
            <TouchableOpacity
              key={type}
              style={[styles.chip, activeFilter === type && styles.chipActive]}
              onPress={() => setActiveFilter(type)}
            >
              <Text style={[styles.chipText, activeFilter === type && styles.chipTextActive]}>
                {type}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );

  // ── empty state ───────────────────────────────────────────────────────────
  const Empty = (
    <View style={styles.empty}>
      <Ionicons name="albums-outline" size={48} color={colors.fg3} />
      <Text style={styles.emptyTitle}>No jumps yet</Text>
      <Text style={styles.emptyBody}>Log your first jump to get started</Text>
      <TouchableOpacity
        style={styles.emptyBtn}
        onPress={handleAddJump}
      >
        <Text style={styles.emptyBtnText}>Log a jump</Text>
      </TouchableOpacity>
    </View>
  );

  // ── render ────────────────────────────────────────────────────────────────
  const filterSheetEl = (
    <FilterSheet
      visible={filterVisible}
      onClose={() => setFilterVisible(false)}
      filter={filter}
      onApply={setFilter}
      totalCount={jumps.length}
      filteredCount={filtered.length}
    />
  );

  if (layout === 'Timeline') {
    return (
      <SafeAreaView style={styles.screen}>
        <FlatList
          data={timelineGroups}
          keyExtractor={g => g.month}
          ListHeaderComponent={Header}
          renderItem={({ item }) => (
            <TimelineGroup
              month={item.month}
              count={item.items.length}
              jumps={item.items}
              onPressJump={id => {
                const jump = item.items.find(j => j.id === id);
                if (jump?._localId) {
                  Alert.alert('Pending sync', 'This jump will upload when you\'re back online.');
                  return;
                }
                if (jump?.is_draft) {
                  router.push({ pathname: '/(tabs)/log/new', params: { draftId: id } });
                } else {
                  router.push(`/(tabs)/log/${id}`);
                }
              }}
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchAll(); }}
              tintColor={colors.sky}
            />
          }
          ListEmptyComponent={Empty}
        />
        {filterSheetEl}
      </SafeAreaView>
    );
  }

  if (layout === 'Compact') {
    return (
      <SafeAreaView style={styles.screen}>
        <FlatList
          data={filtered}
          keyExtractor={j => j.id}
          ListHeaderComponent={Header}
          renderItem={({ item }) => (
            <CompactRow
              jump={item}
              altUnit={prefs.altUnit}
              dateFormat={prefs.dateFormat}
              onPress={() => {
                if (item._localId) {
                  Alert.alert('Pending sync', 'This jump will upload when you\'re back online.');
                  return;
                }
                if (item.is_draft) {
                  router.push({ pathname: '/(tabs)/log/new', params: { draftId: item.id } });
                } else {
                  router.push(`/(tabs)/log/${item.id}`);
                }
              }}
            />
          )}
          contentContainerStyle={styles.listContentCompact}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchAll(); }}
              tintColor={colors.sky}
            />
          }
          ListEmptyComponent={Empty}
        />
        {filterSheetEl}
      </SafeAreaView>
    );
  }

  // Cards (default)
  return (
    <SafeAreaView style={styles.screen}>
      <FlatList
        data={filtered}
        keyExtractor={j => j.id}
        ListHeaderComponent={Header}
        renderItem={({ item }) => (
          <DataCard
            jump={item}
            altUnit={prefs.altUnit}
            dateFormat={prefs.dateFormat}
            onPress={() => {
              if (item._localId) {
                Alert.alert('Pending sync', 'This jump will upload when you\'re back online.');
                return;
              }
              if (item.is_draft) {
                router.push({ pathname: '/(tabs)/log/new', params: { draftId: item.id } });
              } else {
                router.push(`/(tabs)/log/${item.id}`);
              }
            }}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchAll(); }}
            tintColor={colors.sky}
          />
        }
        ListEmptyComponent={Empty}
      />
      {filterSheetEl}
    </SafeAreaView>
  );
}

function makeStyles(c: ColorSet) {
  return StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: c.bg,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── header ──────────────────────────────────────────────────
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing[5],
    paddingTop: spacing[5],
    paddingBottom: spacing[4],
  },
  title: {
    fontFamily: 'InterTight-Bold',
    fontSize: 28,
    color: c.fg,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 11,
    letterSpacing: 0.6,
    color: c.fg3,
    marginTop: 3,
  },
  titleActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[1],
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtn: {
    backgroundColor: c.sky,
    borderColor: c.sky,
  },

  // ── search ──────────────────────────────────────────────────
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing[5],
    marginBottom: spacing[3],
    backgroundColor: c.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: c.border,
    paddingHorizontal: spacing[3],
    height: 40,
  },
  searchIcon: {
    marginRight: spacing[2],
  },
  searchInput: {
    flex: 1,
    fontFamily: 'InterTight-Regular',
    fontSize: 14,
    color: c.fg,
  },

  // ── filter chips ────────────────────────────────────────────
  chipScroll: {
    marginBottom: spacing[3],
  },
  chipContent: {
    paddingHorizontal: spacing[5],
    gap: spacing[2],
    flexDirection: 'row',
  },
  chip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radii.pill,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
  },
  chipActive: {
    backgroundColor: c.sky,
    borderColor: c.sky,
  },
  chipText: {
    fontFamily: 'InterTight-Medium',
    fontSize: 13,
    color: c.fg2,
  },
  chipTextActive: {
    color: c.onSky,
  },

  // ── list ────────────────────────────────────────────────────
  listContent: {
    paddingBottom: spacing[10],
  },
  listContentCompact: {
    paddingBottom: spacing[10],
  },

  // ── empty ───────────────────────────────────────────────────
  empty: {
    alignItems: 'center',
    paddingTop: spacing[16],
    paddingHorizontal: spacing[8],
    gap: spacing[2],
  },
  emptyTitle: {
    fontFamily: 'InterTight-SemiBold',
    fontSize: 18,
    color: c.fg,
    marginTop: spacing[3],
  },
  emptyBody: {
    fontFamily: 'InterTight-Regular',
    fontSize: 14,
    color: c.fg3,
    textAlign: 'center',
  },
  emptyBtn: {
    marginTop: spacing[4],
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
    backgroundColor: c.sky,
    borderRadius: radii.md,
  },
  emptyBtnText: {
    fontFamily: 'InterTight-SemiBold',
    fontSize: 14,
    color: c.onSky,
  },
  });
}
