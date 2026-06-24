import { useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView,
  ActivityIndicator, Alert, TouchableOpacity,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { supabase } from '@/lib/supabase';
import { spacing, radii, shadows } from '@/constants/tokens';
import type { ColorSet } from '@/constants/tokens';
import { useColors } from '@/lib/theme';

interface Signoff {
  id: string;
  jump_number: number;
  signoff_date: string;
  user_display_name: string;
  description: string;
  comments: string | null;
  signer_name: string;
  signer_role: string;
  signer_licence: string | null;
  signature_data: string | null;
  created_at: string;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function SignoffDetailScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const [signoff, setSignoff] = useState<Signoff | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('signoffs').select('*').eq('id', id).single();
      setSignoff(data as Signoff);
      setLoading(false);
    })();
  }, [id]);

  const handleDelete = () => {
    Alert.alert('Delete sign-off', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await supabase.from('signoffs').delete().eq('id', id);
          router.back();
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={colors.sky} />
      </View>
    );
  }

  if (!signoff) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.back} onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={22} color={colors.fg} />
          </TouchableOpacity>
          <Text style={styles.title}>Sign-off</Text>
          <View style={{ width: 36 }} />
        </View>
        <Text style={{ color: colors.fg3, textAlign: 'center', marginTop: spacing[8], fontFamily: 'InterTight-Regular', fontSize: 14 }}>
          Sign-off not found.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.back} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={colors.fg} />
        </TouchableOpacity>
        <Text style={styles.title}>Sign-off</Text>
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} activeOpacity={0.7}>
          <Ionicons name="trash-outline" size={20} color={colors.danger} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>

        {/* Role badge + date */}
        <View style={styles.badgeRow}>
          <View style={styles.rolePill}>
            <Text style={styles.roleText}>{signoff.signer_role}</Text>
          </View>
          <Text style={styles.dateText}>{fmtDate(signoff.signoff_date)}</Text>
        </View>

        {/* Statement */}
        <View style={styles.statementCard}>
          <Text style={styles.statement}>
            {'As of '}
            <Text style={styles.statementBold}>{signoff.jump_number} jumps</Text>
            {' on '}
            <Text style={styles.statementBold}>{fmtDate(signoff.signoff_date)}</Text>
            {' I '}
            <Text style={styles.statementBold}>{signoff.signer_name}</Text>
            {' am signing off '}
            <Text style={styles.statementBold}>{signoff.user_display_name}</Text>
            {' to:'}
          </Text>
          <View style={styles.descBlock}>
            <Text style={styles.descText}>{signoff.description}</Text>
          </View>
        </View>

        {/* Comments */}
        {signoff.comments ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>ADDITIONAL COMMENTS</Text>
            <Text style={styles.bodyText}>{signoff.comments}</Text>
          </View>
        ) : null}

        {/* Signature */}
        {signoff.signature_data ? (
          <View style={styles.sigCard}>
            <Text style={styles.sectionLabel}>SIGNATURE</Text>
            <View style={styles.sigCanvas}>
              <Svg viewBox="0 0 320 180" width="100%" height={110} preserveAspectRatio="xMidYMid meet">
                <Path
                  d={signoff.signature_data}
                  stroke={colors.sky}
                  strokeWidth={2.5}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </View>
          </View>
        ) : null}

        {/* Signer details */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>SIGNED BY</Text>
          <Text style={styles.signerName}>{signoff.signer_name}</Text>
          <Text style={styles.signerRole}>{signoff.signer_role}</Text>
          {signoff.signer_licence ? (
            <Text style={styles.signerLicence}>{signoff.signer_licence}</Text>
          ) : null}
        </View>

        <Text style={styles.ts}>Recorded {fmtDate(signoff.created_at)}</Text>

        <View style={{ height: spacing[8] }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(c: ColorSet) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    header: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: spacing[5], paddingVertical: spacing[4],
      borderBottomWidth: 1, borderBottomColor: c.border,
    },
    back: { width: 36, height: 36, justifyContent: 'center' },
    title: { flex: 1, textAlign: 'center', fontFamily: 'InterTight-Bold', fontSize: 22, color: c.fg, letterSpacing: -0.4 },
    deleteBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'flex-end' },
    body: { padding: spacing[5] },

    badgeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[3] },
    rolePill: {
      backgroundColor: c.skyBg ?? c.sky + '22',
      borderWidth: 1,
      borderColor: c.sky,
      borderRadius: radii.pill,
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[1],
    },
    roleText: { fontFamily: 'JetBrainsMono-SemiBold', fontSize: 11, color: c.sky, letterSpacing: 0.5 },
    dateText: { fontFamily: 'JetBrainsMono-Regular', fontSize: 11, color: c.fg3 },

    statementCard: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radii.lg,
      padding: spacing[4],
      marginBottom: spacing[3],
      gap: spacing[3],
      ...shadows.card,
    },
    statement: {
      fontFamily: 'InterTight-Regular',
      fontSize: 15,
      color: c.fg2,
      lineHeight: 24,
    },
    statementBold: {
      fontFamily: 'InterTight-SemiBold',
      color: c.fg,
    },
    descBlock: {
      backgroundColor: c.surface2,
      borderRadius: radii.base,
      padding: spacing[3],
    },
    descText: {
      fontFamily: 'InterTight-Medium',
      fontSize: 15,
      color: c.fg,
      lineHeight: 22,
    },

    section: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radii.md,
      padding: spacing[4],
      marginBottom: spacing[3],
      gap: spacing[1],
    },
    sectionLabel: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 9,
      letterSpacing: 0.8,
      color: c.fg3,
      marginBottom: spacing[1],
    },
    bodyText: {
      fontFamily: 'InterTight-Regular',
      fontSize: 14,
      color: c.fg2,
      lineHeight: 21,
    },

    sigCard: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radii.md,
      padding: spacing[4],
      marginBottom: spacing[3],
    },
    sigCanvas: {
      marginTop: spacing[2],
      borderTopWidth: 1,
      borderTopColor: c.border,
      paddingTop: spacing[2],
    },

    signerName: {
      fontFamily: 'InterTight-SemiBold',
      fontSize: 16,
      color: c.fg,
    },
    signerRole: {
      fontFamily: 'InterTight-Regular',
      fontSize: 13,
      color: c.fg2,
    },
    signerLicence: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 12,
      color: c.fg3,
      marginTop: 2,
    },

    ts: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 10,
      letterSpacing: 0.6,
      color: c.fg3,
      textAlign: 'center',
      marginTop: spacing[2],
    },
  });
}
