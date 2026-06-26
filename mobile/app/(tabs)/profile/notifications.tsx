import { useState, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, 
  TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { spacing, radii } from '@/constants/tokens';
import type { ColorSet } from '@/constants/tokens';
import { useColors } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type NotificationItem,
} from '@/lib/notifications';


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

  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  const load = useCallback(async (showFullLoader = false) => {
    if (showFullLoader) setLoading(true);
    setFetchError(null);
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) { setLoading(false); return; }
    setUserId(user.id);
    try {
      const notifs = await fetchNotifications(supabase, user.id);
      setNotifications(notifs);
    } catch (e: any) {
      setFetchError(e.message ?? 'Failed to load notifications');
    }
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(true); }, [load]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load(false);
    setRefreshing(false);
  }, [load]);

  const handleNotifPress = async (n: NotificationItem) => {
    if (!n.read) {
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
      await markNotificationRead(supabase, n.id);
    }
    router.push({
      pathname: '/(tabs)/profile/notification-detail' as any,
      params: { id: n.id, title: n.title, body: n.body, created_at: n.created_at, data: JSON.stringify(n.data) },
    });
  };

  const handleMarkAllRead = async () => {
    if (!userId || unreadCount === 0) return;
    setMarkingAll(true);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    await markAllNotificationsRead(supabase, userId);
    setMarkingAll(false);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
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

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.sky} />}
      >
        {loading ? (
          <ActivityIndicator color={colors.sky} style={{ marginTop: spacing[8] }} />
        ) : fetchError ? (
          <View style={styles.emptyCard}>
            <Ionicons name="alert-circle-outline" size={28} color={colors.danger} />
            <Text style={styles.errorText}>Could not load notifications</Text>
            <Text style={styles.errorDetail}>{fetchError}</Text>
          </View>
        ) : (
          <>
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
    errorText:         { fontFamily: 'InterTight-SemiBold', fontSize: 14, color: c.danger },
    errorDetail:       { fontFamily: 'JetBrainsMono-Regular', fontSize: 11, color: c.fg4, textAlign: 'center' },
  });
}

