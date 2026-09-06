import { useEffect, useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { colors } from '@/theme';

const PIECES = 26;
const PALETTE = [colors.neon, colors.neonAlt, colors.gold, '#FFFFFF', '#3FD8FF'];

function Piece({ index, width, height }: { index: number; width: number; height: number }) {
  const progress = useSharedValue(0);

  const config = useMemo(() => {
    const startX = Math.random() * width;
    return {
      startX,
      drift: (Math.random() - 0.5) * 120,
      delay: Math.random() * 700,
      duration: 1500 + Math.random() * 1400,
      spin: (Math.random() < 0.5 ? -1 : 1) * (360 + Math.random() * 540),
      size: 6 + Math.random() * 7,
      color: PALETTE[index % PALETTE.length],
      long: Math.random() < 0.5,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, width]);

  useEffect(() => {
    progress.value = withDelay(
      config.delay,
      withTiming(1, { duration: config.duration, easing: Easing.in(Easing.quad) })
    );
  }, [config, progress]);

  const style = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      opacity: p > 0.85 ? (1 - p) / 0.15 : p > 0 ? 1 : 0,
      transform: [
        { translateX: config.startX + config.drift * p },
        { translateY: -30 + (height + 80) * p },
        { rotate: `${config.spin * p}deg` },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.piece,
        {
          width: config.long ? config.size * 0.6 : config.size,
          height: config.long ? config.size * 1.8 : config.size,
          backgroundColor: config.color,
          borderRadius: config.long ? 2 : config.size / 2,
        },
        style,
      ]}
    />
  );
}

/** One-shot confetti fall; mount it when something is worth celebrating. */
export function Confetti() {
  const { width, height } = useWindowDimensions();
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: PIECES }).map((_, i) => (
        <Piece key={i} index={i} width={width} height={height} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  piece: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});
