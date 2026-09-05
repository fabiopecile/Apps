import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { useBeerpongStore } from './store';
import { playSound, type SoundKey } from './sound';

async function hapticImpact(style: Haptics.ImpactFeedbackStyle) {
  if (Platform.OS === 'web') return;
  try {
    await Haptics.impactAsync(style);
  } catch {
    // Haptics unavailable on this device.
  }
}

async function hapticNotification(type: Haptics.NotificationFeedbackType) {
  if (Platform.OS === 'web') return;
  try {
    await Haptics.notificationAsync(type);
  } catch {
    // Haptics unavailable on this device.
  }
}

export function useFeedback() {
  const soundEnabled = useBeerpongStore((s) => s.soundEnabled);
  const hapticsEnabled = useBeerpongStore((s) => s.hapticsEnabled);

  const play = (key: SoundKey) => {
    if (soundEnabled) void playSound(key);
  };

  return {
    tap: () => {
      play('tap');
      if (hapticsEnabled) void hapticImpact(Haptics.ImpactFeedbackStyle.Light);
    },
    cupHit: () => {
      play('cupHit');
      if (hapticsEnabled) void hapticImpact(Haptics.ImpactFeedbackStyle.Medium);
    },
    streak: () => {
      play('streak');
      if (hapticsEnabled) void hapticImpact(Haptics.ImpactFeedbackStyle.Heavy);
    },
    whoosh: () => {
      play('whoosh');
    },
    victory: () => {
      play('victory');
      if (hapticsEnabled) void hapticNotification(Haptics.NotificationFeedbackType.Success);
    },
    miss: () => {
      if (hapticsEnabled) void hapticNotification(Haptics.NotificationFeedbackType.Warning);
    },
  };
}
