import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { colors, fonts, glow, radius, spacing } from '@/theme';

interface StreakBadgeProps {
  streak: number;
}

export function StreakBadge({ streak }: StreakBadgeProps) {
  const pulse = useSharedValue(0);
  const active = streak >= 2;

  useEffect(() => {
    if (active) {
      pulse.value = withRepeat(withSequence(withTiming(1, { duration: 500 }), withTiming(0, { duration: 500 })), -1);
    } else {
      pulse.value = 0;
    }
  }, [active, pulse]);

  const style = useAnimatedStyle(() => ({
    opacity: 0.6 + pulse.value * 0.4,
    transform: [{ scale: 1 + pulse.value * 0.06 }],
  }));

  return (
    <View style={[styles.badge, active ? glow('medium') : undefined, !active && styles.inactive]}>
      <Animated.View style={active ? style : undefined}>
        <Ionicons
          name={streak >= 5 ? 'flash' : 'flame'}
          size={16}
          color={active ? colors.neon : colors.textMuted}
        />
      </Animated.View>
      <Text style={[styles.text, { color: active ? colors.neon : colors.textMuted }]}>
        {streak} STREAK
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundElevated,
  },
  inactive: {
    borderColor: colors.borderFaint,
  },
  text: {
    fontFamily: fonts.label,
    fontSize: 12,
    letterSpacing: 1.2,
  },
});
