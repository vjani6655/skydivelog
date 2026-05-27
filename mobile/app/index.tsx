import { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Image } from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { supabase } from '@/lib/supabase';
import { setCachedMedia } from '@/lib/mediaCache';
import Logo from '@/components/ui/Logo';
import type { ColorSet } from '@/constants/tokens';
import { useColors } from '@/lib/theme';

// Slots that are shown on the not-logged-in welcome screen
const WELCOME_SLOTS = ['welcome_hero']

async function prefetchMedia(slots: string[]): Promise<void> {
  await Promise.allSettled(
    slots.map(async (slot) => {
      const { data } = await supabase
        .from('app_media')
        .select('url')
        .eq('slot', slot)
        .maybeSingle()
      if (data?.url) {
        setCachedMedia(slot, data.url)
        await Image.prefetch(data.url)
      }
    })
  )
}

export default function SplashScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 2000,
      useNativeDriver: false,
    }).start();

    // Kick off session check AND media prefetch concurrently at t=0
    const sessionPromise = supabase.auth.getSession();
    const mediaPromise   = prefetchMedia(WELCOME_SLOTS);

    const timer = setTimeout(async () => {
      const { data: { session } } = await sessionPromise;
      if (session) {
        // Logged in — let media finish in the background, don't block routing
        router.replace('/(tabs)/log');
      } else {
        // Not logged in — wait for media so welcome screen renders instantly
        await mediaPromise;
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
        <Text style={styles.caption}>V {Constants.expoConfig?.version} · LOADING</Text>
      </View>

      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressBar, { width: barWidth }]} />
      </View>
    </View>
  );
}

function makeStyles(c: ColorSet) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.bg,
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
      color: c.fg,
      marginTop: 8,
    },
    caption: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 11,
      letterSpacing: 1.2,
      color: c.fg3,
      marginTop: 4,
    },
    progressTrack: {
      position: 'absolute',
      bottom: 48,
      left: 32,
      right: 32,
      height: 2,
      backgroundColor: c.surface3,
      borderRadius: 1,
      overflow: 'hidden',
    },
    progressBar: {
      height: 2,
      backgroundColor: c.sky,
      borderRadius: 1,
    },
  });
}
