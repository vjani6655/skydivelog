import { useState, useMemo } from 'react';
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
  Linking,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { spacing, radii } from '@/constants/tokens';
import type { ColorSet } from '@/constants/tokens';
import { useColors } from '@/lib/theme';

type Errors = {
  fullName: string;
  email: string;
  password: string;
  licence: string;
  rating: string;
  agreed: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(f: { fullName: string; email: string; password: string; licence: string; rating: string; agreed: boolean }): Errors {
  const e: Errors = { fullName: '', email: '', password: '', licence: '', rating: '', agreed: '' };
  if (!f.fullName.trim())         e.fullName = 'Full name is required';
  if (!f.email.trim())            e.email    = 'Email is required';
  else if (!EMAIL_RE.test(f.email.trim())) e.email = 'Enter a valid email address';
  if (!f.password)                e.password = 'Password is required';
  else if (f.password.length < 8) e.password = 'Must be at least 8 characters';
  if (!f.licence.trim())          e.licence  = 'Licence number is required';
  if (!f.rating.trim())           e.rating   = 'Rating is required';
  if (!f.agreed)                  e.agreed   = 'You must agree to the Terms and Privacy Policy';
  return e;
}

const EMPTY_ERRORS: Errors = { fullName: '', email: '', password: '', licence: '', rating: '', agreed: '' };

export default function CreateAccountScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [licence, setLicence] = useState('');
  const [rating, setRating] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Errors>(EMPTY_ERRORS);
  const [submitError, setSubmitError] = useState('');
  const [emailExists, setEmailExists] = useState(false);

  const clear = (field: keyof Errors) => {
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleContinue = async () => {
    const e = validate({ fullName, email, password, licence, rating, agreed });
    setErrors(e);
    if (Object.values(e).some(v => v)) return;
    setSubmitError('');
    setLoading(true);

    // Server-side check — reliable across all Supabase versions
    try {
      const checkRes = await fetch(`${WEB_URL}/api/auth/check-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (checkRes.ok) {
        const { exists } = await checkRes.json();
        if (exists) {
          setEmailExists(true);
          setErrors(prev => ({ ...prev, email: ' ' }));
          setLoading(false);
          return;
        }
      }
    } catch {
      // If the check fails, proceed with signUp (will show a generic error if needed)
    }

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${process.env.EXPO_PUBLIC_WEB_URL ?? 'https://www.jumplogs.com'}/api/auth/callback`,
        data: {
          full_name: fullName.trim(),
          licence_number: licence.trim(),
          licence_rating: rating.trim().toUpperCase(),
        },
      },
    });
    setLoading(false);
    if (error) {
      setSubmitError(error.message);
    } else if (!data.session) {
      // Email confirmation required — no session until the link is clicked.
      router.replace({ pathname: '/sign-in', params: { notice: 'Account created! Check your email for a confirmation link, then come back and sign in.' } });
    } else {
      router.push('/paywall');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity style={styles.back} onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={22} color={colors.fg} />
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>Set up your logbook.</Text>
            <Text style={styles.subtitle}>Licence details are required to create your account.</Text>
          </View>

          <View style={styles.form}>
            {/* Full name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>FULL NAME</Text>
              <View style={[styles.inputRow, !!errors.fullName && styles.inputRowError]}>
                <TextInput
                  style={styles.input}
                  placeholder="James Smith"
                  placeholderTextColor={colors.fg4}
                  autoCapitalize="words"
                  autoComplete="name"
                  value={fullName}
                  onChangeText={v => { setFullName(v); clear('fullName'); }}
                />
              </View>
              {!!errors.fullName && <Text style={styles.errorText}>{errors.fullName}</Text>}
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>EMAIL</Text>
              <View style={[styles.inputRow, !!errors.email && styles.inputRowError]}>
                <Ionicons name="mail-outline" size={16} color={errors.email ? colors.danger : colors.fg3} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="you@example.com"
                  placeholderTextColor={colors.fg4}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  value={email}
                  onChangeText={v => { setEmail(v); clear('email'); setEmailExists(false); }}
                />
              </View>
              {!!errors.email?.trim() && !emailExists && <Text style={styles.errorText}>{errors.email}</Text>}
              {emailExists && (
                <View style={styles.emailExistsBox}>
                  <Text style={styles.emailExistsText}>An account with this email already exists.</Text>
                  <View style={styles.emailExistsActions}>
                    <TouchableOpacity onPress={() => router.replace('/sign-in' as never)} activeOpacity={0.7}>
                      <Text style={styles.emailExistsLink}>Sign in</Text>
                    </TouchableOpacity>
                    <Text style={styles.emailExistsSep}> · </Text>
                    <TouchableOpacity onPress={() => router.replace('/forgot-password' as never)} activeOpacity={0.7}>
                      <Text style={styles.emailExistsLink}>Reset password</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>PASSWORD</Text>
              <View style={[styles.inputRow, !!errors.password && styles.inputRowError]}>
                <TextInput
                  style={[styles.input, styles.inputFlex]}
                  placeholder="At least 8 characters"
                  placeholderTextColor={colors.fg4}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={password}
                  onChangeText={v => { setPassword(v); clear('password'); }}
                />
                <TouchableOpacity onPress={() => setShowPassword(v => !v)} activeOpacity={0.7} style={styles.eyeBtn}>
                  <Ionicons
                    name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={18}
                    color={colors.fg3}
                  />
                </TouchableOpacity>
              </View>
              {!!errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
            </View>

            {/* Licence + Rating row */}
            <View style={styles.rowInputs}>
              <View style={[styles.inputGroup, styles.flex]}>
                <Text style={styles.label}>LICENCE #</Text>
                <View style={[styles.inputRow, !!errors.licence && styles.inputRowError]}>
                  <TextInput
                    style={styles.input}
                    placeholder="APF-2457830"
                    placeholderTextColor={colors.fg4}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    value={licence}
                    onChangeText={v => { setLicence(v); clear('licence'); }}
                  />
                </View>
                {!!errors.licence && <Text style={styles.errorText}>{errors.licence}</Text>}
                <Text style={styles.hintText}>Your APF number or governing body number</Text>
              </View>
              <View style={[styles.inputGroup, { width: 100 }]}>
                <Text style={styles.label}>RATING</Text>
                <View style={[styles.inputRow, !!errors.rating && styles.inputRowError]}>
                  <TextInput
                    style={styles.input}
                    placeholder="B-237"
                    placeholderTextColor={colors.fg4}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    value={rating}
                    onChangeText={v => { setRating(v); clear('rating'); }}
                  />
                </View>
                {!!errors.rating && <Text style={styles.errorText}>{errors.rating}</Text>}
                <Text style={styles.hintText}>e.g. B-237 or D-1897</Text>
              </View>
            </View>

            {/* Checkbox */}
            <View>
              <TouchableOpacity
                style={styles.checkRow}
                onPress={() => { setAgreed(v => !v); clear('agreed'); }}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, agreed && styles.checkboxChecked, !!errors.agreed && styles.checkboxError]}>
                  {agreed && <Ionicons name="checkmark" size={12} color={colors.onSky} />}
                </View>
                <Text style={styles.checkLabel}>
                  I agree to the{' '}
                  <Text style={styles.checkLink} onPress={() => Linking.openURL('https://jumplogs.com/terms')}>Terms</Text>
                  {' '}and{' '}
                  <Text style={styles.checkLink} onPress={() => Linking.openURL('https://jumplogs.com/privacy')}>Privacy Policy</Text>
                </Text>
              </TouchableOpacity>
              {!!errors.agreed && <Text style={[styles.errorText, { marginTop: 4 }]}>{errors.agreed}</Text>}
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
            onPress={handleContinue}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading
              ? <ActivityIndicator color={colors.onSky} size="small" />
              : <Text style={styles.primaryButtonText}>Continue</Text>}
          </TouchableOpacity>
        </ScrollView>
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
    marginBottom: spacing[7],
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
  },
  form: {
    gap: spacing[4],
    marginBottom: spacing[6],
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
    backgroundColor: c.dangerBg,
  },
  errorText: {
    fontFamily: 'InterTight-Regular',
    fontSize: 12,
    color: c.danger,
    marginTop: 2,
  },
  hintText: {
    fontFamily: 'InterTight-Regular',
    fontSize: 11,
    color: c.fg4,
    marginTop: 4,
  },
  emailExistsBox: {
    marginTop: 6,
    gap: 4,
  },
  emailExistsText: {
    fontFamily: 'InterTight-Regular',
    fontSize: 12,
    color: c.danger,
  },
  emailExistsActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emailExistsLink: {
    fontFamily: 'InterTight-SemiBold',
    fontSize: 12,
    color: c.sky,
    textDecorationLine: 'underline',
  },
  emailExistsSep: {
    fontFamily: 'InterTight-Regular',
    fontSize: 12,
    color: c.fg3,
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
  inputFlex: { flex: 1 },
  eyeBtn: { paddingLeft: spacing[2] },
  rowInputs: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginTop: spacing[2],
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.surface,
  },
  checkboxChecked: {
    backgroundColor: c.sky,
    borderColor: c.sky,
  },
  checkboxError: {
    borderColor: c.danger,
  },
  submitErrorBox: {
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
  submitErrorText: {
    fontFamily: 'InterTight-Regular',
    fontSize: 13,
    color: c.danger,
    flex: 1,
  },
  checkLabel: {
    fontFamily: 'InterTight-Regular',
    fontSize: 14,
    color: c.fg2,
    flex: 1,
  },
  checkLink: {
    fontFamily: 'InterTight-SemiBold',
    color: c.sky,
  },
  primaryButton: {
    backgroundColor: c.sky,
    borderRadius: radii.lg,
    paddingVertical: spacing[4],
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  primaryButtonText: {
    fontFamily: 'InterTight-SemiBold',
    fontSize: 16,
    color: c.onSky,
  },
  });
}
