import { useCallback, useState, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView, ActivityIndicator, RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { getAppVersion } from '@/lib/useForceUpgrade';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { getUnreadCount } from '@/lib/notifications';
import { spacing, radii } from '@/constants/tokens';

const SUB_CACHE_KEY = '@jumplogs/sub_cache';
import type { ColorSet } from '@/constants/tokens';
import { useColors } from '@/lib/theme';

const MENU_ITEMS = [
  { label: 'Edit profile', icon: 'person-outline', route: '/(tabs)/profile/edit' },
  { label: 'Settings', icon: 'settings-outline', route: '/(tabs)/profile/settings' },
  { label: 'Subscription', icon: 'star-outline', route: '/(tabs)/profile/subscription' },
  { label: 'Export logbook', icon: 'download-outline', route: '/(tabs)/profile/export' },
  { label: 'Manage tags', icon: 'pricetag-outline', route: '/(tabs)/profile/tags' },
  { label: 'Notifications', icon: 'notifications-outline', route: '/(tabs)/profile/notifications' },
  { label: 'Contact us', icon: 'mail-outline', route: '/(tabs)/profile/contact' },
] as const;

function initials(name: string | null | undefined, email: string | null | undefined) {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : parts[0].slice(0, 2).toUpperCase();
  }
  return (email?.[0] ?? '?').toUpperCase();
}

function formatFF(seconds: number | null): string {
  if (!seconds) return '0m';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function ProfileScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [profile, setProfile] = useState<{
    full_name: string | null;
    licence_number: string | null;
    licence_rating: string | null;
    country: string | null;
    date_of_birth: string | null;
    phone: string | null;
    home_dropzone_id: string | null;
    emergency_contact_name: string | null;
    emergency_contact_relationship: string | null;
    emergency_contact_phone: string | null;
  } | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [stats, setStats] = useState({ jumps: 0, ff: 0, appFF: 0, canopy: 0, appCanopy: 0, dzs: 0 });
  const [loading, setLoading] = useState(true);
  const [userCreatedAt, setUserCreatedAt] = useState<string | null>(null);
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);
  const [sub, setSub] = useState<{ status: string; renews_at: string | null } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      await supabase.auth.refreshSession().catch(() => null);
      // getUser() requires network; fall back to local session when offline
      let user = (await supabase.auth.getUser().catch(() => ({ data: { user: null } }))).data.user;
      if (!user) {
        user = (await supabase.auth.getSession().catch(() => ({ data: { session: null } }))).data.session?.user ?? null;
      }
      if (!user) { setLoading(false); return; }
      setEmail(user.email ?? null);

      const [profileRes, jumpsRes, subRes, unreadCount, adminCheck] = await Promise.all([
        supabase.from('users').select('full_name, licence_number, licence_rating, country, date_of_birth, phone, home_dropzone_id, emergency_contact_name, emergency_contact_relationship, emergency_contact_phone, prior_freefall_seconds, prior_canopy_seconds').eq('id', user.id).single(),
        supabase.from('jumps').select('freefall_seconds, canopy_seconds, dropzone_id, jump_number').eq('user_id', user.id).is('deleted_at', null),
        supabase.from('subscriptions').select('status, renews_at').eq('user_id', user.id).order('started_at', { ascending: false }).limit(1).maybeSingle(),
        getUnreadCount(supabase, user.id).catch(() => 0),
        supabase.rpc('is_admin'),
      ]);
      setIsAdmin(adminCheck.data === true);

      setUnreadNotifs(unreadCount as number);
      setUserCreatedAt(user.created_at);
      setTrialEndsAt((user.user_metadata?.trial_ends_at as string) ?? null);
      setSub(subRes.data ?? null);

      // Keep sub cache fresh for offline use
      await AsyncStorage.setItem(SUB_CACHE_KEY, JSON.stringify({
        status:        subRes.data?.status   ?? null,
        renews_at:     subRes.data?.renews_at ?? null,
        trial_ends_at: (user.user_metadata?.trial_ends_at as string) ?? null,
        created_at:    user.created_at,
      })).catch(() => null);

      setProfile(profileRes.data ?? null);
      const jumps = jumpsRes.data ?? [];
      const appFF = jumps.reduce((s, j) => s + (j.freefall_seconds ?? 0), 0);
      const appCanopy = jumps.reduce((s, j) => s + ((j as any).canopy_seconds ?? 0), 0);
      const priorFF = (profileRes.data as any)?.prior_freefall_seconds ?? 0;
      const priorCanopy = (profileRes.data as any)?.prior_canopy_seconds ?? 0;
      const dzCount = new Set(jumps.map(j => j.dropzone_id).filter(Boolean)).size;
      // Use the highest jump number as the career total — correctly reflects
      // users who started logging mid-career (e.g. started at jump #250)
      const maxJumpNum = jumps.reduce((mx, j) => Math.max(mx, (j as any).jump_number ?? 0), 0);
      setStats({ jumps: maxJumpNum || jumps.length, ff: appFF + priorFF, appFF, canopy: appCanopy + priorCanopy, appCanopy, dzs: dzCount });
    } catch {
      // Offline: restore subscription state from cache so the badge shows the
      // correct status (active/trial/expired) rather than defaulting to FREE.
      const subRaw = await AsyncStorage.getItem(SUB_CACHE_KEY).catch(() => null);
      if (subRaw) {
        const s = JSON.parse(subRaw) as { status: string | null; renews_at: string | null; trial_ends_at: string | null; created_at: string };
        setSub(s.status ? { status: s.status, renews_at: s.renews_at } : null);
        setTrialEndsAt(s.trial_ends_at);
        setUserCreatedAt(s.created_at);
      }
    }
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    load();
  }, [load]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace('/welcome');
  };

  if (loading) return <View style={[styles.center, { backgroundColor: colors.bg }]}><ActivityIndicator color={colors.sky} /></View>;

  const name = profile?.full_name;
  const licence = profile?.licence_number;
  const ini = initials(name, email);

  // Subscription / trial status
  const trialEnd = (() => {
    if (trialEndsAt) { const d = new Date(trialEndsAt); if (!isNaN(d.getTime())) return d; }
    return userCreatedAt ? new Date(new Date(userCreatedAt).getTime() + 14 * 86400000) : null;
  })();
  const noActiveSub = !sub || sub.status === 'trial';
  const inTrial = noActiveSub && !!trialEnd && Date.now() < trialEnd.getTime();
  const trialExpired = noActiveSub && !!trialEnd && Date.now() >= trialEnd.getTime();
  const trialDaysLeft = trialEnd ? Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / 86400000)) : 0;
  const incompleteCount = profile ? [
    profile.full_name,
    profile.licence_number,
    profile.licence_rating,
    profile.country,
    profile.date_of_birth,
    profile.phone,
    profile.home_dropzone_id,
    profile.emergency_contact_name,
    profile.emergency_contact_relationship,
    profile.emergency_contact_phone,
  ].filter(v => !v).length : 0;

  const cancelledInGrace =
    sub?.status === 'cancelled' &&
    !!sub?.renews_at &&
    new Date(sub.renews_at) > new Date();

  const subBadge = isAdmin
    ? { label: 'ADMIN', bg: colors.skyBg, text: colors.sky }
    : sub?.status === 'active'
    ? { label: 'ACTIVE', bg: colors.okBg, text: colors.ok }
    : sub?.status === 'overdue'
    ? { label: 'OVERDUE', bg: colors.warnBg, text: colors.warn }
    : cancelledInGrace
    ? { label: 'CANCELLED', bg: colors.warnBg, text: colors.warn }
    : sub?.status === 'cancelled'
    ? { label: 'CANCELLED', bg: colors.surface2, text: colors.fg3 }
    : inTrial
    ? { label: `TRIAL · ${trialDaysLeft}d left`, bg: colors.skyBg, text: colors.sky }
    : trialExpired
    ? { label: 'TRIAL EXPIRED', bg: colors.warnBg, text: colors.warn }
    : { label: 'FREE', bg: colors.surface2, text: colors.fg3 };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.sky} />}
      >
        {/* Avatar row */}
        <View style={styles.hero}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{ini}</Text>
          </View>
          <Text style={styles.heroName}>{name ?? email ?? 'Skydiver'}</Text>
          {(licence || profile?.licence_rating) ? (
            <Text style={styles.heroLicence}>
              {[licence, profile?.licence_rating].filter(Boolean).join(' · ')}
            </Text>
          ) : null}
          <View style={styles.heroRow}>
            <View style={[styles.subBadge, { backgroundColor: subBadge.bg }]}>
              <Text style={[styles.subBadgeText, { color: subBadge.text }]}>{subBadge.label}</Text>
            </View>
          </View>
          {cancelledInGrace && sub?.renews_at && (
            <Text style={{ color: colors.fg3, fontSize: 11, marginTop: 4 }}>
              Access until {new Date(sub.renews_at).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })}
            </Text>
          )}
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.jumps}</Text>
            <Text style={styles.statLabel}>JUMPS</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{formatFF(stats.ff)}</Text>
            <Text style={styles.statLabel}>FF TIME</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{formatFF(stats.canopy)}</Text>
            <Text style={styles.statLabel}>CANOPY</Text>
          </View>
        </View>

        {/* Menu */}
        <View style={styles.menuCard}>
          {MENU_ITEMS.map((item, i) => (
            <TouchableOpacity
              key={item.route}
              style={[styles.menuRow, i === MENU_ITEMS.length - 1 && styles.menuRowLast]}
              onPress={() => {
                if (item.label === 'Export logbook' && !isAdmin && (trialExpired || (sub && sub.status !== 'active' && sub.status !== 'overdue' && !cancelledInGrace))) {
                  router.push({ pathname: '/paywall', params: { reason: 'trial_expired' } } as any);
                  return;
                }
                router.push(item.route as any);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name={item.icon as any} size={20} color={colors.fg2} />
              <Text style={styles.menuLabel}>{item.label}</Text>
              {item.label === 'Edit profile' && incompleteCount > 0 && (
                <View style={styles.incompleteBadge}>
                  <Text style={styles.incompleteBadgeText}>{incompleteCount}</Text>
                </View>
              )}
              {item.label === 'Notifications' && unreadNotifs > 0 && (
                <View style={styles.incompleteBadge}>
                  <Text style={styles.incompleteBadgeText}>{unreadNotifs}</Text>
                </View>
              )}
              {item.label === 'Subscription' && (
                <View style={[styles.menuSubBadge, { backgroundColor: subBadge.bg }]}>
                  <Text style={[styles.menuSubBadgeText, { color: subBadge.text }]}>{subBadge.label}</Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={16} color={colors.fg3} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Sign out */}
        <TouchableOpacity style={styles.signOut} onPress={handleSignOut} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={16} color={colors.danger} />
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
        <Text style={styles.version}>v{getAppVersion()}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(c: ColorSet) {
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  body: { padding: spacing[5], paddingBottom: spacing[12], gap: spacing[4] },
  hero: { alignItems: 'center', paddingVertical: spacing[4] },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: c.sky, justifyContent: 'center', alignItems: 'center', marginBottom: spacing[3] },
  avatarText: { fontFamily: 'InterTight-Bold', fontSize: 26, color: c.onSky },
  heroName: { fontFamily: 'InterTight-Bold', fontSize: 22, color: c.fg, letterSpacing: -0.5, marginBottom: spacing[1] },
  heroLicence: { fontFamily: 'JetBrainsMono-Regular', fontSize: 12, color: c.fg3, marginBottom: spacing[2] },
  heroRow: { flexDirection: 'row', gap: spacing[2] },
  subBadge: { borderRadius: radii.sm, paddingHorizontal: spacing[3], paddingVertical: 3 },
  subBadgeText: { fontFamily: 'JetBrainsMono-Regular', fontSize: 11, letterSpacing: 0.5 },
  proBadge: { backgroundColor: c.sky, borderRadius: radii.sm, paddingHorizontal: spacing[2], paddingVertical: 2 },
  proBadgeText: { fontFamily: 'JetBrainsMono-Regular', fontSize: 10, color: c.onSky, letterSpacing: 0.5 },
  currentBadge: { backgroundColor: c.okBg, borderRadius: radii.sm, paddingHorizontal: spacing[2], paddingVertical: 2 },
  currentBadgeText: { fontFamily: 'JetBrainsMono-Regular', fontSize: 10, color: c.ok, letterSpacing: 0.5 },
  statsRow: { flexDirection: 'row', gap: spacing[3] },
  statCard: { flex: 1, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: radii.md, paddingVertical: spacing[3], alignItems: 'center' },
  statValue: { fontFamily: 'InterTight-Bold', fontSize: 20, color: c.fg, letterSpacing: -0.5 },
  statLabel: { fontFamily: 'JetBrainsMono-Regular', fontSize: 9, color: c.fg3, marginTop: 3, letterSpacing: 0.5 },
  menuCard: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: radii.lg, overflow: 'hidden' },
  menuRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing[4], paddingVertical: spacing[4], borderBottomWidth: 1, borderBottomColor: c.border, gap: spacing[3] },
  menuRowLast: { borderBottomWidth: 0 },
  menuLabel: { flex: 1, fontFamily: 'InterTight-Medium', fontSize: 15, color: c.fg },
  menuSubBadge: { borderRadius: radii.sm, paddingHorizontal: spacing[2], paddingVertical: 2, marginRight: spacing[1] },
  menuSubBadgeText: { fontFamily: 'JetBrainsMono-Regular', fontSize: 9, letterSpacing: 0.5 },
  incompleteBadge: { backgroundColor: c.warn, borderRadius: 10, minWidth: 20, height: 20, paddingHorizontal: 6, justifyContent: 'center', alignItems: 'center', marginRight: spacing[1] },
  incompleteBadgeText: { fontFamily: 'JetBrainsMono-Regular', fontSize: 10, color: c.bg, fontWeight: '700' },
  signOut: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2], paddingVertical: spacing[3.5], borderWidth: 1, borderColor: c.danger, borderRadius: radii.lg, backgroundColor: c.dangerBg },
  signOutText: { fontFamily: 'InterTight-SemiBold', fontSize: 15, color: c.danger },
  version: { textAlign: 'center', fontFamily: 'JetBrainsMono-Regular', fontSize: 11, color: c.fg4, paddingBottom: spacing[4] },
  });
}