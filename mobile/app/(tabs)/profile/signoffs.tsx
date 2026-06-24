import { useCallback, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet,  ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { spacing, radii } from '@/constants/tokens';
import type { ColorSet } from '@/constants/tokens';
import { useColors } from '@/lib/theme';

interface Signoff {
  id: string;
  jump_number: number;
  signoff_date: string;
  description: string;
  signer_name: string;
  signer_role: string;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function SignoffsScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [signoffs, setSignoffs] = useState<Signoff[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    (async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from('signoffs')
        .select('id, jump_number, signoff_date, description, signer_name, signer_role')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setSignoffs((data as Signoff[]) ?? []);
      setLoading(false);
    })();
  }, []));

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.back} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={colors.fg} />
        </TouchableOpacity>
        <Text style={styles.title}>Sign-offs</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push('/(tabs)/profile/signoff-new' as any)}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={24} color={colors.sky} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.sky} /></View>
      ) : (
        <FlatList
          data={signoffs}
          keyExtractor={s => s.id}
          style={{ flex: 1 }}
          contentContainerStyle={signoffs.length === 0 ? styles.emptyContainer : styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="ribbon-outline" size={44} color={colors.fg3} />
              <Text style={styles.emptyTitle}>No sign-offs yet</Text>
              <Text style={styles.emptySub}>Tap + to record a new sign-off</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push({ pathname: '/(tabs)/profile/signoff-detail' as any, params: { id: item.id } })}
              activeOpacity={0.7}
            >
              <View style={styles.cardTop}>
                <View style={styles.rolePill}>
                  <Text style={styles.roleText}>{item.signer_role}</Text>
                </View>
                <Text style={styles.cardDate}>{fmtDate(item.signoff_date)}</Text>
              </View>
              <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
              <Text style={styles.cardSigner}>Signed by {item.signer_name} · Jump #{item.jump_number}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

function makeStyles(c: ColorSet) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: spacing[5], paddingVertical: spacing[4],
      borderBottomWidth: 1, borderBottomColor: c.border,
    },
    back: { width: 36, height: 36, justifyContent: 'center' },
    title: { flex: 1, textAlign: 'center', fontFamily: 'InterTight-Bold', fontSize: 22, color: c.fg, letterSpacing: -0.4 },
    addBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'flex-end' },
    list: { padding: spacing[5], gap: spacing[3] },
    emptyContainer: { flex: 1 },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing[2] },
    emptyTitle: { fontFamily: 'InterTight-SemiBold', fontSize: 17, color: c.fg, marginTop: spacing[3] },
    emptySub: { fontFamily: 'InterTight-Regular', fontSize: 14, color: c.fg3 },
    card: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radii.md,
      padding: spacing[4],
      gap: spacing[2],
    },
    cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    rolePill: {
      backgroundColor: c.skyBg ?? c.sky + '22',
      borderWidth: 1,
      borderColor: c.sky,
      borderRadius: radii.pill,
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[1],
    },
    roleText: { fontFamily: 'JetBrainsMono-SemiBold', fontSize: 10, color: c.sky, letterSpacing: 0.5 },
    cardDate: { fontFamily: 'JetBrainsMono-Regular', fontSize: 11, color: c.fg3 },
    cardDesc: { fontFamily: 'InterTight-Medium', fontSize: 15, color: c.fg, lineHeight: 21 },
    cardSigner: { fontFamily: 'InterTight-Regular', fontSize: 12, color: c.fg3 },
  });
}
