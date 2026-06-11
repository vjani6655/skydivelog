import { useCallback, useState, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView,
  ActivityIndicator, Linking, Alert, Platform,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { spacing, radii } from '@/constants/tokens';
import type { ColorSet } from '@/constants/tokens';
import { useColors } from '@/lib/theme';

const PRO_FEATURES = [
  'Unlimited jumps',
  'Stats & charts (all 3 layouts)',
  'PDF & CSV logbook export',
  'Instructor sign-off via QR',
  'Gear service tracking',
  'Priority support',
];

const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? 'https://www.jumplogs.com';

function fmtDate(s: string | null) {
  if (!s) return null;
  return new Date(s).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

type Invoice = {
  id: string;
  date: number;        // Unix timestamp (seconds)
  amount: number;      // cents
  currency: string;
  status: string | null;
  pdf_url: string | null;
  hosted_url: string | null;
};

function fmtInvoiceDate(unix: number): string {
  return new Date(unix * 1000).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtMoney(cents: number, currency: string): string {
  const symbol = currency.toUpperCase() === 'USD' ? '$' : currency.toUpperCase() + ' ';
  return `${symbol}${(cents / 100).toFixed(2)}`;
}

export default function SubscriptionScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [undoCancelling, setUndoCancelling] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [sub, setSub] = useState<{ status: string; renews_at: string | null } | null>(null);
  const [userCreatedAt, setUserCreatedAt] = useState<string | null>(null);
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);

  useFocusEffect(useCallback(() => {
    (async () => {
      setLoading(true);
      const [{ data: { user } }] = await Promise.all([
        supabase.auth.getUser(),
      ]);
      if (!user) { setLoading(false); return; }
      setUserCreatedAt(user.created_at);
      setTrialEndsAt((user.user_metadata?.trial_ends_at as string) ?? null);
      const { data } = await supabase
        .from('subscriptions')
        .select('status, renews_at')
        .eq('user_id', user.id)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      setSub(data ?? null);
      setLoading(false);

      // Fetch invoice history for all users — they may have past invoices regardless of current status
      setInvoicesLoading(true);
      try {
        const { data: { session: freshSession } } = await supabase.auth.refreshSession();
        if (freshSession) {
          const res = await fetch(`${WEB_URL}/api/stripe/invoices`, {
            headers: { Authorization: `Bearer ${freshSession.access_token}` },
          });
          if (res.ok) {
            const json = await res.json();
            setInvoices(json.invoices ?? []);
          }
        }
      } catch {
        // silently ignore — invoices are supplementary info
      } finally {
        setInvoicesLoading(false);
      }
    })();
  }, []));

  const handleSubscribe = async () => {
    setSubscribing(true);
    try {
      // refreshSession() exchanges the refresh token for a guaranteed-fresh access token,
      // avoiding "Unauthorized" errors from stale cached JWTs (e.g. after background time)
      const { data: { session }, error: refreshErr } = await supabase.auth.refreshSession();
      if (refreshErr || !session) {
        Alert.alert('Session expired', 'Please sign in again.');
        router.replace('/welcome' as never);
        return;
      }
      const res = await fetch(`${WEB_URL}/api/stripe/mobile-checkout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await res.json();
      if (json.url) {
        await Linking.openURL(json.url);
      } else {
        Alert.alert('Error', json.error ?? 'Could not start checkout');
      }
    } catch (e) {
      Alert.alert('Error', 'Could not connect to server');
    } finally {
      setSubscribing(false);
    }
  };

  const handleManageBilling = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) await Linking.openURL(`${WEB_URL}/billing`);
  };

  const handleCancelSubscription = () => {
    Alert.alert(
      'Cancel subscription?',
      'You\'ll keep access until the end of your billing period. No refund will be issued.',
      [
        { text: 'Keep subscription', style: 'cancel' },
        {
          text: 'Cancel subscription',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              const { data: { session }, error: refreshErr } = await supabase.auth.refreshSession();
              if (refreshErr || !session) {
                Alert.alert('Session expired', 'Please sign in again.');
                return;
              }
              const res = await fetch(`${WEB_URL}/api/stripe/cancel-subscription`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${session.access_token}` },
              });
              const json = await res.json();
              if (json.ok) {
                const { data } = await supabase
                  .from('subscriptions')
                  .select('status, renews_at')
                  .eq('user_id', session.user.id)
                  .order('started_at', { ascending: false })
                  .limit(1)
                  .maybeSingle();
                setSub(data ?? null);
                Alert.alert('Subscription cancelled', `Your access continues until ${fmtDate(data?.renews_at ?? null)}.`);
              } else {
                Alert.alert('Error', json.error ?? 'Could not cancel subscription');
              }
            } catch {
              Alert.alert('Error', 'Could not connect to server');
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  };

  const handleUndoCancel = async () => {
    setUndoCancelling(true);
    try {
      const { data: { session }, error: refreshErr } = await supabase.auth.refreshSession();
      if (refreshErr || !session) {
        Alert.alert('Session expired', 'Please sign in again.');
        return;
      }
      const res = await fetch(`${WEB_URL}/api/stripe/undo-cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await res.json();
      if (json.ok) {
        // Refresh subscription data
        const { data } = await supabase
          .from('subscriptions')
          .select('status, renews_at')
          .eq('user_id', session.user.id)
          .order('started_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        setSub(data ?? null);
        Alert.alert('Subscription restored', 'Your cancellation has been undone. Your subscription continues as normal.');
      } else {
        Alert.alert('Error', json.error ?? 'Could not restore subscription');
      }
    } catch {
      Alert.alert('Error', 'Could not connect to server');
    } finally {
      setUndoCancelling(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={[styles.header]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={22} color={colors.fg} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Subscription</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.center}><ActivityIndicator color={colors.sky} /></View>
      </SafeAreaView>
    );
  }

  const trialEnd = trialEndsAt
    ? new Date(trialEndsAt)
    : userCreatedAt ? new Date(new Date(userCreatedAt).getTime() + 14 * 86400000) : null;
  const inTrial = !sub && !!trialEnd && Date.now() < trialEnd.getTime();
  const trialExpired = !sub && !!trialEnd && Date.now() >= trialEnd.getTime();
  const trialDaysLeft = trialEnd
    ? Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / 86400000))
    : 0;
  const isActive = sub?.status === 'active';
  const isOverdue = sub?.status === 'overdue';
  const isCancelledInGrace =
    sub?.status === 'cancelled' &&
    !!sub?.renews_at &&
    new Date(sub.renews_at) > new Date();
  const hasAccess = isActive || isOverdue || isCancelledInGrace;

  const statusLabel = isActive
    ? 'ACTIVE'
    : isOverdue
    ? 'OVERDUE'
    : isCancelledInGrace
    ? 'CANCELLED'
    : sub?.status === 'cancelled'
    ? 'CANCELLED'
    : inTrial
    ? `TRIAL · ${trialDaysLeft}d left`
    : 'TRIAL EXPIRED';

  const statusColor = isActive
    ? colors.ok
    : isOverdue || trialExpired
    ? colors.warn
    : isCancelledInGrace
    ? colors.warn
    : inTrial
    ? colors.sky
    : colors.fg3;

  const statusBg = isActive
    ? colors.okBg
    : isOverdue || trialExpired
    ? colors.warnBg
    : isCancelledInGrace
    ? colors.warnBg
    : inTrial
    ? colors.skyBg
    : colors.surface2;

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={colors.fg} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Subscription</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>

        {/* Status card */}
        <View style={styles.statusCard}>
          <View style={styles.statusTop}>
            <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
              <Text style={[styles.statusBadgeText, { color: statusColor }]}>{statusLabel}</Text>
            </View>
            {(isActive || isOverdue) && sub?.renews_at && (
              <Text style={styles.renewText}>
                {isOverdue ? 'Payment due' : 'Renews'} {fmtDate(sub.renews_at)}
              </Text>
            )}
            {isCancelledInGrace && sub?.renews_at && (
              <Text style={styles.renewText}>Access until {fmtDate(sub.renews_at)}</Text>
            )}
            {inTrial && trialEnd && (
              <Text style={styles.renewText}>Trial ends {fmtDate(trialEnd.toISOString())}</Text>
            )}
          </View>

          {/* Features */}
          {PRO_FEATURES.map(f => (
            <View key={f} style={styles.featureRow}>
              <Ionicons
                name={hasAccess || inTrial ? 'checkmark-circle' : 'lock-closed-outline'}
                size={16}
                color={hasAccess || inTrial ? colors.ok : colors.fg4}
              />
              <Text style={[styles.featureText, !(hasAccess || inTrial) && { color: colors.fg3 }]}>{f}</Text>
            </View>
          ))}
        </View>

        {/* CTA for non-active users */}
        {!hasAccess && (
          Platform.OS === 'ios' ? (
            <View style={styles.iosSubscribeBox}>
              <Ionicons name="globe-outline" size={20} color={colors.sky} />
              <Text style={styles.iosSubscribeText}>
                To subscribe, visit{' '}
                <Text style={styles.iosSubscribeLink} onPress={() => Linking.openURL(`${WEB_URL}/subscribe`)}>
                  jumplogs.com/subscribe
                </Text>
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.subscribeBtn, subscribing && { opacity: 0.6 }]}
              onPress={handleSubscribe}
              disabled={subscribing}
              activeOpacity={0.8}
            >
              {subscribing
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.subscribeBtnText}>
                    {trialExpired || sub?.status === 'cancelled' ? 'Reactivate · $12/yr' : 'Subscribe · $12/yr'}
                  </Text>
              }
            </TouchableOpacity>
          )
        )}

        {/* Undo cancellation for grace-period users — they already paid, no new charge */}
        {isCancelledInGrace && (
          <View style={styles.undoCancelBox}>
            <TouchableOpacity
              style={[styles.subscribeBtn, undoCancelling && { opacity: 0.6 }]}
              onPress={handleUndoCancel}
              disabled={undoCancelling}
              activeOpacity={0.8}
            >
              {undoCancelling
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.subscribeBtnText}>Undo cancellation</Text>
              }
            </TouchableOpacity>
            <Text style={styles.undoCancelNote}>No new charge — your paid access continues until {fmtDate(sub?.renews_at ?? null)}</Text>
          </View>
        )}

        {/* Cancel subscription for active users */}
        {isActive && (
          <View style={styles.undoCancelBox}>
            <TouchableOpacity
              style={[styles.cancelBtn, cancelling && { opacity: 0.5 }]}
              onPress={handleCancelSubscription}
              disabled={cancelling}
              activeOpacity={0.8}
            >
              {cancelling
                ? <ActivityIndicator size="small" color={colors.danger} />
                : <Text style={styles.cancelBtnText}>Cancel subscription</Text>
              }
            </TouchableOpacity>
          </View>
        )}

        {/* Manage billing for active/overdue/grace */}
        {(isActive || isOverdue || isCancelledInGrace) && (
          <TouchableOpacity style={styles.manageBtn} onPress={handleManageBilling} activeOpacity={0.7}>
            <Text style={styles.manageBtnText}>Manage billing</Text>
            <Ionicons name="open-outline" size={13} color={colors.sky} />
          </TouchableOpacity>
        )}

        {/* Invoice history — shown for all users with past invoices */}
        {(invoicesLoading || invoices.length > 0) && (
          <View style={styles.invoiceSection}>
            <Text style={styles.invoiceSectionTitle}>Invoice History</Text>

            {invoicesLoading && (
              <View style={styles.invoiceEmpty}>
                <ActivityIndicator size="small" color={colors.sky} />
              </View>
            )}

            {!invoicesLoading && invoices.length === 0 && (
              <View style={styles.invoiceEmpty}>
                <Text style={styles.invoiceEmptyText}>No invoices yet.</Text>
              </View>
            )}

            {!invoicesLoading && invoices.map((inv) => (
              <View key={inv.id} style={styles.invoiceRow}>
                <View style={styles.invoiceLeft}>
                  <Text style={styles.invoiceDate}>{fmtInvoiceDate(inv.date)}</Text>
                  <Text style={styles.invoiceAmount}>{fmtMoney(inv.amount, inv.currency)}</Text>
                </View>
                <View style={styles.invoiceRight}>
                  <View style={[
                    styles.invoiceStatus,
                    inv.status === 'paid'
                      ? { backgroundColor: colors.okBg }
                      : { backgroundColor: colors.warnBg },
                  ]}>
                    <Text style={[
                      styles.invoiceStatusText,
                      { color: inv.status === 'paid' ? colors.ok : colors.warn },
                    ]}>
                      {(inv.status ?? 'unknown').toUpperCase()}
                    </Text>
                  </View>
                  {(inv.pdf_url || inv.hosted_url) && (
                    <TouchableOpacity
                      onPress={() => Linking.openURL((inv.pdf_url ?? inv.hosted_url)!)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="download-outline" size={16} color={colors.sky} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(c: ColorSet) {
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing[5], paddingVertical: spacing[3], borderBottomWidth: 1, borderBottomColor: c.border },
  backBtn: { width: 36, height: 36, justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontFamily: 'InterTight-SemiBold', fontSize: 17, color: c.fg },
  body: { padding: spacing[5], paddingBottom: spacing[12], gap: spacing[4] },
  statusCard: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: radii.lg, padding: spacing[4], gap: spacing[2] },
  statusTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[1] },
  statusBadge: { borderRadius: radii.sm, paddingHorizontal: spacing[2], paddingVertical: 3 },
  statusBadgeText: { fontFamily: 'JetBrainsMono-Regular', fontSize: 11, fontWeight: '700' },
  renewText: { fontFamily: 'JetBrainsMono-Regular', fontSize: 11, color: c.fg3 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  featureText: { fontFamily: 'InterTight-Regular', fontSize: 14, color: c.fg2 },
  subscribeBtn: { backgroundColor: c.sky, borderRadius: radii.md, paddingVertical: spacing[3], alignItems: 'center', justifyContent: 'center', minHeight: 46 },
  subscribeBtnText: { fontFamily: 'InterTight-SemiBold', fontSize: 15, color: '#fff' },
  iosSubscribeBox: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], backgroundColor: c.surface2, borderRadius: radii.md, padding: spacing[4] },
  iosSubscribeText: { flex: 1, fontFamily: 'InterTight-Regular', fontSize: 14, color: c.fg2 },
  iosSubscribeLink: { fontFamily: 'InterTight-SemiBold', color: c.sky, textDecorationLine: 'underline' },
  cancelBtn: { borderWidth: 1, borderColor: c.danger, borderRadius: radii.md, paddingVertical: spacing[3], alignItems: 'center', justifyContent: 'center', minHeight: 46 },
  cancelBtnText: { fontFamily: 'InterTight-SemiBold', fontSize: 15, color: c.danger },
  manageBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[1], paddingVertical: spacing[2] },
  manageBtnText: { fontFamily: 'InterTight-Medium', fontSize: 14, color: c.sky },
  undoCancelBox: { gap: spacing[2] },
  undoCancelNote: { fontFamily: 'InterTight-Regular', fontSize: 12, color: c.fg3, textAlign: 'center' },
  invoiceSection: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: radii.lg, overflow: 'hidden' },
  invoiceSectionTitle: { fontFamily: 'InterTight-SemiBold', fontSize: 11, color: c.fg4, letterSpacing: 1.2, textTransform: 'uppercase', paddingHorizontal: spacing[4], paddingTop: spacing[3], paddingBottom: spacing[2] },
  invoiceEmpty: { paddingHorizontal: spacing[4], paddingVertical: spacing[3] },
  invoiceEmptyText: { fontFamily: 'InterTight-Regular', fontSize: 13, color: c.fg4 },
  invoiceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing[4], paddingVertical: spacing[3], borderTopWidth: 1, borderTopColor: c.border },
  invoiceLeft: { gap: 2 },
  invoiceDate: { fontFamily: 'JetBrainsMono-Regular', fontSize: 12, color: c.fg3 },
  invoiceAmount: { fontFamily: 'InterTight-SemiBold', fontSize: 14, color: c.fg },
  invoiceRight: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  invoiceStatus: { borderRadius: radii.sm, paddingHorizontal: spacing[2], paddingVertical: 2 },
  invoiceStatusText: { fontFamily: 'JetBrainsMono-Regular', fontSize: 10, fontWeight: '700' },
  });
}
