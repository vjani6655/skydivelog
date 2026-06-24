import { useCallback, useState, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet,  ActivityIndicator,
  TouchableOpacity, RefreshControl, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { checkAccess } from '@/lib/checkAccess';
import { spacing, radii } from '@/constants/tokens';
import type { ColorSet } from '@/constants/tokens';
import { useColors } from '@/lib/theme';
import type { Certificate } from '@/lib/types';

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

type FilterKey = 'all' | 'licence' | 'rating' | 'medical' | 'expiring';

const FILTER_CHIPS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'licence', label: 'Licences' },
  { key: 'rating', label: 'Ratings' },
  { key: 'medical', label: 'Medical' },
  { key: 'expiring', label: 'Expiring soon' },
];

function fmtMY(iso: string): string {
  return new Date(iso).toLocaleDateString('en-AU', { month: 'short', year: 'numeric' });
}

function fmtDMY(iso: string): string {
  return new Date(iso).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function CertificatesScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');

  const fetchCerts = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) { setLoading(false); return; }
    const { data } = await supabase.from('certificates').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    setCerts((data ?? []) as Certificate[]);
    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(useCallback(() => { fetchCerts(); }, []));

  const expiringSoon = certs.filter(c => c.expires_date && daysUntil(c.expires_date) <= 30).length;

  const filtered = certs.filter(c => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'expiring') return !!c.expires_date && daysUntil(c.expires_date) <= 30;
    return c.category === activeFilter;
  });

  if (loading) return <View style={[styles.center, { backgroundColor: colors.bg }]}><ActivityIndicator color={colors.sky} /></View>;

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Certificates</Text>
          {expiringSoon > 0 ? (
            <Text style={[styles.sub, { color: colors.warn }]}>{expiringSoon} OVERDUE OR EXPIRING</Text>
          ) : (
            <Text style={styles.sub}>{certs.length} CERTIFICATES</Text>
          )}
        </View>
        <TouchableOpacity
          style={[styles.iconBtn, styles.addBtn]}
          onPress={async () => {
            if (!await checkAccess()) {
              router.push({ pathname: '/paywall', params: { reason: 'trial_expired' } } as any);
              return;
            }
            router.push('/(tabs)/certificates/new');
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
        keyExtractor={c => c.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchCerts(); }} tintColor={colors.sky} />}
        ListHeaderComponent={activeFilter === 'expiring' ? (
          <View style={styles.infoBanner}>
            <Ionicons name="information-circle-outline" size={15} color={colors.warn} style={{ marginTop: 1 }} />
            <Text style={styles.infoBannerText}>Certificates that are expired or expire within the next 30 days.</Text>
          </View>
        ) : null}
        renderItem={({ item: c }) => {
          const hasExpiry = !!c.expires_date;
          const days = hasExpiry ? daysUntil(c.expires_date!) : null;
          const isWarn = days !== null && days <= 30 && days >= 0;
          const isDanger = days !== null && days < 0;
          const iconColor = isDanger ? colors.danger : isWarn ? colors.warn : colors.sky;
          const iconBg = isDanger ? 'rgba(255,107,107,0.12)' : isWarn ? 'rgba(255,183,74,0.12)' : 'rgba(74,158,255,0.12)';

          return (
            <TouchableOpacity style={styles.card} onPress={() => router.push(`/(tabs)/certificates/${c.id}` as any)} activeOpacity={0.75}>
              <View style={styles.cardRow}>
                <View style={[styles.certIcon, { backgroundColor: iconBg }]}>
                  <Ionicons name="ribbon-outline" size={20} color={iconColor} />
                </View>
                <View style={styles.cardInfo}>
                  <View style={styles.cardTop}>
                    <Text style={styles.certName}>{c.title}</Text>
                    {hasExpiry && days !== null ? (
                      <View style={[styles.badge, isDanger ? styles.badgeDanger : isWarn ? styles.badgeWarn : styles.badgeOk]}>
                        <Text style={[styles.badgeText, { color: isDanger ? colors.danger : isWarn ? colors.warn : colors.ok }]}>
                          {isDanger ? `${-days}D OVER` : `${days}D LEFT`}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.badgeMuted}><Text style={styles.badgeMutedText}>NO EXPIRY</Text></View>
                    )}
                  </View>
                  <Text style={styles.certMeta}>
                    {c.issuing_body ?? '—'} · ISSUED {c.issued_date ? fmtMY(c.issued_date) : '—'}{c.expires_date ? ` · EXPIRES ${fmtDMY(c.expires_date)}` : ''}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="ribbon-outline" size={44} color={colors.fg3} />
            <Text style={styles.emptyTitle}>No certificates yet</Text>
            <Text style={styles.emptySub}>Add your licences & ratings</Text>
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
  certIcon: { width: 40, height: 40, borderRadius: radii.md, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  cardInfo: { flex: 1 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[1] },
  certName: { fontFamily: 'InterTight-SemiBold', fontSize: 15, color: c.fg, flex: 1, marginRight: spacing[2] },
  certMeta: { fontFamily: 'JetBrainsMono-Regular', fontSize: 10, color: c.fg3 },
  badge: { paddingHorizontal: spacing[2], paddingVertical: 2, borderRadius: radii.sm },
  badgeOk: { backgroundColor: c.okBg },
  badgeWarn: { backgroundColor: 'rgba(255,183,74,0.12)' },
  badgeDanger: { backgroundColor: 'rgba(255,107,107,0.12)' },
  badgeMuted: { backgroundColor: c.surface2, paddingHorizontal: spacing[2], paddingVertical: 2, borderRadius: radii.sm },
  badgeText: { fontFamily: 'JetBrainsMono-Regular', fontSize: 10, letterSpacing: 0.3 },
  badgeMutedText: { fontFamily: 'JetBrainsMono-Regular', fontSize: 10, color: c.fg3 },
  empty: { alignItems: 'center', paddingTop: spacing[16], gap: spacing[2] },
  emptyTitle: { fontFamily: 'InterTight-SemiBold', fontSize: 17, color: c.fg, marginTop: spacing[3] },
  emptySub: { fontFamily: 'InterTight-Regular', fontSize: 14, color: c.fg3 },
  });
}
