import { useMemo } from 'react';
import {
  View, Text, TouchableOpacity, Linking, StyleSheet,
  Modal, Platform, SafeAreaView, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, radii, darkColors as c } from '@/constants/tokens';
import { useForceUpgrade } from '@/lib/useForceUpgrade';

// Always uses dark theme — this is a system-level gate shown over everything.

export default function ForceUpgradeGate() {
  const { required, config, appVersion } = useForceUpgrade();

  const openStore = async () => {
    if (config.storeUrl) {
      await Linking.openURL(config.storeUrl).catch(() => null);
    }
  };

  return (
    <Modal
      visible={required}
      transparent={false}
      animationType="fade"
      statusBarTranslucent
      presentationStyle="fullScreen"
      // Not dismissible — user must update
      onRequestClose={() => {}}
    >
      <SafeAreaView style={styles.screen}>
        <View style={styles.body}>
          {/* Icon */}
          <View style={styles.iconRing}>
            <Ionicons name="arrow-up-circle" size={52} color={c.sky} />
          </View>

          {/* Text */}
          <Text style={styles.title}>{config.title}</Text>
          <Text style={styles.message}>{config.message}</Text>

          {/* CTA */}
          {config.storeUrl ? (
            <TouchableOpacity style={styles.btn} onPress={openStore} activeOpacity={0.8}>
              <Ionicons
                name={Platform.OS === 'ios' ? 'logo-apple-appstore' : 'logo-google-playstore'}
                size={18}
                color="white"
              />
              <Text style={styles.btnText}>
                {Platform.OS === 'ios' ? 'Update on App Store' : 'Update on Play Store'}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={[styles.btn, styles.btnWaiting]}>
              <ActivityIndicator size="small" color={c.sky} />
              <Text style={[styles.btnText, { color: c.fg2 }]}>Update coming soon</Text>
            </View>
          )}

          {/* Version note */}
          <Text style={styles.versionNote}>Current version: {appVersion}</Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: c.bg,
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing[8],
    gap: spacing[4],
  },
  iconRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: c.skyBg,
    borderWidth: 1,
    borderColor: c.sky + '40',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[2],
  },
  title: {
    fontFamily: 'InterTight-Bold',
    fontSize: 26,
    color: c.fg,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  message: {
    fontFamily: 'InterTight-Regular',
    fontSize: 15,
    color: c.fg2,
    textAlign: 'center',
    lineHeight: 22,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: c.sky,
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[4],
    borderRadius: radii.lg,
    marginTop: spacing[2],
    width: '100%',
    justifyContent: 'center',
  },
  btnWaiting: {
    backgroundColor: c.surface2,
    borderWidth: 1,
    borderColor: c.border,
  },
  btnText: {
    fontFamily: 'InterTight-SemiBold',
    fontSize: 16,
    color: 'white',
  },
  versionNote: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 11,
    color: c.fg4,
    marginTop: spacing[2],
  },
});
