import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { colors, spacing, radii } from '@/constants/tokens';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!email) return;
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    setLoading(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setSent(true);
    }
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
            <View style={styles.inputRow}>
              <Ionicons name="mail-outline" size={16} color={colors.fg3} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor={colors.fg4}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                value={email}
                onChangeText={setEmail}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleSend}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>{loading ? 'Sending…' : 'Send reset link'}</Text>
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
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
    color: colors.fg,
    marginBottom: spacing[2],
  },
  subtitle: {
    fontFamily: 'InterTight-Regular',
    fontSize: 15,
    color: colors.fg2,
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
  inputIcon: {
    marginRight: spacing[2],
  },
  input: {
    flex: 1,
    fontFamily: 'InterTight-Regular',
    fontSize: 15,
    color: colors.fg,
  },
  primaryButton: {
    backgroundColor: colors.sky,
    borderRadius: radii.lg,
    paddingVertical: spacing[4],
    alignItems: 'center',
    marginBottom: spacing[6],
  },
  buttonDisabled: { opacity: 0.5 },
  primaryButtonText: {
    fontFamily: 'InterTight-SemiBold',
    fontSize: 16,
    color: colors.onSky,
  },
  footerLink: { alignItems: 'center' },
  footerText: {
    fontFamily: 'InterTight-Regular',
    fontSize: 14,
    color: colors.fg2,
  },
  footerLinkText: {
    fontFamily: 'InterTight-SemiBold',
    color: colors.sky,
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
    backgroundColor: colors.skyBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[2],
  },
  confirmedTitle: {
    fontFamily: 'InterTight-Bold',
    fontSize: 26,
    letterSpacing: -0.4,
    color: colors.fg,
    textAlign: 'center',
  },
  confirmedSubtitle: {
    fontFamily: 'InterTight-Regular',
    fontSize: 15,
    color: colors.fg2,
    textAlign: 'center',
    lineHeight: 22,
  },
  confirmedEmail: {
    fontFamily: 'InterTight-SemiBold',
    color: colors.fg,
  },
  confirmedButton: {
    alignSelf: 'stretch',
    marginTop: spacing[2],
  },
});
