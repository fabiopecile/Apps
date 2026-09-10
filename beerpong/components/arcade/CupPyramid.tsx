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
import { ART_HEIGHT, ART_WIDTH, cupArtGeometry } from '@/lib/cupGeometry';

interface CupProps {
  spec: CupSpec;
  alive: boolean;
  accent: string;
}

/**
 * A cup, drawn as the solid of revolution it is.
 *
 * The shape comes from `lib/cupGeometry`, which the physics reads too, so the
 * hole the ball is aimed at is the hole on screen. Everything is built from
 * that geometry rather than hard-coded, because the one number that makes a cup
 * look like an object instead of a sticker — how open its mouth is — changes
 * with how far away it stands.
 *
 * Layered back to front, the way you would paint it: the shadow it casts, the
 * outside of the cup, then the inside seen through the mouth, then the beer,
 * then the lip that separates in from out.
 *
 * Memoised deliberately, and it is not a micro-optimisation: without it every
 * score, hint or turn change in the match screen rebuilt all twenty of these
 * SVGs — around forty elements each — and a CPU profile of one throw came back
 * with `createElement`, `jsx` and `createDOMProps` at the top by a wide margin.
 * The props are a stable id, a colour and a width, so nothing is recomputed.
 */
const CupArt = memo(function CupArt({
  id,
  accent,
  width,
}: {
  id: string;
  accent: string;
  width: number;
}) {
  const g = cupArtGeometry(width);
  const cx = ART_WIDTH / 2;
  const bodyLength = g.baseCy - g.rimCy;

  // The outside: down one side, around the front of the base, back up the
  // other, and over the back of the rim. A real cup's wall bows in slightly.
  const outline = [
    `M${cx - g.rimRx},${g.rimCy}`,
    `C${cx - g.rimRx + 1.5},${g.rimCy + bodyLength * 0.45}`,
    ` ${cx - g.baseRx - 2.5},${g.baseCy - bodyLength * 0.3}`,
    ` ${cx - g.baseRx},${g.baseCy}`,
    `A${g.baseRx},${g.baseRy} 0 0 0 ${cx + g.baseRx},${g.baseCy}`,
    `C${cx + g.baseRx + 2.5},${g.baseCy - bodyLength * 0.3}`,
    ` ${cx + g.rimRx - 1.5},${g.rimCy + bodyLength * 0.45}`,
    ` ${cx + g.rimRx},${g.rimCy}`,
    `A${g.rimRx},${g.rimRy} 0 0 0 ${cx - g.rimRx},${g.rimCy}`,
    'Z',
  ].join('');

  // Two moulding ribs, following the taper rather than drawn straight across.
  const rib = (share: number) => {
    const y = g.rimCy + bodyLength * share;
    const rx = g.rimRx + (g.baseRx - g.rimRx) * share;
    const ry = (g.rimRy + (g.baseRy - g.rimRy) * share) * 0.85;
    return `M${cx - rx},${y}A${rx},${ry} 0 0 0 ${cx + rx},${y}`;
  };

  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${ART_WIDTH} ${ART_HEIGHT}`}>
      <Defs>
        {/* Across the body: dark edge, lit side, roll into shade, dark edge. */}
        <LinearGradient id={`body-${id}`} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#0d3d08" />
          <Stop offset="0.1" stopColor="#3fae22" />
          <Stop offset="0.3" stopColor="#8dff5e" />
          <Stop offset="0.52" stopColor="#4ac72a" />
          <Stop offset="0.78" stopColor="#155c0d" />
          <Stop offset="1" stopColor="#072a04" />
        </LinearGradient>
        <LinearGradient id={`lip-${id}`} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#2c7a1c" />
          <Stop offset="0.28" stopColor="#e2ffd2" />
          <Stop offset="0.6" stopColor="#6bf545" />
          <Stop offset="1" stopColor="#14500c" />
        </LinearGradient>
        {/* Inside: the far wall is in shade, the near wall catches light. */}
        <LinearGradient id={`inner-${id}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#021902" />
          <Stop offset="0.55" stopColor="#063004" />
          <Stop offset="1" stopColor="#0e4d0a" />
        </LinearGradient>
        <RadialGradient id={`shadow-${id}`} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#000000" stopOpacity={0.5} />
          <Stop offset="0.6" stopColor="#000000" stopOpacity={0.22} />
          <Stop offset="1" stopColor="#000000" stopOpacity={0} />
        </RadialGradient>
        <LinearGradient id={`gloss-${id}`} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#ffffff" stopOpacity={0} />
          <Stop offset="0.5" stopColor="#ffffff" stopOpacity={0.6} />
          <Stop offset="1" stopColor="#ffffff" stopOpacity={0} />
        </LinearGradient>
        <LinearGradient id={`beer-${id}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#ffd863" />
          <Stop offset="1" stopColor="#c07f14" />
        </LinearGradient>
      </Defs>

      {/* Cast shadow, offset away from the light rather than sitting square
          under the cup — that offset is most of what plants it on the table. */}
      <Ellipse
        cx={cx + g.baseRx * 0.3}
        cy={g.baseCy + g.baseRy * 0.55}
        rx={g.baseRx * 1.5}
        ry={g.baseRy * 1.5}
        fill={`url(#shadow-${id})`}
      />

      <Path d={outline} fill={`url(#body-${id})`} />

      {/* The base, seen as an ellipse from this angle. */}
      <Path
        d={`M${cx - g.baseRx},${g.baseCy}A${g.baseRx},${g.baseRy} 0 0 0 ${cx + g.baseRx},${g.baseCy}`}
        fill="none"
        stroke="#a8ff88"
        strokeWidth={1.4}
        opacity={0.28}
      />

      <Path d={rib(0.28)} fill="none" stroke="#000000" strokeWidth={1.3} opacity={0.16} />
      <Path d={rib(0.62)} fill="none" stroke="#000000" strokeWidth={1.3} opacity={0.16} />

      {/* Broad gloss down the lit side, tight specular on the shaded one. */}
      <Path
        d={`M${cx - g.rimRx * 0.72},${g.rimCy + g.rimRy * 0.7}
            C${cx - g.rimRx * 0.6},${g.rimCy + bodyLength * 0.5}
             ${cx - g.baseRx * 0.62},${g.baseCy - bodyLength * 0.18}
             ${cx - g.baseRx * 0.55},${g.baseCy - g.baseRy * 0.3}
            L${cx - g.baseRx * 0.2},${g.baseCy - g.baseRy * 0.4}
            C${cx - g.baseRx * 0.3},${g.baseCy - bodyLength * 0.3}
             ${cx - g.rimRx * 0.35},${g.rimCy + bodyLength * 0.45}
             ${cx - g.rimRx * 0.32},${g.rimCy + g.rimRy * 0.8} Z`}
        fill={`url(#gloss-${id})`}
        opacity={0.55}
      />
      <Path
        d={`M${cx + g.rimRx * 0.78},${g.rimCy + g.rimRy * 0.6}
            C${cx + g.rimRx * 0.7},${g.rimCy + bodyLength * 0.5}
             ${cx + g.baseRx * 0.75},${g.baseCy - bodyLength * 0.2}
             ${cx + g.baseRx * 0.7},${g.baseCy - g.baseRy * 0.4}
            L${cx + g.baseRx * 0.52},${g.baseCy - g.baseRy * 0.5}
            C${cx + g.baseRx * 0.6},${g.baseCy - bodyLength * 0.3}
             ${cx + g.rimRx * 0.62},${g.rimCy + bodyLength * 0.45}
             ${cx + g.rimRx * 0.62},${g.rimCy + g.rimRy * 0.7} Z`}
        fill="#ffffff"
        opacity={0.18}
      />

      {/* Through the mouth: the inside, then what is in it. */}
      <Ellipse cx={cx} cy={g.rimCy} rx={g.rimRx} ry={g.rimRy} fill={`url(#inner-${id})`} />
      <Ellipse cx={cx} cy={g.beerCy} rx={g.beerRx} ry={g.beerRy} fill={`url(#beer-${id})`} />
      <Ellipse
        cx={cx}
        cy={g.beerCy}
        rx={g.beerRx}
        ry={g.beerRy}
        fill="none"
        stroke="#ffe9a8"
        strokeWidth={0.9}
        opacity={0.5}
      />

      {/* The rolled lip, which is what separates inside from outside. */}
      <Ellipse
        cx={cx}
        cy={g.rimCy}
        rx={g.rimRx}
        ry={g.rimRy}
        fill="none"
        stroke={`url(#lip-${id})`}
        strokeWidth={5}
      />
      <Ellipse
        cx={cx}
        cy={g.rimCy}
        rx={g.rimRx}
        ry={g.rimRy}
        fill="none"
        stroke={accent}
        strokeWidth={1.4}
        opacity={0.65}
      />
    </Svg>
  );
});

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
      <CupArt id={svgId} accent={accent} width={spec.width} />
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
