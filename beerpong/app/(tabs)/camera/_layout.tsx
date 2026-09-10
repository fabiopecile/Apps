import { Stack } from 'expo-router';
import { colors } from '@/theme';

export default function CameraStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="tournament" />
      <Stack.Screen name="online" />
      <Stack.Screen name="room" />
      <Stack.Screen name="highlights" />
    </Stack>
  );
}
