import { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet,  TouchableOpacity, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { spacing, radii } from '@/constants/tokens';
import type { ColorSet } from '@/constants/tokens';
import { useColors } from '@/lib/theme';
import { supabase } from '@/lib/supabase';

function fmtDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-AU', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

type ActionButton = {
  label: string;
  icon: 'ribbon-outline' | 'shield-outline' | 'airplane-outline';
  onPress: () => void;
};

function getActionButton(data: Record<string, unknown>): ActionButton | null {
  const type = data.type as string | undefined;
  if ((type === 'cert_expiry') && data.cert_id) {
    return {
      label: 'View certificate',
      icon: 'ribbon-outline',
      onPress: () => router.push({ pathname: '/(tabs)/certificates/[id]' as any, params: { id: data.cert_id as string } }),
    };
  }
  if ((type === 'repack_due' || type === 'aad_service') && data.gear_id) {
    return {
      label: 'View gear',
      icon: 'shield-outline',
      onPress: () => router.push({ pathname: '/(tabs)/gear/[id]' as any, params: { id: data.gear_id as string } }),
    };
  }
  if (type === 'jump_logged' && data.jump_id) {
    return {
      label: 'View jump',
      icon: 'airplane-outline',
      onPress: () => router.push({ pathname: '/(tabs)/log/[id]' as any, params: { id: data.jump_id as string } }),
    };
  }
  return null;
}

export default function NotificationDetailScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { id, title: paramTitle, body: paramBody, created_at: paramCreatedAt, data: paramData } =
    useLocalSearchParams<{ id: string; title: string; body: string; created_at: string; data: string }>();

  const [loading, setLoading] = useState(!!id);
  const [title, setTitle] = useState(paramTitle ?? '');
  const [body, setBody] = useState(paramBody ?? '');
  const [createdAt, setCreatedAt] = useState(paramCreatedAt ?? '');
  const [data, setData] = useState<Record<string, unknown>>(() => {
    try { return JSON.parse(paramData ?? '{}'); } catch { return {}; }
  });

  // Fetch from DB to get accurate created_at and full data field
  useEffect(() => {
    if (!id) return;
    void (async () => {
      try {
        const { data: row } = await supabase.from('notifications')
          .select('title, body, data, created_at')
          .eq('id', id)
          .single();
        if (row) {
          setTitle(row.title);
          setBody(row.body);
          setCreatedAt(row.created_at);
          setData(row.data ?? {});
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const actionButton = useMemo(() => getActionButton(data), [data]);

  if (loading) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <View style={styles.center}><ActivityIndicator color={colors.sky} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={colors.fg} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notification</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.iconRow}>
            <View style={styles.iconWrap}>
              <Ionicons name="notifications" size={22} color={colors.sky} />
            </View>
          </View>

          <Text style={styles.title}>{title}</Text>

          {createdAt ? (
            <Text style={styles.date}>{fmtDate(createdAt)}</Text>
          ) : null}

          <View style={styles.divider} />

          <Text style={styles.bodyText}>{body}</Text>
        </View>

        {actionButton && (
          <TouchableOpacity style={styles.actionBtn} onPress={actionButton.onPress} activeOpacity={0.7}>
            <Ionicons name={actionButton.icon} size={18} color={colors.sky} />
            <Text style={styles.actionBtnText}>{actionButton.label}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.fg3} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(c: ColorSet) {
  return StyleSheet.create({
    screen:        { flex: 1, backgroundColor: c.bg },
    center:        { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing[5], paddingVertical: spacing[3], borderBottomWidth: 1, borderBottomColor: c.border },
    backBtn:       { width: 36, height: 36, justifyContent: 'center' },
    headerTitle:   { flex: 1, textAlign: 'center', fontFamily: 'InterTight-SemiBold', fontSize: 17, color: c.fg },
    body:          { padding: spacing[5], paddingBottom: spacing[12] },
    card:          { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: radii.lg, padding: spacing[5], gap: spacing[3] },
    iconRow:       { alignItems: 'flex-start' },
    iconWrap:      { backgroundColor: c.skyBg, borderRadius: radii.md, padding: spacing[2] },
    title:         { fontFamily: 'InterTight-SemiBold', fontSize: 18, color: c.fg, lineHeight: 24 },
    date:          { fontFamily: 'JetBrainsMono-Regular', fontSize: 11, color: c.fg4 },
    divider:       { height: 1, backgroundColor: c.border },
    bodyText:      { fontFamily: 'InterTight-Regular', fontSize: 15, color: c.fg2, lineHeight: 22 },
    actionBtn:     { flexDirection: 'row', alignItems: 'center', gap: spacing[3], backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: radii.md, padding: spacing[4], marginTop: spacing[4] },
    actionBtnText: { fontFamily: 'InterTight-Medium', fontSize: 14, color: c.sky },
  });
}
