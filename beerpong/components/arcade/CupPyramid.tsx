import { memo, useEffect, useId, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, {
  Defs,
  Ellipse,
  LinearGradient,
  Path,
  RadialGradient,
  Stop,
} from 'react-native-svg';
import type { CupSpec } from '@/lib/arcadeLayout';

interface CupProps {
  spec: CupSpec;
  alive: boolean;
  accent: string;
}

/**
 * A moulded plastic cup on a 100x125 viewBox: concave silhouette with an
 * elliptical base, a rolled lip, two moulding ribs, a broad soft gloss on the
 * lit side plus a tight specular on the shaded one, and a beer surface inside.
 */
/**
 * A cup, drawn once and then left alone.
 *
 * Memoised deliberately, and it is not a micro-optimisation: without it every
 * score, hint or turn change in the match screen rebuilt all twenty of these
 * SVGs — around forty elements each — and a CPU profile of one throw came back
 * with `createElement`, `jsx` and `createDOMProps` at the top by a wide margin.
 * The props here are a stable id and a colour, so nothing is ever recomputed.
 */
const CupArt = memo(function CupArt({ id, accent }: { id: string; accent: string }) {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 125">
      <Defs>
        <LinearGradient id={`body-${id}`} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#17590e" />
          <Stop offset="0.12" stopColor="#49cc27" />
          <Stop offset="0.34" stopColor="#86ff56" />
          <Stop offset="0.58" stopColor="#2fb01d" />
          <Stop offset="0.84" stopColor="#0d5209" />
          <Stop offset="1" stopColor="#083405" />
        </LinearGradient>
        <LinearGradient id={`lip-${id}`} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#2c7a1c" />
          <Stop offset="0.28" stopColor="#d6ffc2" />
          <Stop offset="0.6" stopColor="#6bf545" />
          <Stop offset="1" stopColor="#17590e" />
        </LinearGradient>
        <RadialGradient id={`inner-${id}`} cx="50%" cy="30%" r="70%">
          <Stop offset="0" stopColor="#032302" />
          <Stop offset="1" stopColor="#0b4508" />
        </RadialGradient>
        <RadialGradient id={`shadow-${id}`} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#000000" stopOpacity={0.45} />
          <Stop offset="0.55" stopColor="#000000" stopOpacity={0.2} />
          <Stop offset="1" stopColor="#000000" stopOpacity={0} />
        </RadialGradient>
        <LinearGradient id={`gloss-${id}`} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#ffffff" stopOpacity={0} />
          <Stop offset="0.5" stopColor="#ffffff" stopOpacity={0.55} />
          <Stop offset="1" stopColor="#ffffff" stopOpacity={0} />
        </LinearGradient>
        <LinearGradient id={`beer-${id}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#ffcf4d" />
          <Stop offset="1" stopColor="#c8891a" />
        </LinearGradient>
      </Defs>

      {/* soft contact shadow */}
      <Ellipse cx={50} cy={116} rx={32} ry={9} fill={`url(#shadow-${id})`} />

      {/* body */}
      <Path
        d="M13,21 C15,54 20,86 26,105 A24,6.5 0 0 0 74,105 C80,86 85,54 87,21 Z"
        fill={`url(#body-${id})`}
      />
      <Path d="M26,105 A24,6.5 0 0 0 74,105" fill="none" stroke="#a8ff88" strokeWidth={1.5} opacity={0.3} />

      {/* moulding ribs */}
      <Path d="M16,45 C33,51 67,51 84,45" fill="none" stroke="#000000" strokeWidth={1.3} opacity={0.14} />
      <Path d="M19,75 C35,81 65,81 81,75" fill="none" stroke="#000000" strokeWidth={1.3} opacity={0.14} />

      {/* highlights */}
      <Path
        d="M23,28 C25,58 29,88 33,103 L41,101 C36,86 32,57 31,28 Z"
        fill={`url(#gloss-${id})`}
        opacity={0.6}
      />
      <Path d="M69,30 C70,57 68,84 66,99 L69,98 C73,84 74,57 73,30 Z" fill="#ffffff" opacity={0.2} />

      {/* cavity, beer, rolled lip */}
      <Ellipse cx={50} cy={21} rx={37} ry={9.6} fill={`url(#inner-${id})`} />
      <Ellipse cx={50} cy={26} rx={30} ry={7.6} fill={`url(#beer-${id})`} />
      <Ellipse cx={50} cy={26} rx={30} ry={7.6} fill="none" stroke="#ffe08a" strokeWidth={0.9} opacity={0.55} />
      <Path
        d="M13,21 A37,9.6 0 0 1 87,21 A37,9.6 0 0 1 13,21 Z"
        fill="none"
        stroke={`url(#lip-${id})`}
        strokeWidth={5}
      />
      <Ellipse cx={50} cy={21} rx={37} ry={9.6} fill="none" stroke={accent} strokeWidth={1.5} opacity={0.7} />
    </Svg>
  );
})

/**
 * One cup on the table. `spec` comes from a memoised rack and the other two
 * props are primitives, so this only ever re-renders when the cup is actually
 * knocked down — see the note on `CupArt`.
 */
const Cup = memo(function Cup({ spec, alive, accent }: CupProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const rotate = useSharedValue(0);
  const dropY = useSharedValue(0);
  const tiltDirection = useMemo(() => (Math.random() > 0.5 ? 1 : -1), []);
  const svgId = useId();

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
})

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
