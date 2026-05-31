import { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { spacing, radii } from '@/constants/tokens';
import type { ColorSet } from '@/constants/tokens';
import { useColors } from '@/lib/theme';

export default function ForgotPasswordScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [submitError, setSubmitError] = useState('');

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const handleSend = async () => {
    if (!email.trim()) {
      setEmailError('Email is required');
      return;
    }
    if (!EMAIL_RE.test(email.trim())) {
      setEmailError('Enter a valid email address');
      return;
    }
    setEmailError('');
    setSubmitError('');
    setLoading(true);
    try {
      const webUrl = process.env.EXPO_PUBLIC_WEB_URL ?? 'https://www.jumplogs.com';
      await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${webUrl}/api/auth/callback?next=/reset-password`,
      });
    } catch {
      setLoading(false);
      setSubmitError('Network error. Please check your connection and try again.');
      return;
    }
    setLoading(false);
    // Always show success — standard password reset UX (don't reveal if email exists).
    setSent(true);
  };

  if (sent) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.confirmedContainer}>
          <View style={styles.tickCircle}>
            <Ionicons name="checkmark" size={32} color={colors.sky} />
          </View>
          <Text style={styles.confirmedTitle}>Check your email</Text>
          <Text style={styles.confirmedSubtitle}>
            We sent a reset link to{'\n'}
            <Text style={styles.confirmedEmail}>{email}</Text>
          </Text>
          <TouchableOpacity
            style={[styles.primaryButton, styles.confirmedButton]}
            onPress={() => router.push('/sign-in')}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Back to sign in</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          <TouchableOpacity style={styles.back} onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={22} color={colors.fg} />
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>Forgot password?</Text>
            <Text style={styles.subtitle}>
              Enter the email on your account and we'll send a reset link.
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>EMAIL</Text>
            <View style={[styles.inputRow, !!emailError && styles.inputRowError]}>
              <Ionicons name="mail-outline" size={16} color={emailError ? colors.danger : colors.fg3} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor={colors.fg4}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                value={email}
                onChangeText={v => { setEmail(v); if (emailError) setEmailError(''); }}
              />
            </View>
            {!!emailError && <Text style={styles.errorText}>{emailError}</Text>}
          </View>

          {!!submitError && (
            <View style={styles.submitErrorBox}>
              <Ionicons name="alert-circle-outline" size={15} color={colors.danger} />
              <Text style={styles.submitErrorText}>{submitError}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleSend}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading
              ? <ActivityIndicator color={colors.onSky} size="small" />
              : <Text style={styles.primaryButtonText}>Send reset link</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/sign-in')} activeOpacity={0.7} style={styles.footerLink}>
            <Text style={styles.footerText}>
              Remember it?{' '}
              <Text style={styles.footerLinkText}>Sign in</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(c: ColorSet) {
  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.bg },
  flex: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: spacing[6],
    paddingTop: spacing[2],
    paddingBottom: spacing[8],
  },
  back: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'flex-start',
    marginBottom: spacing[6],
  },
  header: {
    marginBottom: spacing[8],
  },
  title: {
    fontFamily: 'InterTight-Bold',
    fontSize: 32,
    letterSpacing: -0.6,
    color: c.fg,
    marginBottom: spacing[2],
  },
  subtitle: {
    fontFamily: 'InterTight-Regular',
    fontSize: 15,
    color: c.fg2,
    lineHeight: 22,
  },
  inputGroup: {
    gap: spacing[1.5],
    marginBottom: spacing[6],
  },
  label: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 10,
    letterSpacing: 1.2,
    color: c.fg3,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: c.border,
    paddingHorizontal: spacing[3],
    height: 48,
  },
  inputRowError: {
    borderColor: c.danger,
  },
  errorText: {
    fontFamily: 'InterTight-Regular',
    fontSize: 12,
    color: c.danger,
    marginTop: 2,
  },
  submitErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: c.dangerBg,
    borderRadius: radii.md,
    padding: spacing[3],
    marginBottom: spacing[4],
  },
  submitErrorText: {
    flex: 1,
    fontFamily: 'InterTight-Regular',
    fontSize: 13,
    color: c.danger,
    lineHeight: 18,
  },
  inputIcon: {
    marginRight: spacing[2],
  },
  input: {
    flex: 1,
    fontFamily: 'InterTight-Regular',
    fontSize: 15,
    color: c.fg,
  },
  primaryButton: {
    backgroundColor: c.sky,
    borderRadius: radii.lg,
    paddingVertical: spacing[4],
    alignItems: 'center',
    marginBottom: spacing[6],
  },
  buttonDisabled: { opacity: 0.5 },
  primaryButtonText: {
    fontFamily: 'InterTight-SemiBold',
    fontSize: 16,
    color: c.onSky,
  },
  footerLink: { alignItems: 'center' },
  footerText: {
    fontFamily: 'InterTight-Regular',
    fontSize: 14,
    color: c.fg2,
  },
  footerLinkText: {
    fontFamily: 'InterTight-SemiBold',
    color: c.sky,
  },
  // Confirmed state
  confirmedContainer: {
    flex: 1,
    paddingHorizontal: spacing[6],
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing[4],
  },
  tickCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: c.skyBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[2],
  },
  confirmedTitle: {
    fontFamily: 'InterTight-Bold',
    fontSize: 26,
    letterSpacing: -0.4,
    color: c.fg,
    textAlign: 'center',
  },
  confirmedSubtitle: {
    fontFamily: 'InterTight-Regular',
    fontSize: 15,
    color: c.fg2,
    textAlign: 'center',
    lineHeight: 22,
  },
  confirmedEmail: {
    fontFamily: 'InterTight-SemiBold',
    color: c.fg,
  },
  confirmedButton: {
    alignSelf: 'stretch',
    marginTop: spacing[2],
  },
  });
}
