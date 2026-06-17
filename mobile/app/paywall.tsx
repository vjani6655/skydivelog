import { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { spacing, radii } from '@/constants/tokens';
import type { ColorSet } from '@/constants/tokens';
import { useColors } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { useIAP } from '@/lib/useIAP';

const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? 'https://www.jumplogs.com';

const FEATURES = [
  {
    icon: 'layers-outline' as const,
    title: 'Unlimited jumps',
    desc: 'Log offline, sync when back in range.',
  },
  {
    icon: 'qr-code-outline' as const,
    title: 'Instructor sign-off',
    desc: 'QR sign-off works for any verifier.',
  },
  {
    icon: 'document-text-outline' as const,
    title: 'Export your logbook',
    desc: 'PDF and CSV. Yours to keep.',
  },
  {
    icon: 'notifications-outline' as const,
    title: 'Currency & repack alerts',
    desc: 'Never miss a re-qual or AAD service.',
  },
];

export default function PaywallScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const iap = useIAP();

  // Navigate to success screen once IAP purchase is validated
  useEffect(() => {
    if (iap.status === 'success') {
      router.replace('/subscription-success');
    }
  }, [iap.status]);

  const { skippable, reason } = useLocalSearchParams<{ skippable?: string; reason?: string }>();
  const canSkip = skippable === '1';
  const isExpired = reason === 'trial_expired';
  const isTrialLimit = reason === 'trial_limit';

  const title = isExpired
    ? 'Your trial has ended.'
    : 'One subscription.\nEvery jump, forever.';

  const subtitle = isExpired
    ? 'Subscribe to keep logging your jumps.'
    : isTrialLimit
    ? "You've used 5 trial jumps.\nUpgrade for unlimited logging."
    : null;

  // Close/dismiss: for gated scenarios go back; for post-signup replace to log
  const handleDismiss = () => {
    if (reason) {
      router.back();
    } else {
      router.replace('/(tabs)/log');
    }
  };

  // Skip (trial-limit only): proceed to add the jump
  const handleSkip = () => {
    router.replace('/(tabs)/log/new' as any);
  };

  const handleSubscribe = async () => {
    setLoading(true);
    setError('');
    try {
      const { data: { session }, error: refreshErr } = await supabase.auth.refreshSession();
      if (refreshErr || !session) { setError('Not signed in. Please restart the app.'); setLoading(false); return; }
      const res = await fetch(`${WEB_URL}/api/stripe/mobile-checkout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await res.json();
      if (json.url) {
        await Linking.openURL(json.url);
      } else {
        setError(json.error ?? 'Could not start checkout. Please try again.');
      }
    } catch {
      setError('Could not connect to server. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Close button */}
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={handleDismiss}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={20} color={colors.fg2} />
        </TouchableOpacity>

        {/* Badge */}
        <View style={styles.badge}>
          <Ionicons name="airplane-outline" size={12} color={colors.sky} />
          <Text style={styles.badgeText}>JUMP LOGS PRO</Text>
        </View>

        <Text style={styles.title}>{title}</Text>
        {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

        {/* Feature list */}
        <View style={styles.features}>
          {FEATURES.map((f) => (
            <View key={f.title} style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Ionicons name={f.icon} size={18} color={colors.sky} />
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* CTA */}
        {!!error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={15} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        {Platform.OS === 'ios' ? (
          <View style={styles.iosCtaArea}>
            {/* IAP error */}
            {iap.status === 'error' && !!iap.error && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={15} color={colors.danger} />
                <Text style={styles.errorText}>{iap.error}</Text>
              </View>
            )}

            {/* Subscribe button */}
            {iap.status === 'unavailable' ? (
              // expo-iap not linked in this dev build — show info only
              <View style={[styles.applePayButton, { opacity: 0.5 }]}>
                <Text style={styles.applePayText}>Subscribe · $12 / year</Text>
              </View>
            ) : (iap.status === 'loading' || iap.status === 'purchasing' || iap.status === 'validating') ? (
              <View style={[styles.applePayButton, { opacity: 0.7 }]}>
                <ActivityIndicator color={colors.bg} size="small" />
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.applePayButton, iap.status === 'error' && { opacity: 0.5 }]}
                onPress={iap.status === 'error' ? iap.reset : iap.startPurchase}
                disabled={iap.status === 'success'}
                activeOpacity={0.8}
              >
                <Text style={styles.applePayText}>
                  {iap.status === 'error' ? 'Try again' : `Subscribe · ${iap.localizedPrice ?? '$12'} / year`}
                </Text>
              </TouchableOpacity>
            )}

            {/* Required Apple subscription disclosure */}
            <Text style={styles.legalCaption}>
              Payment will be charged to your Apple ID at confirmation. Subscription renews automatically unless cancelled at least 24 hours before the end of the current period. Manage or cancel in your App Store account settings.
            </Text>

            {/* Restore purchases — required by Apple */}
            <TouchableOpacity
              onPress={iap.restorePurchases}
              activeOpacity={0.7}
              style={styles.restoreLink}
              disabled={iap.status === 'purchasing' || iap.status === 'validating'}
            >
              <Text style={styles.restoreLinkText}>Restore purchases</Text>
            </TouchableOpacity>

            {/* Privacy Policy & Terms of Use — required by Apple */}
            <View style={styles.legalLinks}>
              <TouchableOpacity onPress={() => Linking.openURL(`${WEB_URL}/privacy`)} activeOpacity={0.7}>
                <Text style={styles.legalLinkText}>Privacy Policy</Text>
              </TouchableOpacity>
              <Text style={styles.legalLinkSep}>·</Text>
              <TouchableOpacity onPress={() => Linking.openURL(`${WEB_URL}/terms`)} activeOpacity={0.7}>
                <Text style={styles.legalLinkText}>Terms of Use</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.applePayButton, loading && { opacity: 0.6 }]}
            onPress={handleSubscribe}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={colors.bg} size="small" />
            ) : (
              <Text style={styles.applePayText}>Subscribe · $12 / year</Text>
            )}
          </TouchableOpacity>
        )}

        {Platform.OS !== 'ios' && (
          <Text style={styles.legalCaption}>
            $12.00 USD billed today · Stripe · cancel anytime
          </Text>
        )}

        {/* Skip link (iOS: canSkip only; Android: canSkip only) */}
        {canSkip && (
          <TouchableOpacity onPress={handleSkip} activeOpacity={0.7} style={styles.skipLink}>
            <Text style={styles.skipLinkText}>Not now · continue with trial</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(c: ColorSet) {
  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.bg },
  container: {
    flexGrow: 1,
    paddingHorizontal: spacing[6],
    paddingTop: spacing[3],
    paddingBottom: spacing[8],
  },
  closeBtn: {
    alignSelf: 'flex-end',
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    backgroundColor: c.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[6],
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    alignSelf: 'flex-start',
    backgroundColor: c.skyBg,
    borderRadius: radii.pill,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    marginBottom: spacing[5],
  },
  badgeText: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 10,
    letterSpacing: 1.2,
    color: c.sky,
  },
  title: {
    fontFamily: 'InterTight-Bold',
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: -0.7,
    color: c.fg,
    marginBottom: spacing[3],
  },
  subtitle: {
    fontFamily: 'InterTight-Regular',
    fontSize: 16,
    color: c.fg2,
    lineHeight: 22,
    marginBottom: spacing[8],
  },
  features: {
    gap: spacing[5],
    marginBottom: spacing[8],
  },
  featureRow: {
    flexDirection: 'row',
    gap: spacing[4],
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    backgroundColor: c.skyBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
    justifyContent: 'center',
  },
  featureTitle: {
    fontFamily: 'InterTight-SemiBold',
    fontSize: 15,
    color: c.fg,
    marginBottom: 2,
  },
  featureDesc: {
    fontFamily: 'InterTight-Regular',
    fontSize: 13,
    color: c.fg2,
    lineHeight: 18,
  },
  pricingCard: {
    backgroundColor: c.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: c.border,
    padding: spacing[5],
    marginBottom: spacing[6],
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: spacing[1],
  },
  pricingLabel: {
    fontFamily: 'InterTight-SemiBold',
    fontSize: 16,
    color: c.fg,
  },
  pricingAmount: {
    fontFamily: 'InterTight-Bold',
    fontSize: 26,
    letterSpacing: -0.5,
    color: c.fg,
  },
  pricingPer: {
    fontFamily: 'InterTight-Regular',
    fontSize: 14,
    color: c.fg2,
  },
  pricingNote: {
    fontFamily: 'InterTight-Regular',
    fontSize: 13,
    color: c.fg3,
  },
  applePayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    backgroundColor: c.fg,
    borderRadius: radii.lg,
    paddingVertical: spacing[4],
    marginBottom: spacing[4],
  },
  applePayText: {
    fontFamily: 'InterTight-SemiBold',
    fontSize: 17,
    color: c.bg,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: c.dangerBg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: `${c.danger}40`,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    marginBottom: spacing[4],
  },
  errorText: {
    fontFamily: 'InterTight-Regular',
    fontSize: 13,
    color: c.danger,
    flex: 1,
  },
  legalCaption: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 10,
    letterSpacing: 0.5,
    color: c.fg3,
    textAlign: 'center',
    marginBottom: spacing[4],
  },
  iosCtaArea: {
    marginBottom: spacing[5],
  },
  restoreLink: {
    alignItems: 'center',
    paddingVertical: spacing[2],
    marginTop: spacing[1],
  },
  restoreLinkText: {
    fontFamily: 'InterTight-Regular',
    fontSize: 13,
    color: c.fg3,
    textDecorationLine: 'underline',
  },
  legalLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[2],
  },
  legalLinkText: {
    fontFamily: 'InterTight-Regular',
    fontSize: 12,
    color: c.fg3,
    textDecorationLine: 'underline',
  },
  legalLinkSep: {
    fontFamily: 'InterTight-Regular',
    fontSize: 12,
    color: c.fg3,
  },
  skipLink: {
    alignItems: 'center',
    paddingVertical: spacing[2],
  },
  skipLinkText: {
    fontFamily: 'InterTight-Regular',
    fontSize: 14,
    color: c.fg3,
    textDecorationLine: 'underline',
  },
  });
}
