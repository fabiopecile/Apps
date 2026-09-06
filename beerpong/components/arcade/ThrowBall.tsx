import { useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
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

interface ThrowResult {
  cupIndex: number | null;
  hit: boolean;
  power: number;
}

interface ThrowBallProps {
  startX: number;
  startY: number;
  cups: CupSpec[];
  aliveFlags: boolean[];
  accent: string;
  opponentDifficulty: number;
  onResult: (result: ThrowResult) => void;
  disabled?: boolean;
  /** Fades the ball out while the opponent is throwing. */
  hidden?: boolean;
}

export function ThrowBall({
  startX,
  startY,
  cups,
  aliveFlags,
  accent,
  opponentDifficulty,
  onResult,
  disabled,
  hidden,
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

  const throwBall = (dx: number, dy: number) => {
    const power = Math.max(0, Math.min(1, Math.abs(dy) / DRAG_POWER_DIVISOR));
    const aimRatio = Math.max(-1, Math.min(1, dx / DRAG_AIM_DIVISOR));
    const target = pickTarget(aimRatio);

    if (!target || power < 0.12) {
      onResult({ cupIndex: null, hit: false, power });
      return;
    }

    const hitChance = Math.max(
      0.12,
      Math.min(0.92, 0.55 + power * 0.3 - (opponentDifficulty - 1) * 0.045)
    );
    const roll = Math.random();
    const hit = roll < hitChance;
    const isCritical = Math.abs(hitChance - roll) < 0.08;

    setFlyingState(true);
    trailOpacity.value = withTiming(1, { duration: 60 });

    const targetX = hit ? target.x : target.x + (Math.random() - 0.5) * 70;
    const targetY = hit ? target.y : target.y - 30 - Math.random() * 20;

    const mainDuration = isCritical ? 620 : 460;
    ballScale.value = withTiming(0.55, { duration: mainDuration, easing: Easing.out(Easing.quad) });
    ballX.value = withTiming(targetX, { duration: mainDuration, easing: Easing.out(Easing.quad) });
    ballY.value = withTiming(
      targetY,
      { duration: mainDuration, easing: Easing.out(Easing.quad) },
      (finished) => {
        if (finished) {
          trailOpacity.value = withTiming(0, { duration: 200 });
          runOnJS(finishThrow)(target.index, hit, power);
        }
      }
    );
  };

  const finishThrow = (cupIndex: number, hit: boolean, power: number) => {
    setFlyingState(false);
    setAimLine(null);
    onResult({ cupIndex, hit, power });
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => {
      ballX.value = withTiming(startX, { duration: 260 });
      ballY.value = withTiming(startY, { duration: 260 });
      ballScale.value = withTiming(1, { duration: 260 });
    }, 220);
  };

  const pan = Gesture.Pan()
    .enabled(!disabled && !flying)
    .onChange((e) => {
      runOnJS(setAimLine)({ dx: e.translationX, dy: e.translationY });
    })
    .onEnd((e) => {
      runOnJS(setAimLine)(null);
      if (e.translationY < -20) {
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

  return (
    <>
      {aimLine && !flying ? (
        <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} pointerEvents="none">
          <Line
            x1={startX}
            y1={startY}
            x2={startX + Math.max(-110, Math.min(110, aimLine.dx))}
            y2={startY + Math.max(-260, Math.min(20, aimLine.dy))}
            stroke={accent}
            strokeWidth={3}
            strokeDasharray="8,8"
            opacity={0.85}
          />
        </Svg>
      ) : null}

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
});
