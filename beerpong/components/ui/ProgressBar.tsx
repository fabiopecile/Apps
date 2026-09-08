import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, glow, radius } from '@/theme';

interface ProgressBarProps {
  progress: number; // 0-1
  height?: number;
  color?: string;
  /** A highlight that sweeps along the filled part. Off for dense lists. */
  shimmer?: boolean;
}

const SHEEN_WIDTH = 90;

export function ProgressBar({
  progress,
  height = 8,
  color = colors.neon,
  shimmer = true,
}: ProgressBarProps) {
  const width = useSharedValue(0);
  const sweep = useSharedValue(0);

  const clamped = Math.max(0, Math.min(1, progress));

  useEffect(() => {
    width.value = withTiming(clamped, { duration: 620, easing: Easing.out(Easing.cubic) });
  }, [clamped, width]);

  useEffect(() => {
    if (!shimmer || clamped <= 0.02) return;
    sweep.value = 0;
    sweep.value = withRepeat(
      withTiming(1, { duration: 1900, easing: Easing.inOut(Easing.quad) }),
      -1
    );
  }, [shimmer, clamped, sweep]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${width.value * 100}%`,
  }));

  // Travels a bit beyond both ends so the highlight enters and leaves cleanly.
  const sheenStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -SHEEN_WIDTH + sweep.value * (SHEEN_WIDTH * 2 + 240) }],
  }));

  return (
    <View style={[styles.track, { height, borderRadius: height / 2 }]}>
      <Animated.View
        style={[
          styles.fill,
          { height, borderRadius: height / 2, backgroundColor: color },
          glow('soft', color),
          fillStyle,
        ]}
      >
        {shimmer && clamped > 0.02 ? (
          <Animated.View style={[styles.sheen, { height }, sheenStyle]} pointerEvents="none">
            <LinearGradient
              colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.42)', 'rgba(255,255,255,0)']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        ) : null}
      </Animated.View>
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
    overflow: 'hidden',
  },
  sheen: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: SHEEN_WIDTH,
  },
});
