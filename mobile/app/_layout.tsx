import { useEffect, useState } from 'react';
import { useFonts } from 'expo-font';
import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import 'react-native-reanimated';
import type { Session } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { UserPrefsProvider } from '@/lib/prefsContext';
import { registerPushToken } from '@/lib/notifications';

/** 
 * getSession() hangs indefinitely offline when the access token is expired
 * (Supabase tries to refresh it via network with no fetch timeout in RN).
 * Race it against a 3s timeout that falls back to the raw AsyncStorage value
 * so a logged-in offline user is still routed to their logs.
 */
async function getSessionWithOfflineFallback(): Promise<Session | null> {
  const fromSupabase = supabase.auth.getSession().then(r => r.data.session);

  const fallback = new Promise<Session | null>(resolve =>
    setTimeout(async () => {
      try {
        const keys = await AsyncStorage.getAllKeys();
        const authKey = keys.find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
        if (authKey) {
          const raw = await AsyncStorage.getItem(authKey);
          if (raw) {
            const parsed = JSON.parse(raw);
            // Accept the stored session even if the access token is expired —
            // Supabase will refresh it automatically once connectivity is restored.
            if (parsed?.user) {
              resolve(parsed as Session);
              return;
            }
          }
        }
      } catch {}
      resolve(null);
    }, 3000)
  );

  return Promise.race([fromSupabase, fallback]);
}

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'index',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    'InterTight-Regular':  require('@expo-google-fonts/inter-tight/400Regular/InterTight_400Regular.ttf'),
    'InterTight-Medium':   require('@expo-google-fonts/inter-tight/500Medium/InterTight_500Medium.ttf'),
    'InterTight-SemiBold': require('@expo-google-fonts/inter-tight/600SemiBold/InterTight_600SemiBold.ttf'),
    'InterTight-Bold':     require('@expo-google-fonts/inter-tight/700Bold/InterTight_700Bold.ttf'),
    'JetBrainsMono-Regular':  require('@expo-google-fonts/jetbrains-mono/400Regular/JetBrainsMono_400Regular.ttf'),
    'JetBrainsMono-Medium':   require('@expo-google-fonts/jetbrains-mono/500Medium/JetBrainsMono_500Medium.ttf'),
    'JetBrainsMono-SemiBold': require('@expo-google-fonts/jetbrains-mono/600SemiBold/JetBrainsMono_600SemiBold.ttf'),
  });
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    getSessionWithOfflineFallback().then(session => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        registerPushToken(supabase, session.user.id).catch(() => null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (loaded && session !== undefined) {
      SplashScreen.hideAsync();
    }
  }, [loaded, session]);

  if (!loaded || session === undefined) {
    return null;
  }

  return (
    <UserPrefsProvider>
    <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="welcome" />
      <Stack.Screen name="sign-in" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="create-account" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="paywall" options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
      <Stack.Screen name="subscription-success" options={{ animation: 'fade', gestureEnabled: false }} />
      <Stack.Screen name="forgot-password" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(auth)" />
    </Stack>
    </UserPrefsProvider>
  );
}

