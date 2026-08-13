import { useEffect } from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider } from '@/contexts/AuthContext';
import { colors } from '@/constants/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  const app = (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="chat/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="post/new" options={{ presentation: 'modal' }} />
      </Stack>
    </>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaProvider>
        <AuthProvider>
          {Platform.OS === 'web' ? (
            <View style={styles.webOuter}>
              <View style={styles.webPhone}>{app}</View>
            </View>
          ) : (
            app
          )}
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// The app is designed for a phone screen. On web (dev preview only) it would
// otherwise stretch to the full browser width, so cap it at a phone-ish
// width and center it — matching how the app actually looks on a device.
const styles = StyleSheet.create({
  webOuter: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.black,
  },
  webPhone: {
    flex: 1,
    width: '100%',
    maxWidth: 430,
    backgroundColor: colors.background,
  },
});
