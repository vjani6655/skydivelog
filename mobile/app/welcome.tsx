import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radii } from '@/constants/tokens';

function StripedHero() {
  const stripes = Array.from({ length: 20 });
  return (
    <View style={styles.hero}>
      <View style={styles.stripesContainer}>
        {stripes.map((_, i) => (
          <View
            key={i}
            style={[
              styles.stripe,
              { backgroundColor: i % 2 === 0 ? colors.surface : colors.surface2 },
            ]}
          />
        ))}
      </View>
      <Text style={styles.heroCaption}>HERO · CANOPY OVER DZ</Text>
    </View>
  );
}

export default function WelcomeScreen() {
  return (
    <View style={styles.container}>
      <StripedHero />

      <View style={styles.content}>
        <Text style={styles.title}>The logbook{'\n'}built for jumpers.</Text>
        <Text style={styles.subtitle}>
          Sign every jump in your pocket. Track gear, currency and certifications. Built by skydivers, for skydivers.
        </Text>

        <View style={styles.buttons}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/create-account')}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Create account</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.ghostButton}
            onPress={() => router.push('/sign-in')}
            activeOpacity={0.8}
          >
            <Text style={styles.ghostButtonText}>I already have an account</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.priceCaption}>$12 / year · cancel any time</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  hero: {
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  stripesContainer: {
    flex: 1,
    flexDirection: 'column',
  },
  stripe: {
    flex: 1,
  },
  heroCaption: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 10,
    letterSpacing: 1.4,
    color: colors.fg3,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing[6],
    paddingTop: spacing[8],
    paddingBottom: spacing[10],
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: 'InterTight-Bold',
    fontSize: 36,
    lineHeight: 40,
    letterSpacing: -0.8,
    color: colors.fg,
  },
  subtitle: {
    fontFamily: 'InterTight-Regular',
    fontSize: 15,
    lineHeight: 22,
    color: colors.fg2,
    marginTop: spacing[3],
  },
  buttons: {
    gap: spacing[3],
    marginTop: spacing[8],
  },
  primaryButton: {
    backgroundColor: colors.sky,
    borderRadius: radii.lg,
    paddingVertical: spacing[4],
    alignItems: 'center',
  },
  primaryButtonText: {
    fontFamily: 'InterTight-SemiBold',
    fontSize: 16,
    color: colors.onSky,
  },
  ghostButton: {
    borderRadius: radii.lg,
    paddingVertical: spacing[4],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  ghostButtonText: {
    fontFamily: 'InterTight-Medium',
    fontSize: 16,
    color: colors.fg,
  },
  priceCaption: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 11,
    letterSpacing: 0.5,
    color: colors.fg3,
    textAlign: 'center',
    marginTop: spacing[4],
  },
});
