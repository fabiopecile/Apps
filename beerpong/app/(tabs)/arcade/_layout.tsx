import { Stack } from 'expo-router';
import { colors } from '@/theme';

export default function ArcadeStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="offline" />
      <Stack.Screen name="rivals" />
      <Stack.Screen name="weekend" />
      <Stack.Screen name="skins" />
      <Stack.Screen name="match" options={{ animation: 'fade' }} />
    </Stack>
  );
}
