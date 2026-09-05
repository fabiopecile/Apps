import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { colors, glow } from '@/theme';
import type { CupSpec } from '@/lib/arcadeLayout';

interface CupProps {
  spec: CupSpec;
  alive: boolean;
  accent: string;
}

function Cup({ spec, alive, accent }: CupProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const wobble = useSharedValue(0);

  useEffect(() => {
    if (!alive) {
      scale.value = withSequence(
        withTiming(1.2, { duration: 90 }),
        withTiming(0, { duration: 260 })
      );
      opacity.value = withTiming(0, { duration: 300 });
    } else {
      scale.value = withSpring(1, { damping: 8 });
      opacity.value = withTiming(1, { duration: 200 });
    }
  }, [alive, scale, opacity]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: spec.x - spec.size / 2 },
      { translateY: spec.y - spec.size / 2 },
      { scale: scale.value },
      { rotate: `${wobble.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.cup,
        {
          width: spec.size,
          height: spec.size,
          borderRadius: spec.size * 0.22,
          borderColor: accent,
        },
        glow('soft', accent),
        style,
      ]}
    >
      <Animated.View style={[styles.cupInner, { backgroundColor: accent, opacity: 0.16 }]} />
    </Animated.View>
  );
}

interface CupPyramidProps {
  cups: CupSpec[];
  aliveFlags: boolean[];
  accent: string;
}

export function CupPyramid({ cups, aliveFlags, accent }: CupPyramidProps) {
  return (
    <>
      {cups.map((cup) => (
        <Cup key={cup.index} spec={cup} alive={aliveFlags[cup.index]} accent={accent} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  cup: {
    position: 'absolute',
    borderWidth: 2,
    overflow: 'hidden',
  },
  cupInner: {
    flex: 1,
  },
});
