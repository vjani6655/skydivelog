import { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toggle from '@/components/ui/Toggle';
import { spacing, radii } from '@/constants/tokens';
import type { ColorSet } from '@/constants/tokens';
import { useColors } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import {
  loadNotifPrefs,
  saveNotifPref,
  registerPushToken,
  DEFAULT_PREFS,
  type NotifPrefs,
} from '@/lib/notifications';

const PREFS = [
  { key: 'jump_logged' as const,    label: 'Jump logged confirmation',    section: 'ACTIVITY' },
  { key: 'weekly_recap' as const,   label: 'Weekly recap',                section: 'ACTIVITY' },
  { key: 'cert_expiry' as const,    label: 'Certificate expiry reminders', section: 'REMINDERS' },
  { key: 'repack_due' as const,     label: 'Repack due alerts',            section: 'REMINDERS' },
  { key: 'currency_alert' as const, label: 'Currency warnings',            section: 'REMINDERS' },
  { key: 'announcements' as const,  label: 'App announcements',            section: 'OTHER' },
] as const;

type PrefKey = typeof PREFS[number]['key'];

export default function NotificationsScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT_PREFS);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) { setLoading(false); return; }

      setUserId(user.id);

      // Load prefs and (re)register token in parallel
      const [loaded] = await Promise.all([
        loadNotifPrefs(supabase, user.id),
        registerPushToken(supabase, user.id),
      ]);
      if (loaded) setPrefs(loaded);
      setLoading(false);
    })();
  }, []);

  const toggle = async (key: PrefKey) => {
    if (!userId) return;
    const newVal = !prefs[key];
    setPrefs(p => ({ ...p, [key]: newVal }));
    await saveNotifPref(supabase, userId, key, newVal);
  };

  const sections = [...new Set(PREFS.map(p => p.section))];

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={colors.fg} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {loading ? (
          <ActivityIndicator color={colors.sky} style={{ marginTop: spacing[8] }} />
        ) : (
          sections.map(section => {
            const items = PREFS.filter(p => p.section === section);
            return (
              <View key={section}>
                <Text style={styles.sectionTitle}>{section}</Text>
                <View style={styles.card}>
                  {items.map(({ key, label }, i) => (
                    <View key={key} style={[styles.row, i === items.length - 1 && styles.rowLast]}>
                      <Text style={styles.rowLabel}>{label}</Text>
                      <Toggle on={prefs[key]} onChange={() => toggle(key)} />
                    </View>
                  ))}
                </View>
              </View>
            );
          })
        )}
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
  sectionTitle:{ fontFamily: 'JetBrainsMono-Regular', fontSize: 10, letterSpacing: 0.8, color: c.fg3, marginBottom: spacing[2], marginTop: spacing[4] },
  card:        { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: radii.lg, overflow: 'hidden' },
  row:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing[4], paddingVertical: spacing[3.5], borderBottomWidth: 1, borderBottomColor: c.border },
  rowLast:     { borderBottomWidth: 0 },
  rowLabel:    { fontFamily: 'InterTight-Medium', fontSize: 15, color: c.fg, flex: 1 },
  });
}
