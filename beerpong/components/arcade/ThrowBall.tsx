import { useState } from 'react';
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
import { colors, glow } from '@/theme';
import type { CupSpec } from '@/lib/arcadeLayout';

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
}: ThrowBallProps) {
  const ballX = useSharedValue(startX);
  const ballY = useSharedValue(startY);
  const ballScale = useSharedValue(1);
  const trailOpacity = useSharedValue(0);
  const [aimLine, setAimLine] = useState<{ dx: number; dy: number } | null>(null);
  const [flying, setFlying] = useState(false);

  const pickTarget = (aimRatio: number): CupSpec | null => {
    const alive = cups.filter((c) => aliveFlags[c.index]);
    if (alive.length === 0) return null;
    const sorted = [...alive].sort((a, b) => a.x - b.x);
    const t = (aimRatio + 1) / 2; // 0..1
    const idx = Math.round(t * (sorted.length - 1));
    return sorted[Math.max(0, Math.min(sorted.length - 1, idx))];
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

    setFlying(true);
    trailOpacity.value = withTiming(1, { duration: 60 });

    const targetX = hit ? target.x : target.x + (Math.random() - 0.5) * 70;
    const targetY = hit ? target.y : target.y - 30 - Math.random() * 20;

    const mainDuration = isCritical ? 620 : 420;
    ballScale.value = withTiming(0.7, { duration: mainDuration, easing: Easing.out(Easing.quad) });
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
    setFlying(false);
    setAimLine(null);
    onResult({ cupIndex, hit, power });
    resetBallAfterDelay();
  };

  const resetBallAfterDelay = () => {
    setTimeout(() => {
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
    transform: [
      { translateX: ballX.value - BALL_SIZE / 2 },
      { translateY: ballY.value - BALL_SIZE / 2 },
      { scale: ballScale.value },
    ],
  }));

  const trailStyle = useAnimatedStyle(() => ({
    opacity: trailOpacity.value * 0.35,
    transform: [
      { translateX: ballX.value - BALL_SIZE / 2 },
      { translateY: ballY.value - BALL_SIZE / 2 - 10 },
      { scale: ballScale.value * 1.15 },
    ],
  }));

  return (
    <>
      {aimLine && !flying ? (
        <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
          <Line
            x1={startX}
            y1={startY}
            x2={startX + Math.max(-90, Math.min(90, aimLine.dx))}
            y2={startY + Math.max(-160, Math.min(20, aimLine.dy))}
            stroke={accent}
            strokeWidth={3}
            strokeDasharray="8,8"
            opacity={0.85}
          />
        </Svg>
      ) : null}

      <Animated.View
        pointerEvents="none"
        style={[styles.ball, { width: BALL_SIZE, height: BALL_SIZE, backgroundColor: accent }, trailStyle]}
      />
      <GestureDetector gesture={pan}>
        <Animated.View
          style={[
            styles.ball,
            { width: BALL_SIZE, height: BALL_SIZE, backgroundColor: accent },
            glow('medium', accent),
            ballStyle,
          ]}
        />
      </GestureDetector>
    </>
  );
}

const styles = StyleSheet.create({
  ball: {
    position: 'absolute',
    borderRadius: BALL_SIZE,
    borderWidth: 2,
    borderColor: colors.background,
  },
});
