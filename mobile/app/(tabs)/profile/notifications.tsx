import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
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
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type NotifPrefs,
  type NotificationItem,
} from '@/lib/notifications';

const PREFS = [
  { key: 'jump_logged' as const,    label: 'Jump logged confirmation',     section: 'ACTIVITY' },
  { key: 'weekly_recap' as const,   label: 'Weekly recap',                 section: 'ACTIVITY' },
  { key: 'cert_expiry' as const,    label: 'Certificate expiry reminders', section: 'REMINDERS' },
  { key: 'repack_due' as const,     label: 'Repack due alerts',            section: 'REMINDERS' },
  { key: 'currency_alert' as const, label: 'Currency warnings',            section: 'REMINDERS' },
  { key: 'announcements' as const,  label: 'App announcements',            section: 'OTHER' },
] as const;

type PrefKey = typeof PREFS[number]['key'];

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString('en-AU', { day: '2-digit', month: 'short' });
}

export default function NotificationsScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT_PREFS);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [markingAll, setMarkingAll] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  useFocusEffect(useCallback(() => {
    (async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) { setLoading(false); return; }

      setUserId(user.id);

      const [loaded, notifs] = await Promise.all([
        loadNotifPrefs(supabase, user.id),
        fetchNotifications(supabase, user.id),
        registerPushToken(supabase, user.id),
      ]);
      if (loaded) setPrefs(loaded);
      setNotifications(notifs);
      setLoading(false);
    })();
  }, []));

  const toggle = async (key: PrefKey) => {
    if (!userId) return;
    const newVal = !prefs[key];
    setPrefs(p => ({ ...p, [key]: newVal }));
    await saveNotifPref(supabase, userId, key, newVal);
  };

  const handleNotifPress = async (n: NotificationItem) => {
    if (!n.read) {
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
      await markNotificationRead(supabase, n.id);
    }
    router.push({
      pathname: '/(tabs)/profile/notification-detail' as any,
      params: { id: n.id, title: n.title, body: n.body, created_at: n.created_at },
    });
  };

  const handleMarkAllRead = async () => {
    if (!userId || unreadCount === 0) return;
    setMarkingAll(true);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    await markAllNotificationsRead(supabase, userId);
    setMarkingAll(false);
  };

  const sections = [...new Set(PREFS.map(p => p.section))];

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={colors.fg} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 ? (
          <TouchableOpacity style={styles.markAllBtn} onPress={handleMarkAllRead} disabled={markingAll} activeOpacity={0.7}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 80 }} />
        )}
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator color={colors.sky} style={{ marginTop: spacing[8] }} />
        ) : (
          <>
            {/* ── Inbox ── */}
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>INBOX</Text>
              {unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
                </View>
              )}
            </View>

            {notifications.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="notifications-off-outline" size={28} color={colors.fg4} />
                <Text style={styles.emptyText}>No notifications yet</Text>
              </View>
            ) : (
              <View style={styles.card}>
                {notifications.map((n, i) => (
                  <TouchableOpacity
                    key={n.id}
                    style={[styles.notifRow, i === notifications.length - 1 && styles.rowLast]}
                    onPress={() => handleNotifPress(n)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.notifDotCol}>
                      {!n.read && <View style={styles.unreadDot} />}
                    </View>
                    <View style={styles.notifContent}>
                      <View style={styles.notifTopRow}>
                        <Text style={[styles.notifTitle, !n.read && styles.notifTitleUnread]} numberOfLines={1}>
                          {n.title}
                        </Text>
                        <Text style={styles.notifTime}>{timeAgo(n.created_at)}</Text>
                      </View>
                      <Text style={styles.notifBody} numberOfLines={2}>{n.body}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* ── Preferences ── */}
            <Text style={[styles.sectionTitle, { marginTop: spacing[6] }]}>NOTIFICATION PREFERENCES</Text>

            {sections.map(section => {
              const items = PREFS.filter(p => p.section === section);
              return (
                <View key={section}>
                  <Text style={styles.subSectionTitle}>{section}</Text>
                  <View style={styles.card}>
                    {items.map(({ key, label }, i) => (
                      <View key={key} style={[styles.prefRow, i === items.length - 1 && styles.rowLast]}>
                        <Text style={styles.prefLabel}>{label}</Text>
                        <Toggle on={prefs[key]} onChange={() => toggle(key)} />
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(c: ColorSet) {
  return StyleSheet.create({
    screen:            { flex: 1, backgroundColor: c.bg },
    header:            { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing[5], paddingVertical: spacing[3], borderBottomWidth: 1, borderBottomColor: c.border },
    backBtn:           { width: 36, height: 36, justifyContent: 'center' },
    headerTitle:       { flex: 1, textAlign: 'center', fontFamily: 'InterTight-SemiBold', fontSize: 17, color: c.fg },
    markAllBtn:        { width: 80, alignItems: 'flex-end', justifyContent: 'center' },
    markAllText:       { fontFamily: 'InterTight-Medium', fontSize: 13, color: c.sky },
    body:              { padding: spacing[5], paddingBottom: spacing[12], gap: spacing[2] },
    sectionRow:        { flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: spacing[2] },
    sectionTitle:      { fontFamily: 'JetBrainsMono-Regular', fontSize: 10, letterSpacing: 0.8, color: c.fg3, textTransform: 'uppercase' },
    subSectionTitle:   { fontFamily: 'JetBrainsMono-Regular', fontSize: 10, letterSpacing: 0.8, color: c.fg4, textTransform: 'uppercase', marginTop: spacing[3], marginBottom: spacing[2] },
    unreadBadge:       { backgroundColor: c.sky, borderRadius: radii.pill, minWidth: 18, height: 18, paddingHorizontal: spacing[1], alignItems: 'center', justifyContent: 'center' },
    unreadBadgeText:   { fontFamily: 'InterTight-SemiBold', fontSize: 11, color: '#fff' },
    card:              { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: radii.lg, overflow: 'hidden' },
    emptyCard:         { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: radii.lg, padding: spacing[8], alignItems: 'center', gap: spacing[2] },
    emptyText:         { fontFamily: 'InterTight-Regular', fontSize: 14, color: c.fg4 },
    notifRow:          { flexDirection: 'row', paddingHorizontal: spacing[4], paddingVertical: spacing[3], borderBottomWidth: 1, borderBottomColor: c.border },
    rowLast:           { borderBottomWidth: 0 },
    notifDotCol:       { width: 16, alignItems: 'center', paddingTop: 5 },
    unreadDot:         { width: 7, height: 7, borderRadius: 4, backgroundColor: c.sky },
    notifContent:      { flex: 1, gap: spacing[0.5] },
    notifTopRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing[2] },
    notifTitle:        { flex: 1, fontFamily: 'InterTight-Medium', fontSize: 14, color: c.fg2 },
    notifTitleUnread:  { fontFamily: 'InterTight-SemiBold', color: c.fg },
    notifBody:         { fontFamily: 'InterTight-Regular', fontSize: 13, color: c.fg3, lineHeight: 18 },
    notifTime:         { fontFamily: 'JetBrainsMono-Regular', fontSize: 11, color: c.fg4 },
    prefRow:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing[4], paddingVertical: spacing[3.5], borderBottomWidth: 1, borderBottomColor: c.border },
    prefLabel:         { fontFamily: 'InterTight-Medium', fontSize: 15, color: c.fg, flex: 1 },
  });
}


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
