import { useCallback, useState, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { spacing, radii } from '@/constants/tokens';
import type { ColorSet } from '@/constants/tokens';
import { useColors } from '@/lib/theme';

const MENU_ITEMS = [
  { label: 'Edit profile', icon: 'person-outline', route: '/(tabs)/profile/edit' },
  { label: 'Settings', icon: 'settings-outline', route: '/(tabs)/profile/settings' },
  { label: 'Subscription', icon: 'star-outline', route: '/(tabs)/profile/subscription' },
  { label: 'Export logbook', icon: 'download-outline', route: '/(tabs)/profile/export' },
  { label: 'Manage tags', icon: 'pricetag-outline', route: '/(tabs)/log/tags' },
  { label: 'Notifications', icon: 'notifications-outline', route: '/(tabs)/profile/notifications' },
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
  const [profile, setProfile] = useState<{ full_name: string | null; licence_number: string | null } | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [stats, setStats] = useState({ jumps: 0, ff: 0, dzs: 0 });
  const [loading, setLoading] = useState(true);
  const [userCreatedAt, setUserCreatedAt] = useState<string | null>(null);
  const [sub, setSub] = useState<{ status: string; renews_at: string | null } | null>(null);

  useFocusEffect(useCallback(() => {
    (async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) { setLoading(false); return; }
      setEmail(user.email ?? null);

      const [profileRes, jumpsRes, subRes] = await Promise.all([
        supabase.from('users').select('full_name, licence_number').eq('id', user.id).single(),
        supabase.from('jumps').select('freefall_seconds, dropzone_id, jump_number').eq('user_id', user.id).is('deleted_at', null),
        supabase.from('subscriptions').select('status, renews_at').eq('user_id', user.id).order('started_at', { ascending: false }).limit(1).maybeSingle(),
      ]);

      setUserCreatedAt(user.created_at);
      setSub(subRes.data ?? null);

      setProfile(profileRes.data ?? null);
      const jumps = jumpsRes.data ?? [];
      const totalFF = jumps.reduce((s, j) => s + (j.freefall_seconds ?? 0), 0);
      const dzCount = new Set(jumps.map(j => j.dropzone_id).filter(Boolean)).size;
      // Use the highest jump number as the career total — correctly reflects
      // users who started logging mid-career (e.g. started at jump #250)
      const maxJumpNum = jumps.reduce((mx, j) => Math.max(mx, (j as any).jump_number ?? 0), 0);
      setStats({ jumps: maxJumpNum || jumps.length, ff: totalFF, dzs: dzCount });
      setLoading(false);
    })();
  }, []));

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace('/welcome');
  };

  if (loading) return <View style={[styles.center, { backgroundColor: colors.bg }]}><ActivityIndicator color={colors.sky} /></View>;

  const name = profile?.full_name;
  const licence = profile?.licence_number;
  const ini = initials(name, email);

  // Subscription / trial status
  const trialEnd = userCreatedAt ? new Date(new Date(userCreatedAt).getTime() + 14 * 86400000) : null;
  const inTrial = !sub && !!trialEnd && Date.now() < trialEnd.getTime();
  const trialExpired = !sub && !!trialEnd && Date.now() >= trialEnd.getTime();
  const trialDaysLeft = trialEnd ? Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / 86400000)) : 0;
  const subBadge = sub?.status === 'active'
    ? { label: 'ACTIVE', bg: colors.okBg, text: colors.ok }
    : sub?.status === 'overdue'
    ? { label: 'OVERDUE', bg: colors.warnBg, text: colors.warn }
    : sub?.status === 'cancelled'
    ? { label: 'CANCELLED', bg: colors.surface2, text: colors.fg3 }
    : inTrial
    ? { label: `TRIAL · ${trialDaysLeft}d left`, bg: colors.skyBg, text: colors.sky }
    : trialExpired
    ? { label: 'TRIAL EXPIRED', bg: colors.warnBg, text: colors.warn }
    : { label: 'FREE', bg: colors.surface2, text: colors.fg3 };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* Avatar row */}
        <View style={styles.hero}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{ini}</Text>
          </View>
          <Text style={styles.heroName}>{name ?? email ?? 'Skydiver'}</Text>
          {licence ? <Text style={styles.heroLicence}>{licence}</Text> : null}
          <View style={styles.heroRow}>
            <View style={[styles.subBadge, { backgroundColor: subBadge.bg }]}>
              <Text style={[styles.subBadgeText, { color: subBadge.text }]}>{subBadge.label}</Text>
            </View>
          </View>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          {[
            { label: 'JUMPS', value: stats.jumps },
            { label: 'FF TIME', value: formatFF(stats.ff) },
            { label: 'DZs', value: stats.dzs },
          ].map(s => (
            <View key={s.label} style={styles.statCard}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Menu */}
        <View style={styles.menuCard}>
          {MENU_ITEMS.map((item, i) => (
            <TouchableOpacity
              key={item.route}
              style={[styles.menuRow, i === MENU_ITEMS.length - 1 && styles.menuRowLast]}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.7}
            >
              <Ionicons name={item.icon as any} size={20} color={colors.fg2} />
              <Text style={styles.menuLabel}>{item.label}</Text>
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
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
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
  signOut: { paddingVertical: spacing[4], alignItems: 'center' },
  signOutText: { fontFamily: 'InterTight-SemiBold', fontSize: 15, color: c.danger },
  });
}