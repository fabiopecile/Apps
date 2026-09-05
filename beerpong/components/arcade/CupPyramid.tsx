import { useEffect, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, Ellipse, LinearGradient, Path, Stop } from 'react-native-svg';
import type { CupSpec } from '@/lib/arcadeLayout';

interface CupProps {
  spec: CupSpec;
  alive: boolean;
  accent: string;
}

// A stylized red Solo-cup profile, drawn once per cup on a 100x125 viewBox.
// Tapered trapezoid body + a rim ellipse for the open top, shaded with a
// left-to-right gradient to fake a cylindrical highlight.
function CupArt({ id, accent }: { id: string; accent: string }) {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 125">
      <Defs>
        <LinearGradient id={`body-${id}`} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#ff8177" />
          <Stop offset="0.45" stopColor="#e2231b" />
          <Stop offset="1" stopColor="#7a0d0d" />
        </LinearGradient>
        <LinearGradient id={`rim-${id}`} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#ffb3ac" />
          <Stop offset="0.5" stopColor="#ff5c50" />
          <Stop offset="1" stopColor="#b32c22" />
        </LinearGradient>
      </Defs>

      {/* base shadow */}
      <Ellipse cx={50} cy={119} rx={26} ry={5} fill="#000000" opacity={0.35} />

      {/* body */}
      <Path d="M9,18 L91,18 L76,116 L24,116 Z" fill={`url(#body-${id})`} />

      {/* subtle sheen stripe */}
      <Path d="M22,26 L30,22 L23,110 L17,109 Z" fill="#ffffff" opacity={0.16} />

      {/* rim */}
      <Ellipse cx={50} cy={18} rx={41} ry={10} fill={`url(#rim-${id})`} />
      <Ellipse cx={50} cy={18} rx={41} ry={10} fill="none" stroke={accent} strokeWidth={2} opacity={0.85} />
      <Ellipse cx={50} cy={18} rx={31} ry={6.4} fill="#5c0b0b" opacity={0.9} />
    </Svg>
  );
}

function Cup({ spec, alive, accent }: CupProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const rotate = useSharedValue(0);
  const dropY = useSharedValue(0);
  const tiltDirection = useMemo(() => (Math.random() > 0.5 ? 1 : -1), []);
  const svgId = `${spec.index}`;

  useEffect(() => {
    if (!alive) {
      rotate.value = withTiming(78 * tiltDirection, { duration: 340 });
      dropY.value = withTiming(spec.height * 0.35, { duration: 340 });
      scale.value = withDelay(120, withTiming(0.85, { duration: 220 }));
      opacity.value = withDelay(180, withTiming(0, { duration: 260 }));
    } else {
      rotate.value = 0;
      dropY.value = 0;
      scale.value = withSequence(withTiming(1.08, { duration: 90 }), withSpring(1, { damping: 8 }));
      opacity.value = withTiming(1, { duration: 200 });
    }
  }, [alive, scale, opacity, rotate, dropY, spec.height, tiltDirection]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: spec.x - spec.width / 2 },
      { translateY: spec.y - spec.height / 2 + dropY.value },
      { scale: scale.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.cup, { width: spec.width, height: spec.height }, style]}
    >
      <CupArt id={svgId} accent={accent} />
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
  },
});
