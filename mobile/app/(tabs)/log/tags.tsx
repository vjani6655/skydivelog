import { useCallback, useState, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, SafeAreaView, ActivityIndicator, TouchableOpacity, TextInput } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { spacing, radii } from '@/constants/tokens';
import type { ColorSet } from '@/constants/tokens';
import { useColors } from '@/lib/theme';
import type { TagData } from '@/lib/types';

// Tag colors palette
const TAG_COLORS = ['#4A9EFF', '#34D2D6', '#FFB74A', '#4ADE80', '#FF6B6B', '#A78BFA', '#F472B6', '#FB923C'];

interface TagWithCount extends TagData {
  jumpCount: number;
}

export default function TagsScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [tags, setTags] = useState<TagWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useFocusEffect(useCallback(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) { setLoading(false); return; }

      const { data: tagRows } = await supabase.from('tags').select('*').eq('user_id', user.id);
      if (!tagRows) { setLoading(false); return; }

      // Get jump counts for each tag
      const { data: jtRows } = await supabase.from('jump_tags').select('tag_id');
      const countMap = new Map<string, number>();
      (jtRows ?? []).forEach((r: { tag_id: string }) => {
        countMap.set(r.tag_id, (countMap.get(r.tag_id) ?? 0) + 1);
      });

      setTags(tagRows.map((t: TagData) => ({ ...t, jumpCount: countMap.get(t.id) ?? 0 })));
      setLoading(false);
    })();
  }, []));

  const filtered = search.trim()
    ? tags.filter(t => t.name.toLowerCase().includes(search.trim().toLowerCase()))
    : tags;

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.back} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={colors.fg} />
        </TouchableOpacity>
        <Text style={styles.title}>Tags</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={16} color={colors.fg3} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search tags…"
          placeholderTextColor={colors.fg3}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.sky} /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={t => t.id}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={{ gap: spacing[3] }}
          renderItem={({ item: t }) => {
            const color = t.color || colors.sky;
            return (
              <TouchableOpacity style={styles.card} activeOpacity={0.7}>
                <View style={styles.cardHeader}>
                  <View style={[styles.dot, { backgroundColor: color }]} />
                  <Text style={styles.tagName}>{t.name}</Text>
                </View>
                <Text style={styles.count}>{t.jumpCount}</Text>
                <Text style={styles.countLabel}>{t.jumpCount === 1 ? 'JUMP' : 'JUMPS'}</Text>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="pricetag-outline" size={44} color={colors.fg3} />
              <Text style={styles.emptyTitle}>No tags yet</Text>
              <Text style={styles.emptySub}>Add tags when logging a jump</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

function makeStyles(c: ColorSet) {
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing[5], paddingVertical: spacing[4] },
  back: { width: 36, height: 36, justifyContent: 'center' },
  title: { flex: 1, textAlign: 'center', fontFamily: 'InterTight-Bold', fontSize: 22, color: c.fg, letterSpacing: -0.4 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginHorizontal: spacing[5], marginBottom: spacing[4], backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: radii.md, paddingHorizontal: spacing[3], height: 40 },
  searchInput: { flex: 1, fontFamily: 'InterTight-Regular', fontSize: 14, color: c.fg },
  grid: { paddingHorizontal: spacing[5], paddingBottom: spacing[10] },
  card: { flex: 1, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: radii.md, padding: spacing[4], marginBottom: spacing[3] },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: spacing[3] },
  dot: { width: 9, height: 9, borderRadius: 5 },
  tagName: { fontFamily: 'InterTight-SemiBold', fontSize: 15, color: c.fg },
  count: { fontFamily: 'JetBrainsMono-Medium', fontSize: 22, color: c.fg },
  countLabel: { fontFamily: 'JetBrainsMono-Regular', fontSize: 10, letterSpacing: 0.8, color: c.fg3, marginTop: 2 },
  empty: { alignItems: 'center', paddingTop: spacing[16], gap: spacing[2] },
  emptyTitle: { fontFamily: 'InterTight-SemiBold', fontSize: 17, color: c.fg, marginTop: spacing[3] },
  emptySub: { fontFamily: 'InterTight-Regular', fontSize: 14, color: c.fg3 },
  });
}
