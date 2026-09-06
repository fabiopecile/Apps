import { forwardRef, useImperativeHandle, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
  type SharedValue,
} from 'react-native-reanimated';
import { colors } from '@/theme';

export interface ParticleBurstHandle {
  burst: (x: number, y: number) => void;
}

const PARTICLE_COUNT = 16;
const COLORS = [colors.neon, colors.neonAlt, '#FFFFFF'];

function Particle({
  index,
  originX,
  originY,
  trigger,
}: {
  index: number;
  originX: SharedValue<number>;
  originY: SharedValue<number>;
  trigger: SharedValue<number>;
}) {
  // Rests at 1 (fully faded out); a burst resets it to 0 and plays it forward.
  const progress = useSharedValue(1);
  const angle = useMemo(
    () => (index / PARTICLE_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.5,
    [index]
  );
  const distance = useMemo(() => 46 + Math.random() * 90, [index]);
  const color = COLORS[index % COLORS.length];
  const size = 5 + (index % 3) * 2;

  useAnimatedReaction(
    () => trigger.value,
    (current, previous) => {
      // trigger starts at 0 and only counts up from an actual burst(); without
      // the guard the first reaction (previous === null) fires a stray burst
      // at the origin as soon as the screen mounts.
      if (current > 0 && current !== previous) {
        progress.value = 0;
        progress.value = withTiming(1, { duration: 650, easing: Easing.out(Easing.cubic) });
      }
    }
  );

  const style = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      left: originX.value,
      top: originY.value,
      opacity: 1 - p,
      transform: [
        { translateX: Math.cos(angle) * distance * p },
        { translateY: Math.sin(angle) * distance * p - p * 26 },
        { scale: 1 - p * 0.55 },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.particle,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
        style,
      ]}
    />
  );
}

export const ParticleBurst = forwardRef<ParticleBurstHandle>((_props, ref) => {
  const originX = useSharedValue(0);
  const originY = useSharedValue(0);
  const trigger = useSharedValue(0);

  useImperativeHandle(ref, () => ({
    burst: (x: number, y: number) => {
      originX.value = x;
      originY.value = y;
      trigger.value = trigger.value + 1;
    },
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: PARTICLE_COUNT }).map((_, i) => (
        <Particle key={i} index={i} originX={originX} originY={originY} trigger={trigger} />
      ))}
    </View>
  );
});

ParticleBurst.displayName = 'ParticleBurst';

const styles = StyleSheet.create({
  particle: {
    position: 'absolute',
  },
});
