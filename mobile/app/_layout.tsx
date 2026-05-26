import { useEffect, useState } from 'react';
import { useFonts } from 'expo-font';
import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import 'react-native-reanimated';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { UserPrefsProvider } from '@/lib/prefsContext';
import { registerPushToken } from '@/lib/notifications';

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
    supabase.auth.getSession().then(({ data: { session } }) => {
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
      <Stack.Screen name="forgot-password" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(auth)" />
    </Stack>
    </UserPrefsProvider>
  );
}

