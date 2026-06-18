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
  Modal,
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
import VoiceLogModal from '@/components/ui/VoiceLogModal';
import { useVoiceLogEnabled } from '@/lib/useVoiceLogEnabled';
import { prewarmTTS } from '@/lib/openaiTTS';

type Layout = 'Compact' | 'Cards' | 'Timeline';

const JUMP_CACHE_KEY = '@jumplogs/jumps_list_cache';
const JUMP_CACHE_LIMIT = 10;
const SUB_CACHE_KEY  = '@jumplogs/sub_cache';

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmtTotalFF(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}H ${String(m).padStart(2, '0')}M`;
}

function monthKey(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-AU', { month: 'long', year: 'numeric', timeZone: 'UTC' }).toUpperCase();
}

// ─── screen ──────────────────────────────────────────────────────────────────

export default function LogScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { prefs } = usePrefs();
  const voiceLogEnabled = useVoiceLogEnabled();
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
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);
  const [subActive, setSubActive] = useState(false);
  const [voiceModalVisible, setVoiceModalVisible] = useState(false);
  const [voiceDisclaimerVisible, setVoiceDisclaimerVisible] = useState(false);
  const [isOfflineCache, setIsOfflineCache] = useState(false);

  // ── data fetch ────────────────────────────────────────────────────────────
  const fetchAll = async () => {
    try {
    await supabase.auth.refreshSession().catch(() => null);
    // getUser() requires network; fall back to getSession() (local storage) when offline
    let user = (await supabase.auth.getUser().catch(() => ({ data: { user: null } }))).data.user;
    if (!user) {
      user = (await supabase.auth.getSession().catch(() => ({ data: { session: null } }))).data.session?.user ?? null;
    }
    if (!user) { setLoading(false); return; }

    // Flush any locally-queued jumps first
    await trySyncQueue(supabase).catch(() => null);

    const [{ data: userData }, { data: jumpData }, { data: subData }] = await Promise.all([
      supabase.from('users').select('display_layout_jump_list').eq('id', user.id).single(),
      supabase
        .from('jumps')
        .select('*, dropzones(name, region, latitude, longitude), signatures(id, signed_at)')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('date', { ascending: false })
        .order('jump_number', { ascending: false }),
      supabase
        .from('subscriptions')
        .select('status, renews_at')
        .eq('user_id', user.id)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    setUserCreatedAt(user.created_at);
    setTrialEndsAt((user.user_metadata?.trial_ends_at as string) ?? null);
    const cancelledInGrace =
      subData?.status === 'cancelled' &&
      !!subData?.renews_at &&
      new Date(subData.renews_at) > new Date();
    setSubActive(
      subData?.status === 'active' ||
      subData?.status === 'overdue' ||
      cancelledInGrace,
    );
    // Persist subscription state so the offline catch block can enforce access correctly
    await AsyncStorage.setItem(SUB_CACHE_KEY, JSON.stringify({
      status:        subData?.status   ?? null,
      renews_at:     subData?.renews_at ?? null,
      trial_ends_at: (user.user_metadata?.trial_ends_at as string) ?? null,
      created_at:    user.created_at,
    })).catch(() => null);

    if (userData?.display_layout_jump_list) {
      setLayout(userData.display_layout_jump_list as Layout);
    }
    // Merge queued (unsynced) jumps with DB/cached jumps, then sort by jump number
    const queuedJumps = (await getRawQueue()).map(queuedToJumpFull);
    let displayJumps: JumpFull[] = [];
    if (jumpData) {
      // Online: cache the most recent jumps for offline use
      const toCache = (jumpData as JumpFull[]).slice(0, JUMP_CACHE_LIMIT);
      await AsyncStorage.setItem(JUMP_CACHE_KEY, JSON.stringify(toCache)).catch(() => null);
      displayJumps = jumpData as JumpFull[];
      setIsOfflineCache(false);
    } else {
      // Offline: fall back to cached list
      const raw = await AsyncStorage.getItem(JUMP_CACHE_KEY).catch(() => null);
      if (raw) { displayJumps = JSON.parse(raw); setIsOfflineCache(true); }
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
      const raw    = await AsyncStorage.getItem(JUMP_CACHE_KEY).catch(() => null);
      const cached: JumpFull[] = raw ? JSON.parse(raw) : [];
      const merged = [...queuedJumps, ...cached];
      merged.sort((a, b) => (b.jump_number ?? 0) - (a.jump_number ?? 0));
      setJumps(merged);
      if (cached.length > 0) setIsOfflineCache(true);

      // Restore subscription state so access gates work correctly when offline.
      // Without this, subActive stays false and trialEndsAt stays null, which
      // makes trialExpired always false — letting expired/cancelled users log jumps.
      const subRaw = await AsyncStorage.getItem(SUB_CACHE_KEY).catch(() => null);
      if (subRaw) {
        const s = JSON.parse(subRaw) as { status: string | null; renews_at: string | null; trial_ends_at: string | null; created_at: string };
        const grace = s.status === 'cancelled' && !!s.renews_at && new Date(s.renews_at) > new Date();
        setSubActive(s.status === 'active' || s.status === 'overdue' || grace);
        setTrialEndsAt(s.trial_ends_at);
        setUserCreatedAt(s.created_at);
      }

      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchAll(); }, []));

  // ── subscription gate ─────────────────────────────────────────────────────
  const trialEnd = (() => {
    if (trialEndsAt) { const d = new Date(trialEndsAt); if (!isNaN(d.getTime())) return d; }
    return userCreatedAt ? new Date(new Date(userCreatedAt).getTime() + 14 * 86400000) : null;
  })();
  const trialExpired = !subActive && !!trialEnd && Date.now() >= trialEnd.getTime();

  const handleAddJump = () => {
    if (trialExpired) {
      router.push({ pathname: '/paywall', params: { reason: 'trial_expired' } } as any);
    } else {
      router.push('/(tabs)/log/new');
    }
  };

  const handleVoiceOpen = () => {
    if (trialExpired) {
      router.push({ pathname: '/paywall', params: { reason: 'trial_expired' } } as any);
    } else {
      // Start prewarming the opening greeting immediately while the disclaimer is shown
      const greeting = suggestedJumpNumber
        ? `I'll log jump ${suggestedJumpNumber}. Tell me about your jump — say the dropzone, aircraft, exit altitude, freefall and canopy times, and jump type. Just speak naturally.`
        : `Tell me about your jump. Say the dropzone, aircraft, exit altitude, freefall and canopy times, and jump type. Speak naturally and I'll fill in what I can.`;
      prewarmTTS(greeting);
      setVoiceDisclaimerVisible(true);
    }
  };

  const handleVoiceComplete = () => {
    setVoiceModalVisible(false);
    router.push({ pathname: '/(tabs)/log/new', params: { voicePrefill: '1' } } as any);
  };
  const totalFF = useMemo(
    () => jumps.reduce((s, j) => s + (j.freefall_seconds ?? 0), 0),
    [jumps],
  );

  const filterTypes = useMemo(
    () => ['All', ...Array.from(new Set(jumps.map(j => j.jump_type).filter(Boolean) as string[]))],
    [jumps],
  );

  // ── is any filter/sort active? ────────────────────────────────────────────
  const isFilterActive = useMemo(() =>
    activeFilter !== 'All' ||
    searchQuery.trim().length > 0 ||
    filter.jumpTypes.length > 0 ||
    filter.favouritesOnly ||
    filter.signedOnly ||
    filter.sort !== DEFAULT_FILTER.sort,
  [activeFilter, searchQuery, filter]);

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
    if (filter.signedOnly) {
      list = list.filter(j => (j.signatures?.length ?? 0) > 0);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(j =>
        j.dropzones?.name?.toLowerCase().includes(q) ||
        j.jump_type?.toLowerCase().includes(q) ||
        String(j.jump_number).includes(q),
      );
    }
    // Sort — always use jump_number as primary order so late-logged jumps
    // (e.g. logging #301 after #302) appear in the correct sequence.
    if (filter.sort === 'date_asc') {
      list = [...list].sort((a, b) => (a.jump_number ?? 0) - (b.jump_number ?? 0));
    } else if (filter.sort === 'date_desc') {
      list = [...list].sort((a, b) => (b.jump_number ?? 0) - (a.jump_number ?? 0));
    } else if (filter.sort === 'jump_num') {
      list = [...list].sort((a, b) => (b.jump_number ?? 0) - (a.jump_number ?? 0));
    } else if (filter.sort === 'freefall') {
      list = [...list].sort((a, b) => (b.freefall_seconds ?? 0) - (a.freefall_seconds ?? 0));
    }
    return list;
  }, [jumps, activeFilter, searchQuery, filter]);

  // ── derived hint for voice agent ──────────────────────────────────────────
  const suggestedJumpNumber = jumps.length > 0
    ? (jumps[0].jump_number ?? 0) + 1
    : undefined;

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

  // ── offline cache banner ──────────────────────────────────────────────────
  const OfflineBanner = isOfflineCache ? (
    <View style={styles.offlineBanner}>
      <Ionicons name="cloud-offline-outline" size={14} color={colors.fg3} />
      <Text style={styles.offlineBannerText}>
        Showing last {JUMP_CACHE_LIMIT} cached jumps · Pull to refresh when online
      </Text>
    </View>
  ) : null;

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
            <Ionicons name="options-outline" size={19} color={isFilterActive ? colors.sky : colors.fg2} />
            {isFilterActive && (
              <View style={styles.filterDot} />
            )}
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
  const Empty = isFilterActive ? (
    <View style={styles.empty}>
      <Ionicons name="filter-outline" size={48} color={colors.fg3} />
      <Text style={styles.emptyTitle}>No jumps match</Text>
      <Text style={styles.emptyBody}>Your current filters didn’t match any jumps</Text>
      <TouchableOpacity
        style={styles.emptyBtn}
        onPress={() => {
          setActiveFilter('All');
          setSearchQuery('');
          setFilter(DEFAULT_FILTER);
        }}
      >
        <Text style={styles.emptyBtnText}>Clear filters</Text>
      </TouchableOpacity>
    </View>
  ) : (
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
      allJumps={jumps}
    />
  );

  const fabEl = voiceLogEnabled ? (
    <TouchableOpacity style={styles.fab} onPress={handleVoiceOpen} activeOpacity={0.85}>
      <Ionicons name="mic" size={26} color={colors.onSky} />
    </TouchableOpacity>
  ) : null;

  const voiceModalEl = (
    <VoiceLogModal
      visible={voiceModalVisible}
      onClose={() => setVoiceModalVisible(false)}
      onComplete={handleVoiceComplete}
      suggestedJumpNumber={suggestedJumpNumber}
    />
  );

  const voiceDisclaimerEl = (
    <Modal
      visible={voiceDisclaimerVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setVoiceDisclaimerVisible(false)}
    >
      <View style={styles.disclaimerOverlay}>
        <View style={styles.disclaimerCard}>
          <View style={styles.disclaimerIconRow}>
            <Ionicons name="mic" size={28} color={colors.sky} />
          </View>
          <Text style={styles.disclaimerTitle}>Voice Log</Text>
          <Text style={styles.disclaimerBody}>
            Voice logging is designed for{' '}
            <Text style={styles.disclaimerBold}>licensed jumpers</Text>.
            Student jumps require instructor sign-off and additional details that must be filled in manually.
          </Text>
          <TouchableOpacity
            style={styles.disclaimerBtn}
            activeOpacity={0.8}
            onPress={() => {
              setVoiceDisclaimerVisible(false);
              setVoiceModalVisible(true);
            }}
          >
            <Text style={styles.disclaimerBtnText}>Got it</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.disclaimerCancel}
            activeOpacity={0.7}
            onPress={() => setVoiceDisclaimerVisible(false)}
          >
            <Text style={styles.disclaimerCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  if (layout === 'Timeline') {
    return (
      <SafeAreaView style={styles.screen}>
        <FlatList
          data={timelineGroups}
          keyExtractor={g => g.month}
          ListHeaderComponent={Header}
          ListFooterComponent={OfflineBanner}
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
        {fabEl}
        {voiceModalEl}
        {voiceDisclaimerEl}
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
          ListFooterComponent={OfflineBanner}
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
        {fabEl}
        {voiceModalEl}
        {voiceDisclaimerEl}
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
        ListFooterComponent={OfflineBanner}
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
      {fabEl}
      {voiceModalEl}
      {voiceDisclaimerEl}
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

  // ── offline banner ───────────────────────────────────────────
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1.5],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[5],
    marginHorizontal: spacing[5],
    marginTop: spacing[2],
    marginBottom: spacing[4],
    backgroundColor: c.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: c.border,
  },
  offlineBannerText: {
    fontFamily: 'InterTight-Regular',
    fontSize: 12,
    color: c.fg3,
    textAlign: 'center',
    flexShrink: 1,
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
  filterDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: c.sky,
  },

  // ── voice FAB ────────────────────────────────────────────────
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 20,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: c.sky,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  disclaimerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing[5],
  },
  disclaimerCard: {
    backgroundColor: c.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: c.border,
    padding: spacing[6],
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
  },
  disclaimerIconRow: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: c.skyBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  disclaimerTitle: {
    fontFamily: 'InterTight-Bold',
    fontSize: 18,
    color: c.fg,
    letterSpacing: -0.3,
    marginBottom: spacing[3],
  },
  disclaimerBody: {
    fontFamily: 'InterTight-Regular',
    fontSize: 14,
    color: c.fg2,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: spacing[5],
  },
  disclaimerBold: {
    fontFamily: 'InterTight-Bold',
    color: c.fg,
  },
  disclaimerBtn: {
    backgroundColor: c.sky,
    borderRadius: radii.lg,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    width: '100%',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  disclaimerBtnText: {
    fontFamily: 'InterTight-Bold',
    fontSize: 15,
    color: c.onSky,
    letterSpacing: -0.2,
  },
  disclaimerCancel: {
    paddingVertical: spacing[2],
    width: '100%',
    alignItems: 'center',
  },
  disclaimerCancelText: {
    fontFamily: 'InterTight-Regular',
    fontSize: 14,
    color: c.fg3,
  },
  });
}
