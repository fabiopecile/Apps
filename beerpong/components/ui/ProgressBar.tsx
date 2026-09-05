import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { colors, glow, radius } from '@/theme';

interface ProgressBarProps {
  progress: number; // 0-1
  height?: number;
  color?: string;
}

export function ProgressBar({ progress, height = 8, color = colors.neon }: ProgressBarProps) {
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withTiming(Math.max(0, Math.min(1, progress)), { duration: 500 });
  }, [progress, width]);

  const style = useAnimatedStyle(() => ({
    width: `${width.value * 100}%`,
  }));

  return (
    <View style={[styles.track, { height, borderRadius: height / 2 }]}>
      <Animated.View
        style={[
          styles.fill,
          { height, borderRadius: height / 2, backgroundColor: color },
          glow('soft', color),
          style,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    backgroundColor: colors.backgroundElevated,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderFaint,
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});
