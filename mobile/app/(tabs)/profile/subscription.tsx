import { useCallback, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView,
  ActivityIndicator, Linking, Alert,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { colors, spacing, radii } from '@/constants/tokens';

const PRO_FEATURES = [
  'Unlimited jumps',
  'Stats & charts (all 3 layouts)',
  'PDF & CSV logbook export',
  'Instructor sign-off via QR',
  'Gear service tracking',
  'Priority support',
];

const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? 'https://skydivelog.app';

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
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [sub, setSub] = useState<{ status: string; renews_at: string | null } | null>(null);
  const [userCreatedAt, setUserCreatedAt] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);

  useFocusEffect(useCallback(() => {
    (async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }
      setUserCreatedAt(session.user.created_at);
      const { data } = await supabase
        .from('subscriptions')
        .select('status, renews_at')
        .eq('user_id', session.user.id)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      setSub(data ?? null);
      setLoading(false);

      // Fetch invoice history if subscribed
      if (data?.status === 'active' || data?.status === 'overdue') {
        setInvoicesLoading(true);
        try {
          const res = await fetch(`${WEB_URL}/api/stripe/invoices`, {
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
          if (res.ok) {
            const json = await res.json();
            setInvoices(json.invoices ?? []);
          }
        } catch {
          // silently ignore — invoices are supplementary info
        } finally {
          setInvoicesLoading(false);
        }
      }
    })();
  }, []));

  const handleSubscribe = async () => {
    setSubscribing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { Alert.alert('Not signed in'); return; }
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

  const trialEnd = userCreatedAt
    ? new Date(new Date(userCreatedAt).getTime() + 14 * 86400000)
    : null;
  const inTrial = !sub && !!trialEnd && Date.now() < trialEnd.getTime();
  const trialExpired = !sub && !!trialEnd && Date.now() >= trialEnd.getTime();
  const trialDaysLeft = trialEnd
    ? Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / 86400000))
    : 0;
  const isActive = sub?.status === 'active';
  const isOverdue = sub?.status === 'overdue';

  const statusLabel = isActive
    ? 'ACTIVE'
    : isOverdue
    ? 'OVERDUE'
    : sub?.status === 'cancelled'
    ? 'CANCELLED'
    : inTrial
    ? `TRIAL · ${trialDaysLeft}d left`
    : 'TRIAL EXPIRED';

  const statusColor = isActive
    ? colors.ok
    : isOverdue || trialExpired
    ? colors.warn
    : inTrial
    ? colors.sky
    : colors.fg3;

  const statusBg = isActive
    ? colors.okBg
    : isOverdue || trialExpired
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
            {inTrial && trialEnd && (
              <Text style={styles.renewText}>Trial ends {fmtDate(trialEnd.toISOString())}</Text>
            )}
          </View>

          {/* Features */}
          {PRO_FEATURES.map(f => (
            <View key={f} style={styles.featureRow}>
              <Ionicons
                name={isActive || inTrial ? 'checkmark-circle' : 'lock-closed-outline'}
                size={16}
                color={isActive || inTrial ? colors.ok : colors.fg4}
              />
              <Text style={[styles.featureText, !(isActive || inTrial) && { color: colors.fg3 }]}>{f}</Text>
            </View>
          ))}
        </View>

        {/* CTA for non-active users */}
        {!isActive && (
          <TouchableOpacity
            style={[styles.subscribeBtn, subscribing && { opacity: 0.6 }]}
            onPress={handleSubscribe}
            disabled={subscribing}
            activeOpacity={0.8}
          >
            {subscribing
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.subscribeBtnText}>
                  {trialExpired ? 'Reactivate · $12/yr' : 'Subscribe · $12/yr'}
                </Text>
            }
          </TouchableOpacity>
        )}

        {/* Manage billing for active/overdue */}
        {(isActive || isOverdue) && (
          <TouchableOpacity style={styles.manageBtn} onPress={handleManageBilling} activeOpacity={0.7}>
            <Text style={styles.manageBtnText}>Manage billing</Text>
            <Ionicons name="open-outline" size={13} color={colors.sky} />
          </TouchableOpacity>
        )}

        {/* Invoice history — shown when subscribed */}
        {(isActive || isOverdue) && (
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing[5], paddingVertical: spacing[3], borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { width: 36, height: 36, justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontFamily: 'InterTight-SemiBold', fontSize: 17, color: colors.fg },
  body: { padding: spacing[5], paddingBottom: spacing[12], gap: spacing[4] },
  statusCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, padding: spacing[4], gap: spacing[2] },
  statusTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[1] },
  statusBadge: { borderRadius: radii.sm, paddingHorizontal: spacing[2], paddingVertical: 3 },
  statusBadgeText: { fontFamily: 'JetBrainsMono-Regular', fontSize: 11, fontWeight: '700' },
  renewText: { fontFamily: 'JetBrainsMono-Regular', fontSize: 11, color: colors.fg3 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  featureText: { fontFamily: 'InterTight-Regular', fontSize: 14, color: colors.fg2 },
  subscribeBtn: { backgroundColor: colors.sky, borderRadius: radii.md, paddingVertical: spacing[3], alignItems: 'center', justifyContent: 'center', minHeight: 46 },
  subscribeBtnText: { fontFamily: 'InterTight-SemiBold', fontSize: 15, color: '#fff' },
  manageBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[1], paddingVertical: spacing[2] },
  manageBtnText: { fontFamily: 'InterTight-Medium', fontSize: 14, color: colors.sky },
  invoiceSection: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, overflow: 'hidden' },
  invoiceSectionTitle: { fontFamily: 'InterTight-SemiBold', fontSize: 11, color: colors.fg4, letterSpacing: 1.2, textTransform: 'uppercase', paddingHorizontal: spacing[4], paddingTop: spacing[3], paddingBottom: spacing[2] },
  invoiceEmpty: { paddingHorizontal: spacing[4], paddingVertical: spacing[3] },
  invoiceEmptyText: { fontFamily: 'InterTight-Regular', fontSize: 13, color: colors.fg4 },
  invoiceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing[4], paddingVertical: spacing[3], borderTopWidth: 1, borderTopColor: colors.border },
  invoiceLeft: { gap: 2 },
  invoiceDate: { fontFamily: 'JetBrainsMono-Regular', fontSize: 12, color: colors.fg3 },
  invoiceAmount: { fontFamily: 'InterTight-SemiBold', fontSize: 14, color: colors.fg },
  invoiceRight: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  invoiceStatus: { borderRadius: radii.sm, paddingHorizontal: spacing[2], paddingVertical: 2 },
  invoiceStatusText: { fontFamily: 'JetBrainsMono-Regular', fontSize: 10, fontWeight: '700' },
});
