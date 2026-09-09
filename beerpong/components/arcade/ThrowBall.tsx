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
import { aimPoint, resolveThrow, throwPower } from '@/lib/throwPhysics';
import { BallArt } from './BallArt';

const BALL_SIZE = 30;
/** Radius of the ring that shows where you are pointing. */
const AIM_MARKER = 26;

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
  /** Fires the instant the ball catches the rim, before it kicks away. */
  onRim?: () => void;
  /** Fires as the ball leaves your hand. */
  onLaunch?: () => void;
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
  onRim,
  onLaunch,
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

  // Stable JS target for runOnJS — the prop itself may be undefined.
  const rimContact = () => onRim?.();

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

  const finishThrow = (cupIndex: number | null, hit: boolean, power: number, rimOut: boolean) => {
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

  const scheduleResult = (
    cupIndex: number | null,
    hit: boolean,
    power: number,
    delay: number
  ) => {
    if (resultTimer.current) clearTimeout(resultTimer.current);
    resultTimer.current = setTimeout(() => finishThrow(cupIndex, hit, power, true), delay);
  };

  /**
   * The throw is decided by where you pointed, not by a hidden die. The ball
   * flies to the point it actually landed on, so a miss you can see is a miss
   * you can correct next time.
   */
  const throwBall = (dx: number, dy: number) => {
    const power = throwPower(dy);
    if (power < 0.05) {
      onResult({ cupIndex: null, hit: false, power, rimOut: false, bounce });
      return;
    }

    const outcome = resolveThrow({
      start: { x: startX, y: startY },
      dragX: dx,
      dragY: dy,
      direction,
      skill,
      bounce,
      cups,
      aliveFlags,
    });
    const { hit, rimOut, cupIndex, landing } = outcome;

    setFlyingState(true);
    onLaunch?.();
    trailOpacity.value = withTiming(1, { duration: 60 });

    const easing = Easing.out(Easing.quad);
    // A throw across the table takes longer than a dab at the nearest cup.
    const travel = Math.hypot(landing.x - startX, landing.y - startY);
    const mainDuration = Math.round(320 + travel * 0.62);
    const shortOf = direction === 'up' ? -1 : 1;

    ballScale.value = withTiming(hit ? 0.5 : 0.62, { duration: mainDuration, easing });
    ballX.value = withTiming(landing.x, { duration: mainDuration, easing });
    ballY.value = withTiming(landing.y, { duration: mainDuration, easing }, (finished) => {
      if (!finished) return;
      if (rimOut) {
        // Catch the lip, kick sideways, then drop away past the rack.
        const kickX = landing.x + (Math.random() < 0.5 ? -1 : 1) * (34 + Math.random() * 30);
        const kickY = landing.y + shortOf * 24;
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
        runOnJS(rimContact)();
        runOnJS(scheduleResult)(cupIndex, hit, power, 420);
        return;
      }
      trailOpacity.value = withTiming(0, { duration: 200 });
      runOnJS(finishThrow)(cupIndex, hit, power, false);
    });
  };

  /**
   * Where the finger first went down. A pan reports its translation from the
   * point where it *activated*, which is 30-60pt into the drag — enough that
   * the aim ring visibly trailed the finger and every throw fell short of
   * where it was pointed. Measured from `onBegin` instead, which fires on
   * touch down, the ring sits under the finger.
   */
  const origin = useSharedValue<{ x: number; y: number } | null>(null);

  const pan = Gesture.Pan()
    .enabled(!disabled && !flying)
    .onBegin((e) => {
      origin.value = { x: e.absoluteX, y: e.absoluteY };
    })
    .onChange((e) => {
      const from = origin.value;
      if (!from) return;
      runOnJS(setAimLine)({ dx: e.absoluteX - from.x, dy: e.absoluteY - from.y });
    })
    .onEnd((e) => {
      runOnJS(setAimLine)(null);
      const from = origin.value;
      origin.value = null;
      if (!from) return;
      const dx = e.absoluteX - from.x;
      const dy = e.absoluteY - from.y;
      const flicked = direction === 'up' ? dy < -20 : dy > 20;
      if (flicked) {
        runOnJS(throwBall)(dx, dy);
      }
    })
    .onFinalize(() => {
      origin.value = null;
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

  // Where this drag is pointing right now. Shown as a ring on the table so the
  // player can see that a longer flick reaches further — without it the throw
  // would be skill-based but unlearnable.
  const preview =
    aimLine && !flying ? aimPoint({ x: startX, y: startY }, aimLine.dx, aimLine.dy, direction) : null;
  const previewLive = preview != null && throwPower(aimLine?.dy ?? 0) >= 0.05;

  return (
    <>
      {preview ? (
        <>
          <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} pointerEvents="none">
            <Line
              x1={startX}
              y1={startY}
              x2={preview.x}
              y2={preview.y}
              stroke={accent}
              strokeWidth={3}
              strokeDasharray="8,8"
              opacity={previewLive ? 0.8 : 0.3}
            />
          </Svg>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.aimMarker,
              {
                left: preview.x - AIM_MARKER / 2,
                top: preview.y - (AIM_MARKER * 0.42) / 2,
                borderColor: accent,
                opacity: previewLive ? 0.95 : 0.35,
              },
            ]}
          />
        </>
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
  /**
   * Flattened, because it lies on the table rather than facing the camera —
   * the same squash the cup mouths have.
   */
  aimMarker: {
    position: 'absolute',
    width: AIM_MARKER,
    height: AIM_MARKER * 0.42,
    borderRadius: AIM_MARKER / 2,
    borderWidth: 2,
  },
});
