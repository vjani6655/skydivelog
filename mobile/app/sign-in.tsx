import { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { router, useNavigation, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { spacing, radii } from '@/constants/tokens';
import type { ColorSet } from '@/constants/tokens';
import { useColors } from '@/lib/theme';

type Errors = { email: string; password: string };
const EMPTY_ERRORS: Errors = { email: '', password: '' };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(email: string, password: string): Errors {
  const e: Errors = { email: '', password: '' };
  if (!email.trim())                       e.email    = 'Email is required';
  else if (!EMAIL_RE.test(email.trim()))   e.email    = 'Enter a valid email address';
  if (!password)                           e.password = 'Password is required';
  return e;
}

export default function SignInScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Errors>(EMPTY_ERRORS);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/(tabs)/log');
    });
  }, []);
  const [submitError, setSubmitError] = useState('');
  const navigation = useNavigation();
  const canGoBack = navigation.canGoBack();
  const { notice } = useLocalSearchParams<{ notice?: string }>();

  const clear = (field: keyof Errors) => {
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaError, setMfaError] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);

  const handleSignIn = async () => {
    const e = validate(email, password);
    setErrors(e);
    if (Object.values(e).some(v => v)) return;
    setSubmitError('');
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) {
      setSubmitError(error.message);
      return;
    }
    // Check if MFA is required (user has verified TOTP factor)
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.nextLevel === 'aal2' && aal.nextLevel !== aal.currentLevel) {
      setMfaRequired(true);
    } else {
      router.replace('/(tabs)/log');
    }
  };

  const handleMfaVerify = async () => {
    if (mfaCode.length !== 6) return;
    setMfaError('');
    setMfaLoading(true);
    try {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totp = factors?.totp?.find(f => f.status === 'verified');
      if (!totp) { setMfaError('No authenticator found.'); return; }
      const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId: totp.id });
      if (chErr || !ch) { setMfaError(chErr?.message ?? 'Challenge failed'); return; }
      const { error: verErr } = await supabase.auth.mfa.verify({ factorId: totp.id, challengeId: ch.id, code: mfaCode });
      if (verErr) { setMfaError('Invalid code. Try again.'); return; }
      router.replace('/(tabs)/log');
    } finally {
      setMfaLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {mfaRequired ? (
          <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
              <Text style={styles.title}>Two-Factor Auth</Text>
              <Text style={styles.subtitle}>Enter the 6-digit code from your authenticator app.</Text>
            </View>
            <View style={styles.form}>
              <TextInput
                style={[styles.inputRow, { textAlign: 'center', fontSize: 28, fontFamily: 'JetBrainsMono-Regular', letterSpacing: 8, height: 64, paddingHorizontal: 16, color: colors.fg }]}
                value={mfaCode}
                onChangeText={t => { setMfaCode(t.replace(/\D/g, '').slice(0, 6)); setMfaError(''); }}
                keyboardType="number-pad"
                maxLength={6}
                placeholder="000000"
                placeholderTextColor={colors.fg4}
                autoFocus
              />
              {!!mfaError && (
                <View style={styles.submitErrorBox}>
                  <Ionicons name="alert-circle-outline" size={15} color={colors.danger} />
                  <Text style={styles.submitErrorText}>{mfaError}</Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              style={[styles.primaryButton, (mfaCode.length !== 6 || mfaLoading) && styles.buttonDisabled]}
              onPress={handleMfaVerify}
              disabled={mfaCode.length !== 6 || mfaLoading}
              activeOpacity={0.8}
            >
              {mfaLoading
                ? <ActivityIndicator color={colors.onSky} size="small" />
                : <Text style={styles.primaryButtonText}>Verify</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { supabase.auth.signOut(); setMfaRequired(false); }} activeOpacity={0.7} style={styles.footerLink}>
              <Text style={styles.footerLinkText}>Back to sign in</Text>
            </TouchableOpacity>
          </ScrollView>
        ) : (
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back button — only when there's somewhere to go */}
          {canGoBack && (
            <TouchableOpacity style={styles.back} onPress={() => router.back()} activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={22} color={colors.fg} />
            </TouchableOpacity>
          )}

          <View style={styles.header}>
            <Text style={styles.title}>Welcome back.</Text>
            <Text style={styles.subtitle}>Sign in to keep your logbook in sync.</Text>
          </View>

          {notice ? (
            <View style={styles.noticeBanner}>
              <Ionicons name="mail-outline" size={16} color={colors.sky} style={{ marginTop: 1 }} />
              <Text style={styles.noticeText}>{notice}</Text>
            </View>
          ) : null}

          <View style={styles.form}>
            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>EMAIL</Text>
              <View style={[styles.inputRow, !!errors.email && styles.inputRowError]}>
                <Ionicons name="mail-outline" size={16} color={errors.email ? colors.danger : colors.fg3} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="james@example.com"
                  placeholderTextColor={colors.fg4}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  value={email}
                  onChangeText={v => { setEmail(v); clear('email'); }}
                />
              </View>
              {!!errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>PASSWORD</Text>
                <TouchableOpacity onPress={() => router.push('/forgot-password')} activeOpacity={0.7}>
                  <Text style={styles.forgotLink}>Forgot password?</Text>
                </TouchableOpacity>
              </View>
              <View style={[styles.inputRow, !!errors.password && styles.inputRowError]}>
                <Ionicons name="lock-closed-outline" size={16} color={errors.password ? colors.danger : colors.fg3} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.inputFlex]}
                  placeholder="••••••••••"
                  placeholderTextColor={colors.fg4}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={password}
                  onChangeText={v => { setPassword(v); clear('password'); }}
                />
                <TouchableOpacity onPress={() => setShowPassword(v => !v)} activeOpacity={0.7} style={styles.eyeBtn}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color={colors.fg3}
                  />
                </TouchableOpacity>
              </View>
              {!!errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
            </View>
          </View>

          {!!submitError && (
            <View style={styles.submitErrorBox}>
              <Ionicons name="alert-circle-outline" size={15} color={colors.danger} />
              <Text style={styles.submitErrorText}>{submitError}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleSignIn}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading
              ? <ActivityIndicator color={colors.onSky} size="small" />
              : <Text style={styles.primaryButtonText}>Sign in</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/create-account')} activeOpacity={0.7} style={styles.footerLink}>
            <Text style={styles.footerText}>
              New here?{' '}
              <Text style={styles.footerLinkText}>Create account</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(c: ColorSet) {
  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.bg },
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
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
    marginBottom: spacing[6],
  },
  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
    backgroundColor: c.skyBg,
    borderRadius: radii.md,
    padding: spacing[4],
    marginBottom: spacing[6],
  },
  noticeText: {
    flex: 1,
    fontFamily: 'InterTight-Regular',
    fontSize: 13,
    color: c.sky,
    lineHeight: 19,
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
  form: {
    gap: spacing[4],
    marginBottom: spacing[8],
  },
  inputGroup: {
    gap: spacing[1.5],
  },
  label: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 10,
    letterSpacing: 1.2,
    color: c.fg3,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  forgotLink: {
    fontFamily: 'InterTight-Medium',
    fontSize: 13,
    color: c.sky,
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
  inputFlex: {
    flex: 1,
  },
  eyeBtn: {
    paddingLeft: spacing[2],
  },
  primaryButton: {
    backgroundColor: c.sky,
    borderRadius: radii.lg,
    paddingVertical: spacing[4],
    alignItems: 'center',
    marginBottom: spacing[6],
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    fontFamily: 'InterTight-SemiBold',
    fontSize: 16,
    color: c.onSky,
  },
  footerLink: {
    alignItems: 'center',
  },
  footerText: {
    fontFamily: 'InterTight-Regular',
    fontSize: 14,
    color: c.fg2,
  },
  footerLinkText: {
    fontFamily: 'InterTight-SemiBold',
    color: c.sky,
  },
  });
}
