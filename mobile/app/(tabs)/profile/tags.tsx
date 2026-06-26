import { useCallback, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet,  ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { spacing, radii } from '@/constants/tokens';
import type { ColorSet } from '@/constants/tokens';
import { useColors } from '@/lib/theme';
import type { TagData } from '@/lib/types';

// Fixed palette — auto-assigned in rotation when a tag is created
const TAG_PALETTE = [
  '#4A9EFF', '#4ADE80', '#CE93D8', '#FFB74A',
  '#F48FB1', '#4DD0E1', '#EF9A9A', '#A5D6A7',
];

function pickColor(existingTags: TagData[]): string {
  return TAG_PALETTE[existingTags.length % TAG_PALETTE.length];
}

export default function TagsScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [tags, setTags] = useState<TagData[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from('tags')
      .select('id, name, color')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });
    setTags((data as TagData[]) ?? []);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    if (tags.some(t => t.name.toLowerCase() === name.toLowerCase())) {
      Alert.alert('Duplicate tag', `"${name}" already exists.`);
      return;
    }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const color = pickColor(tags);
    const { data, error } = await supabase
      .from('tags')
      .insert({ user_id: user.id, name, color })
      .select('id, name, color')
      .single();
    setSaving(false);
    if (error) { Alert.alert('Error', error.message); return; }
    setTags(prev => [...prev, data as TagData]);
    setNewName('');
  };

  const handleDelete = (tag: TagData) => {
    Alert.alert(
      'Delete tag',
      `Remove "${tag.name}"? It will also be removed from all jumps tagged with it.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.from('tags').delete().eq('id', tag.id);
            if (error) { Alert.alert('Error', error.message); return; }
            setTags(prev => prev.filter(t => t.id !== tag.id));
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.sky} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={colors.fg} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage tags</Text>
        <View style={styles.backBtn} />
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <FlatList
          data={tags}
          keyExtractor={t => t.id}
          style={{ flex: 1 }}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No tags yet.{'\n'}Add your first tag below.</Text>
            </View>
          }
          ListHeaderComponent={
            <Text style={styles.hint}>
              Tags let you categorise jumps with custom labels. Select them when logging a jump and filter your logbook by tag.
            </Text>
          }
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={[styles.dot, { backgroundColor: item.color }]} />
              <Text style={styles.tagName}>{item.name}</Text>
              <TouchableOpacity onPress={() => handleDelete(item)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="trash-outline" size={18} color={colors.fg3} />
              </TouchableOpacity>
            </View>
          )}
        />

        {/* Add tag input */}
        <View style={styles.addBar}>
          <TextInput
            style={styles.input}
            value={newName}
            onChangeText={setNewName}
            placeholder="New tag name…"
            placeholderTextColor={colors.fg3}
            returnKeyType="done"
            onSubmitEditing={handleAdd}
            maxLength={40}
          />
          <TouchableOpacity
            style={[styles.addBtn, (!newName.trim() || saving) && { opacity: 0.45 }]}
            onPress={handleAdd}
            disabled={!newName.trim() || saving}
            activeOpacity={0.8}
          >
            {saving
              ? <ActivityIndicator size="small" color={colors.onSky} />
              : <Ionicons name="add" size={20} color={colors.onSky} />
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(colors: ColorSet) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing[5], paddingVertical: spacing[3], borderBottomWidth: 1, borderBottomColor: colors.border },
    backBtn: { width: 36, height: 36, justifyContent: 'center' },
    headerTitle: { flex: 1, textAlign: 'center', fontFamily: 'InterTight-SemiBold', fontSize: 17, color: colors.fg },
    list: { padding: spacing[5], paddingBottom: spacing[3] },
    hint: {
      fontFamily: 'InterTight-Regular', fontSize: 13, color: colors.fg3,
      lineHeight: 19, marginBottom: spacing[5],
    },
    emptyBox: { alignItems: 'center', paddingVertical: spacing[8] },
    emptyText: { fontFamily: 'InterTight-Regular', fontSize: 14, color: colors.fg3, textAlign: 'center', lineHeight: 22 },
    row: {
      flexDirection: 'row', alignItems: 'center', gap: spacing[3],
      paddingVertical: spacing[3.5],
      borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    dot: { width: 10, height: 10, borderRadius: 5 },
    tagName: { flex: 1, fontFamily: 'InterTight-Medium', fontSize: 15, color: colors.fg },
    addBar: {
      flexDirection: 'row', gap: spacing[3],
      padding: spacing[4], borderTopWidth: 1, borderTopColor: colors.border,
      backgroundColor: colors.surface,
    },
    input: {
      flex: 1, height: 44,
      backgroundColor: colors.surface2, borderRadius: radii.base,
      borderWidth: 1, borderColor: colors.border,
      paddingHorizontal: spacing[3],
      fontFamily: 'InterTight-Regular', fontSize: 15, color: colors.fg,
    },
    addBtn: {
      width: 44, height: 44, borderRadius: radii.base,
      backgroundColor: colors.sky, alignItems: 'center', justifyContent: 'center',
    },
  });
}
