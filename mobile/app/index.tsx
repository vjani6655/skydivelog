import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import Logo from '@/components/ui/Logo';
import { colors } from '@/constants/tokens';

export default function SplashScreen() {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 2000,
      useNativeDriver: false,
    }).start();

    const timer = setTimeout(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.replace('/(tabs)/log');
      } else {
        router.replace('/welcome');
      }
    }, 2200);

    return () => clearTimeout(timer);
  }, []);

  const barWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <View style={styles.center}>
        <Logo size={80} variant="dark" />
        <Text style={styles.wordmark}>Jump Logs</Text>
        <Text style={styles.caption}>V 2.4.1 · LOADING</Text>
      </View>

      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressBar, { width: barWidth }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  wordmark: {
    fontFamily: 'InterTight-Bold',
    fontSize: 28,
    letterSpacing: -0.5,
    color: colors.fg,
    marginTop: 8,
  },
  caption: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 11,
    letterSpacing: 1.2,
    color: colors.fg3,
    marginTop: 4,
  },
  progressTrack: {
    position: 'absolute',
    bottom: 48,
    left: 32,
    right: 32,
    height: 2,
    backgroundColor: colors.surface3,
    borderRadius: 1,
    overflow: 'hidden',
  },
  progressBar: {
    height: 2,
    backgroundColor: colors.sky,
    borderRadius: 1,
  },
});
