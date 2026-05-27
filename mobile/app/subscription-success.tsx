import { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { spacing, radii } from '@/constants/tokens';
import type { ColorSet } from '@/constants/tokens';
import { useColors } from '@/lib/theme';
import { supabase } from '@/lib/supabase';

type Sub = {
  started_at: string;
  renews_at: string;
  plan: string;
  status: string;
};

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function SubscriptionSuccessScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [sub, setSub] = useState<Sub | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from('subscriptions')
        .select('started_at, renews_at, plan, status')
        .eq('user_id', user.id)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      setSub(data ?? null);
      setLoading(false);
    })();
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.container}>
        {/* Icon */}
        <View style={styles.iconRing}>
          <Ionicons name="checkmark" size={36} color={colors.sky} />
        </View>

        <Text style={styles.title}>You're subscribed!</Text>
        <Text style={styles.subtitle}>
          Every jump, logged forever. Welcome aboard.
        </Text>

        {/* Plan card */}
        {loading ? (
          <ActivityIndicator color={colors.sky} style={{ marginVertical: spacing[8] }} />
        ) : sub ? (
          <View style={styles.card}>
            <Row label="Plan" value={sub.plan} colors={colors} styles={styles} />
            <View style={styles.divider} />
            <Row label="Started" value={fmt(sub.started_at)} colors={colors} styles={styles} />
            <View style={styles.divider} />
            <Row label="Renews" value={fmt(sub.renews_at)} colors={colors} styles={styles} />
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.rowValue}>
              Subscription details will appear here shortly.
            </Text>
          </View>
        )}

        {/* CTA */}
        <TouchableOpacity
          style={styles.btn}
          onPress={() => router.replace('/(tabs)/log')}
          activeOpacity={0.85}
        >
          <Text style={styles.btnText}>Let's go</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function Row({
  label,
  value,
  styles,
}: {
  label: string;
  value: string;
  colors: ColorSet;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function makeStyles(c: ColorSet) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    container: {
      flex: 1,
      paddingHorizontal: spacing[6],
      paddingTop: spacing[12],
      paddingBottom: spacing[8],
      alignItems: 'center',
    },
    iconRing: {
      width: 72,
      height: 72,
      borderRadius: radii.pill,
      backgroundColor: c.skyBg,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing[6],
    },
    title: {
      fontFamily: 'InterTight-Bold',
      fontSize: 30,
      letterSpacing: -0.5,
      color: c.fg,
      textAlign: 'center',
      marginBottom: spacing[3],
    },
    subtitle: {
      fontFamily: 'InterTight-Regular',
      fontSize: 16,
      color: c.fg2,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: spacing[8],
    },
    card: {
      width: '100%',
      backgroundColor: c.surface,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: c.border,
      paddingVertical: spacing[2],
      marginBottom: spacing[8],
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing[5],
      paddingVertical: spacing[4],
    },
    rowLabel: {
      fontFamily: 'InterTight-Regular',
      fontSize: 15,
      color: c.fg2,
    },
    rowValue: {
      fontFamily: 'InterTight-Medium',
      fontSize: 15,
      color: c.fg,
    },
    divider: {
      height: 1,
      backgroundColor: c.border,
      marginHorizontal: spacing[5],
    },
    btn: {
      width: '100%',
      backgroundColor: c.sky,
      borderRadius: radii.pill,
      paddingVertical: spacing[4],
      alignItems: 'center',
    },
    btnText: {
      fontFamily: 'InterTight-SemiBold',
      fontSize: 17,
      color: '#fff',
    },
  });
}
