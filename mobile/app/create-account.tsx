import { useState } from 'react';
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
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { colors, spacing, radii } from '@/constants/tokens';

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

  const clear = (field: keyof Errors) => {
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleContinue = async () => {
    const e = validate({ fullName, email, password, licence, rating, agreed });
    setErrors(e);
    if (Object.values(e).some(v => v)) return;
    setSubmitError('');
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
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
                  placeholder="Erin Morrison"
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
                  onChangeText={v => { setEmail(v); clear('email'); }}
                />
              </View>
              {!!errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
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
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
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
                    placeholder="APF 14829"
                    placeholderTextColor={colors.fg4}
                    autoCapitalize="characters"
                    value={licence}
                    onChangeText={v => { setLicence(v); clear('licence'); }}
                  />
                </View>
                {!!errors.licence && <Text style={styles.errorText}>{errors.licence}</Text>}
              </View>
              <View style={[styles.inputGroup, { width: 88 }]}>
                <Text style={styles.label}>RATING</Text>
                <View style={[styles.inputRow, !!errors.rating && styles.inputRowError]}>
                  <TextInput
                    style={styles.input}
                    placeholder="B"
                    placeholderTextColor={colors.fg4}
                    autoCapitalize="characters"
                    value={rating}
                    onChangeText={v => { setRating(v); clear('rating'); }}
                  />
                </View>
                {!!errors.rating && <Text style={styles.errorText}>{errors.rating}</Text>}
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
                  <Text style={styles.checkLink}>Terms</Text>
                  {' '}and{' '}
                  <Text style={styles.checkLink}>Privacy Policy</Text>
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
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
    color: colors.fg,
    marginBottom: spacing[2],
  },
  subtitle: {
    fontFamily: 'InterTight-Regular',
    fontSize: 15,
    color: colors.fg2,
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
    color: colors.fg3,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing[3],
    height: 48,
  },
  inputRowError: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerBg,
  },
  errorText: {
    fontFamily: 'InterTight-Regular',
    fontSize: 12,
    color: colors.danger,
    marginTop: 2,
  },
  inputIcon: {
    marginRight: spacing[2],
  },
  input: {
    flex: 1,
    fontFamily: 'InterTight-Regular',
    fontSize: 15,
    color: colors.fg,
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
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  checkboxChecked: {
    backgroundColor: colors.sky,
    borderColor: colors.sky,
  },
  checkboxError: {
    borderColor: colors.danger,
  },
  submitErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.dangerBg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: `${colors.danger}40`,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    marginBottom: spacing[4],
  },
  submitErrorText: {
    fontFamily: 'InterTight-Regular',
    fontSize: 13,
    color: colors.danger,
    flex: 1,
  },
  checkLabel: {
    fontFamily: 'InterTight-Regular',
    fontSize: 14,
    color: colors.fg2,
    flex: 1,
  },
  checkLink: {
    fontFamily: 'InterTight-SemiBold',
    color: colors.sky,
  },
  primaryButton: {
    backgroundColor: colors.sky,
    borderRadius: radii.lg,
    paddingVertical: spacing[4],
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  primaryButtonText: {
    fontFamily: 'InterTight-SemiBold',
    fontSize: 16,
    color: colors.onSky,
  },
});
