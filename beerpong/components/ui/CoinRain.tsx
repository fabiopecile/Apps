import { useEffect, useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '@/theme';

/**
 * Coins falling, for the moments that pay.
 *
 * Confetti says "something happened"; this says "you were paid", which is a
 * different thing and deserves its own gesture. Deliberately fewer pieces than
 * the confetti and heavier: coins fall with a bit of tumble and land, rather
 * than fluttering.
 */
const COINS = 16;

function Coin({ index, width, height }: { index: number; width: number; height: number }) {
  const progress = useSharedValue(0);

  const config = useMemo(
    () => ({
      startX: 20 + Math.random() * Math.max(1, width - 40),
      drift: (Math.random() - 0.5) * 60,
      delay: Math.random() * 520,
      duration: 900 + Math.random() * 700,
      // A slow tumble, not a spin: a coin is a disc, not a leaf.
      spin: (Math.random() < 0.5 ? -1 : 1) * (180 + Math.random() * 220),
      size: 16 + Math.random() * 12,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [index, width]
  );

  useEffect(() => {
    progress.value = withDelay(
      config.delay,
      // Accelerating: gravity, roughly, which is what makes it read as weight.
      withTiming(1, { duration: config.duration, easing: Easing.in(Easing.quad) })
    );
  }, [config, progress]);

  const style = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      opacity: p <= 0 ? 0 : p > 0.82 ? Math.max(0, (1 - p) / 0.18) : 1,
      transform: [
        { translateX: config.startX + config.drift * p },
        { translateY: -40 + (height + 90) * p },
        { rotate: `${config.spin * p}deg` },
      ],
    };
  });

  // The icon sits inside an animated View rather than being animated itself.
  // `Animated.createAnimatedComponent(Ionicons)` looks tidier and does not
  // work: the icon is not a host component, and on the web build it throws
  // `this._icon.setNativeProps is not a function` on the first frame.
  return (
    <Animated.View style={[styles.coin, style]}>
      <Ionicons name="logo-bitcoin" size={config.size} color={colors.gold} />
    </Animated.View>
  );
}

/** One-shot coin fall; mount it when a reward is paid. */
export function CoinRain() {
  const { width, height } = useWindowDimensions();
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: COINS }).map((_, i) => (
        <Coin key={i} index={i} width={width} height={height} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  coin: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});
