import { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { spacing, radii } from '@/constants/tokens';
import type { ColorSet } from '@/constants/tokens';
import { useColors } from '@/lib/theme';

function fmtDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-AU', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function NotificationDetailScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { title, body, created_at } = useLocalSearchParams<{
    id: string;
    title: string;
    body: string;
    created_at: string;
  }>();

  return (
    <SafeAreaView style={styles.screen}>
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

          {created_at ? (
            <Text style={styles.date}>{fmtDate(created_at)}</Text>
          ) : null}

          <View style={styles.divider} />

          <Text style={styles.bodyText}>{body}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(c: ColorSet) {
  return StyleSheet.create({
    screen:      { flex: 1, backgroundColor: c.bg },
    header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing[5], paddingVertical: spacing[3], borderBottomWidth: 1, borderBottomColor: c.border },
    backBtn:     { width: 36, height: 36, justifyContent: 'center' },
    headerTitle: { flex: 1, textAlign: 'center', fontFamily: 'InterTight-SemiBold', fontSize: 17, color: c.fg },
    body:        { padding: spacing[5], paddingBottom: spacing[12] },
    card:        { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: radii.lg, padding: spacing[5], gap: spacing[3] },
    iconRow:     { alignItems: 'flex-start' },
    iconWrap:    { backgroundColor: c.skyBg, borderRadius: radii.md, padding: spacing[2] },
    title:       { fontFamily: 'InterTight-SemiBold', fontSize: 18, color: c.fg, lineHeight: 24 },
    date:        { fontFamily: 'JetBrainsMono-Regular', fontSize: 11, color: c.fg4 },
    divider:     { height: 1, backgroundColor: c.border },
    bodyText:    { fontFamily: 'InterTight-Regular', fontSize: 15, color: c.fg2, lineHeight: 22 },
  });
}
