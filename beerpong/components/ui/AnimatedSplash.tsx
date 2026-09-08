import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { LOGO_PARTS } from './LogoMark';
import { colors, fonts } from '@/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const SIZE = 168;
const { CUPS, CUP_R, TRAIL, BALL } = LOGO_PARTS;

/**
 * The launch animation: the rack builds itself cup by cup from the back row
 * forward, the ball then flies down the trail into the front cup, and the
 * wordmark rises underneath.
 */
export function AnimatedSplash() {
  // One progress value drives the whole sequence; each part reads its own
  // slice of it, which keeps the timing readable in one place.
  const build = useSharedValue(0);
  const ball = useSharedValue(0);
  const word = useSharedValue(0);
  const glow = useSharedValue(0);

  useEffect(() => {
    build.value = withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) });
    ball.value = withDelay(400, withTiming(1, { duration: 460, easing: Easing.in(Easing.quad) }));
    word.value = withDelay(560, withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) }));
    glow.value = withDelay(
      860,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 760, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 760, easing: Easing.inOut(Easing.ease) })
        ),
        -1
      )
    );
  }, [build, ball, word, glow]);

  const markStyle = useAnimatedStyle(() => ({
    opacity: 0.75 + glow.value * 0.25,
    transform: [{ scale: 0.9 + build.value * 0.1 + glow.value * 0.02 }],
  }));

  const wordStyle = useAnimatedStyle(() => ({
    opacity: word.value,
    transform: [{ translateY: (1 - word.value) * 14 }],
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={markStyle}>
        <Svg width={SIZE} height={SIZE} viewBox="0 0 100 100">
          <Defs>
            <RadialGradient id="splash-cup" cx="50%" cy="42%" r="62%">
              <Stop offset="0" stopColor={colors.neonAlt} stopOpacity={0.34} />
              <Stop offset="1" stopColor={colors.neon} stopOpacity={0.08} />
            </RadialGradient>
          </Defs>

          {CUPS.map((cup, index) => (
            <SplashCup key={index} cup={cup} index={index} build={build} />
          ))}

          {TRAIL.map((dot, index) => (
            <TrailDot key={index} dot={dot} index={index} ball={ball} />
          ))}

          <FlyingBall ball={ball} />
        </Svg>
      </Animated.View>

      <Animated.View style={wordStyle}>
        <Text style={styles.title}>BEERPONG</Text>
        <Text style={styles.subtitle}>TRACK · PLAY · WIN</Text>
      </Animated.View>
    </View>
  );
}

/** Cups appear back row first, so the rack reads as being set up. */
function SplashCup({
  cup,
  index,
  build,
}: {
  cup: { x: number; y: number };
  index: number;
  build: SharedValue<number>;
}) {
  const order = [5, 4, 3, 2, 1, 0][index] / 5;
  const props = useAnimatedProps(() => {
    const local = Math.max(0, Math.min(1, (build.value - order * 0.45) / 0.55));
    return { r: CUP_R * local, opacity: local };
  });
  return (
    <AnimatedCircle
      cx={cup.x}
      cy={cup.y}
      fill="url(#splash-cup)"
      stroke={index < 3 ? colors.neon : colors.neonAlt}
      strokeWidth={2.1}
      animatedProps={props}
    />
  );
}

/** Trail dots light up just before the ball passes them, then fade. */
function TrailDot({
  dot,
  index,
  ball,
}: {
  dot: { x: number; y: number; r: number };
  index: number;
  ball: SharedValue<number>;
}) {
  const lead = 1 - index / TRAIL.length;
  const props = useAnimatedProps(() => {
    const local = Math.max(0, Math.min(1, (ball.value - lead * 0.55) / 0.3));
    return { opacity: local * (0.35 + index * 0.12) };
  });
  return <AnimatedCircle cx={dot.x} cy={dot.y} r={dot.r} fill={colors.neon} animatedProps={props} />;
}

/** The ball travels from its resting spot down the trail into the front cup. */
function FlyingBall({ ball }: { ball: SharedValue<number> }) {
  const target = CUPS[0];
  const props = useAnimatedProps(() => {
    const t = ball.value;
    return {
      cx: BALL.x + (target.x - BALL.x) * t,
      cy: BALL.y + (target.y - BALL.y) * t,
      // Shrinks as it drops in, so it reads as going *into* the cup.
      r: BALL.r * (1 - t * 0.42),
      opacity: t < 0.02 ? 0 : 1,
    };
  });
  return <AnimatedCircle fill="#F5F7F5" animatedProps={props} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: 24,
    fontFamily: fonts.displayBlack,
    fontSize: 28,
    color: colors.neon,
    letterSpacing: 4,
    textAlign: 'center',
    textShadowColor: colors.neonGlow,
    textShadowRadius: 20,
    textShadowOffset: { width: 0, height: 0 },
  },
  subtitle: {
    marginTop: 8,
    fontFamily: fonts.label,
    fontSize: 12,
    color: colors.textSecondary,
    letterSpacing: 4,
    textAlign: 'center',
  },
});
