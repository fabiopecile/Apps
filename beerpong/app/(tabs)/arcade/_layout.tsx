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
      <Stack.Screen name="league" />
      <Stack.Screen name="skins" />
    </Stack>
  );
}
