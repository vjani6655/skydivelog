import { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, SafeAreaView, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { colors, spacing, radii } from '@/constants/tokens';
import type { JumpFull } from '@/lib/types';

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
}

export default function FavouritesScreen() {
  const [jumps, setJumps] = useState<JumpFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetch = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from('jumps')
      .select('*, dropzones(name, region, latitude, longitude)')
      .eq('user_id', user.id)
      .eq('is_favourite', true)
      .is('deleted_at', null)
      .order('date', { ascending: false });
    setJumps((data ?? []) as JumpFull[]);
    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(useCallback(() => { fetch(); }, []));

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.back} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={colors.fg} />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Favourites</Text>
          <Text style={styles.sub}>{jumps.length} STARRED JUMPS</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.sky} /></View>
      ) : (
        <FlatList
          data={jumps}
          keyExtractor={j => j.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetch(); }} tintColor={colors.sky} />}
          renderItem={({ item: j }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push(`/(tabs)/log/${j.id}`)}
              activeOpacity={0.7}
            >
              <View style={styles.cardTop}>
                <View style={styles.cardLeft}>
                  <View style={styles.overlineRow}>
                    <Ionicons name="star" size={13} color={colors.warn} />
                    <Text style={styles.overline}>JUMP #{j.jump_number}</Text>
                  </View>
                  <Text style={styles.jumpType}>{j.jump_type ?? '—'}</Text>
                  <Text style={styles.dzLine}>{j.dropzones?.name ?? '—'} · {fmtDate(j.date)}</Text>
                </View>
                <View style={styles.cardRight}>
                  <Text style={styles.alt}>{j.exit_altitude_ft ? Math.round(j.exit_altitude_ft / 1000) + 'k' : '—'}</Text>
                  <Text style={styles.ff}>{j.freefall_seconds ? j.freefall_seconds + 's FF' : ''}</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="star-outline" size={44} color={colors.fg3} />
              <Text style={styles.emptyTitle}>No favourites yet</Text>
              <Text style={styles.emptySub}>Star jumps from the detail screen</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing[5], paddingVertical: spacing[4] },
  back: { width: 36, height: 36, justifyContent: 'center' },
  title: { fontFamily: 'InterTight-Bold', fontSize: 22, color: colors.fg, letterSpacing: -0.4 },
  sub: { fontFamily: 'JetBrainsMono-Regular', fontSize: 10, letterSpacing: 0.8, color: colors.fg3, marginTop: 2 },
  list: { paddingHorizontal: spacing[5], paddingBottom: spacing[10] },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing[4], marginBottom: spacing[3] },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardLeft: { flex: 1 },
  overlineRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[1], marginBottom: spacing[1] },
  overline: { fontFamily: 'JetBrainsMono-Regular', fontSize: 11, color: colors.fg3 },
  jumpType: { fontFamily: 'InterTight-SemiBold', fontSize: 16, color: colors.fg },
  dzLine: { fontFamily: 'InterTight-Regular', fontSize: 12, color: colors.fg2, marginTop: 2 },
  cardRight: { alignItems: 'flex-end' },
  alt: { fontFamily: 'JetBrainsMono-Medium', fontSize: 14, color: colors.fg },
  ff: { fontFamily: 'JetBrainsMono-Regular', fontSize: 11, color: colors.fg3, marginTop: 2 },
  empty: { alignItems: 'center', paddingTop: spacing[16], gap: spacing[2] },
  emptyTitle: { fontFamily: 'InterTight-SemiBold', fontSize: 17, color: colors.fg, marginTop: spacing[3] },
  emptySub: { fontFamily: 'InterTight-Regular', fontSize: 14, color: colors.fg3 },
});
