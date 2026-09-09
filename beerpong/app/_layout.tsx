import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, Orbitron_500Medium, Orbitron_700Bold, Orbitron_900Black } from '@expo-google-fonts/orbitron';
import {
  BarlowCondensed_400Regular,
  BarlowCondensed_500Medium,
  BarlowCondensed_600SemiBold,
  BarlowCondensed_700Bold,
  BarlowCondensed_900Black,
} from '@expo-google-fonts/barlow-condensed';
import 'react-native-reanimated';

import { AnimatedSplash } from '@/components/ui/AnimatedSplash';
import { useBeerpongStore } from '@/lib/store';
import { preloadSounds } from '@/lib/sound';
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Orbitron_500Medium,
    Orbitron_700Bold,
    Orbitron_900Black,
    BarlowCondensed_400Regular,
    BarlowCondensed_500Medium,
    BarlowCondensed_600SemiBold,
    BarlowCondensed_700Bold,
    BarlowCondensed_900Black,
  });
  const hasHydrated = useBeerpongStore((s) => s.hasHydrated);
  const [bootDone, setBootDone] = useState(false);
  // On web, useFonts() can resolve before the browser has actually finished
  // parsing the font file, which briefly shows fallback "tofu" glyphs for
  // custom fonts like Orbitron. Wait for document.fonts.ready too.
  const [webFontsReady, setWebFontsReady] = useState(Platform.OS !== 'web');

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const fonts = (globalThis as { document?: { fonts?: { ready?: Promise<unknown> } } }).document?.fonts;
    if (fonts?.ready) {
      fonts.ready.then(() => setWebFontsReady(true));
    } else {
      setWebFontsReady(true);
    }
  }, []);

  // A failed font download shouldn't take the whole app down — fall back to
  // system fonts and carry on.
  useEffect(() => {
    if (fontError) {
      console.warn('[beerpong] Schriftarten konnten nicht geladen werden:', fontError);
    }
  }, [fontError]);
  const fontsReady = fontsLoaded || fontError != null;

  useEffect(() => {
    if (fontsReady && hasHydrated && webFontsReady) {
      SplashScreen.hideAsync().catch(() => {});
      void preloadSounds();
      const timer = setTimeout(() => setBootDone(true), 1100);
      return () => clearTimeout(timer);
    }
  }, [fontsReady, hasHydrated, webFontsReady]);

  if (!fontsReady || !hasHydrated || !webFontsReady) {
    return null;
  }

  if (!bootDone) {
    return <AnimatedSplash />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen
          name="profile"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="pro"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
      </Stack>
    </GestureHandlerRootView>
  );
}
