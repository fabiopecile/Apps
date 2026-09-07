import { useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Line } from 'react-native-svg';
import { glow } from '@/theme';
import type { CupSpec } from '@/lib/arcadeLayout';
import { BallArt } from './BallArt';

const BALL_SIZE = 30;
const DRAG_POWER_DIVISOR = 150;
const DRAG_AIM_DIVISOR = 120;

export interface ThrowResult {
  cupIndex: number | null;
  hit: boolean;
  power: number;
  /** True when the ball caught the rim and kicked out. */
  rimOut: boolean;
  /** True when this was a bounce shot, which is worth two cups. */
  bounce: boolean;
}

interface ThrowBallProps {
  startX: number;
  startY: number;
  cups: CupSpec[];
  aliveFlags: boolean[];
  accent: string;
  /** 0-1: how likely your throws are to drop. */
  skill: number;
  onResult: (result: ThrowResult) => void;
  disabled?: boolean;
  /** Fades the ball out while the other side is throwing. */
  hidden?: boolean;
  /** 'up' throws at a rack above the ball, 'down' at one below it. */
  direction?: 'up' | 'down';
  /** Doubles up: harder to land, but takes two cups. */
  bounce?: boolean;
}

export function ThrowBall({
  startX,
  startY,
  cups,
  aliveFlags,
  accent,
  skill,
  onResult,
  disabled,
  hidden,
  direction = 'up',
  bounce = false,
}: ThrowBallProps) {
  const ballX = useSharedValue(startX);
  const ballY = useSharedValue(startY);
  const ballScale = useSharedValue(1);
  const ballOpacity = useSharedValue(1);
  const trailOpacity = useSharedValue(0);
  const [aimLine, setAimLine] = useState<{ dx: number; dy: number } | null>(null);
  const [flying, setFlying] = useState(false);
  const flyingRef = useRef(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resultTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setFlyingState = (value: boolean) => {
    flyingRef.current = value;
    setFlying(value);
  };

  useEffect(() => {
    ballOpacity.value = withTiming(hidden ? 0 : 1, { duration: 260 });
  }, [hidden, ballOpacity]);

  useEffect(
    () => () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
      if (resultTimer.current) clearTimeout(resultTimer.current);
    },
    []
  );

  // Keep the resting ball on its mark when the table is re-laid out (rotation,
  // window resize) rather than leaving it at the old coordinates. Deliberately
  // keyed on the start position only, so it never cuts a throw short.
  useEffect(() => {
    if (flyingRef.current) return;
    ballX.value = withTiming(startX, { duration: 160 });
    ballY.value = withTiming(startY, { duration: 160 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startX, startY]);

  // Maps the swipe direction onto the cup closest to where you aimed, so the
  // rack's left/right edges line up with a left/right flick.
  const pickTarget = (aimRatio: number): CupSpec | null => {
    const alive = cups.filter((c) => aliveFlags[c.index]);
    if (alive.length === 0) return null;
    const xs = alive.map((c) => c.x);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const center = (minX + maxX) / 2;
    const wantedX = center + aimRatio * ((maxX - minX) / 2 + 30);
    return alive.reduce((best, cup) => {
      const bestDistance = Math.abs(best.x - wantedX);
      const distance = Math.abs(cup.x - wantedX);
      if (distance < bestDistance) return cup;
      // Equally-aligned cups: take the one nearest the thrower.
      if (distance === bestDistance && cup.y > best.y) return cup;
      return best;
    }, alive[0]);
  };

  const finishThrow = (cupIndex: number, hit: boolean, power: number, rimOut: boolean) => {
    setFlyingState(false);
    setAimLine(null);
    onResult({ cupIndex, hit, power, rimOut, bounce });
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => {
      ballX.value = withTiming(startX, { duration: 260 });
      ballY.value = withTiming(startY, { duration: 260 });
      ballScale.value = withTiming(1, { duration: 260 });
    }, 220);
  };

  const scheduleResult = (cupIndex: number, hit: boolean, power: number, delay: number) => {
    if (resultTimer.current) clearTimeout(resultTimer.current);
    resultTimer.current = setTimeout(() => finishThrow(cupIndex, hit, power, true), delay);
  };

  const throwBall = (dx: number, dy: number) => {
    const power = Math.max(0, Math.min(1, Math.abs(dy) / DRAG_POWER_DIVISOR));
    const aimRatio = Math.max(-1, Math.min(1, dx / DRAG_AIM_DIVISOR));
    const target = pickTarget(aimRatio);

    if (!target || power < 0.12) {
      onResult({ cupIndex: null, hit: false, power, rimOut: false, bounce });
      return;
    }

    const hitChance = Math.max(
      0.08,
      Math.min(0.94, skill + power * 0.28 - (bounce ? 0.18 : 0))
    );
    const roll = Math.random();
    const hit = roll < hitChance;
    const isCritical = Math.abs(hitChance - roll) < 0.08;
    // A miss either rims out — the ball catches the lip and kicks away — or
    // sails wide of the rack entirely.
    const rimOut = !hit && Math.random() < 0.55;

    setFlyingState(true);
    trailOpacity.value = withTiming(1, { duration: 60 });

    const easing = Easing.out(Easing.quad);
    const mainDuration = isCritical ? 620 : 460;
    const landX = hit || rimOut ? target.x : target.x + (Math.random() - 0.5) * 90;
    const shortOf = direction === 'up' ? -1 : 1;
    const landY =
      hit ? target.y : rimOut ? target.y + shortOf * 8 : target.y + shortOf * (34 + Math.random() * 24);

    ballScale.value = withTiming(hit ? 0.5 : 0.62, { duration: mainDuration, easing });
    ballX.value = withTiming(landX, { duration: mainDuration, easing });
    ballY.value = withTiming(landY, { duration: mainDuration, easing }, (finished) => {
      if (!finished) return;
      if (rimOut) {
        // Catch the lip, kick sideways, then drop away past the rack.
        const kickX = landX + (Math.random() < 0.5 ? -1 : 1) * (34 + Math.random() * 30);
        const kickY = landY + shortOf * 24;
        ballScale.value = withSequence(
          withTiming(0.74, { duration: 90 }),
          withTiming(0.5, { duration: 320 })
        );
        ballX.value = withTiming(kickX, { duration: 380, easing: Easing.out(Easing.quad) });
        ballY.value = withSequence(
          withTiming(kickY, { duration: 140, easing: Easing.out(Easing.quad) }),
          withTiming(kickY - shortOf * 80, { duration: 260, easing: Easing.in(Easing.quad) })
        );
        trailOpacity.value = withTiming(0, { duration: 380 });
        runOnJS(scheduleResult)(target.index, hit, power, 420);
        return;
      }
      trailOpacity.value = withTiming(0, { duration: 200 });
      runOnJS(finishThrow)(target.index, hit, power, false);
    });
  };

  const pan = Gesture.Pan()
    .enabled(!disabled && !flying)
    .onChange((e) => {
      runOnJS(setAimLine)({ dx: e.translationX, dy: e.translationY });
    })
    .onEnd((e) => {
      runOnJS(setAimLine)(null);
      const flicked = direction === 'up' ? e.translationY < -20 : e.translationY > 20;
      if (flicked) {
        runOnJS(throwBall)(e.translationX, e.translationY);
      }
    });

  const ballStyle = useAnimatedStyle(() => ({
    opacity: ballOpacity.value,
    transform: [
      { translateX: ballX.value - BALL_SIZE / 2 },
      { translateY: ballY.value - BALL_SIZE / 2 },
      { scale: ballScale.value },
    ],
  }));

  const trailStyle = useAnimatedStyle(() => ({
    opacity: trailOpacity.value * ballOpacity.value * 0.35,
    transform: [
      { translateX: ballX.value - BALL_SIZE / 2 },
      { translateY: ballY.value - BALL_SIZE / 2 + 12 },
      { scale: ballScale.value * 1.15 },
    ],
  }));

  // Grounds the resting ball on the table; it shrinks away as the ball flies.
  const shadowStyle = useAnimatedStyle(() => ({
    opacity: ballOpacity.value * (1 - trailOpacity.value) * 0.5,
    transform: [
      { translateX: ballX.value - BALL_SIZE / 2 },
      { translateY: ballY.value + BALL_SIZE * 0.34 },
      { scaleX: ballScale.value },
      { scaleY: ballScale.value * 0.3 },
    ],
  }));

  return (
    <>
      {aimLine && !flying ? (
        <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} pointerEvents="none">
          <Line
            x1={startX}
            y1={startY}
            x2={startX + Math.max(-110, Math.min(110, aimLine.dx))}
            y2={
              startY +
              (direction === 'up'
                ? Math.max(-260, Math.min(20, aimLine.dy))
                : Math.max(-20, Math.min(260, aimLine.dy)))
            }
            stroke={accent}
            strokeWidth={3}
            strokeDasharray="8,8"
            opacity={0.85}
          />
        </Svg>
      ) : null}

      <Animated.View pointerEvents="none" style={[styles.ballShadow, shadowStyle]} />
      <Animated.View pointerEvents="none" style={[styles.ball, trailStyle]}>
        <BallArt accent={accent} />
      </Animated.View>
      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.ball, glow('medium', accent), ballStyle]}>
          <BallArt accent={accent} />
        </Animated.View>
      </GestureDetector>
    </>
  );
}

const styles = StyleSheet.create({
  ball: {
    position: 'absolute',
    width: BALL_SIZE,
    height: BALL_SIZE,
    // Keeps the neon glow round instead of casting a square halo on web.
    borderRadius: BALL_SIZE / 2,
  },
  ballShadow: {
    position: 'absolute',
    width: BALL_SIZE,
    height: BALL_SIZE,
    borderRadius: BALL_SIZE / 2,
    backgroundColor: '#000000',
  },
});
