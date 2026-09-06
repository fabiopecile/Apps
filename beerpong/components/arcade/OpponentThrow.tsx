import { useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
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
const AIM_DURATION = 750;
const FLIGHT_DURATION = 560;

interface OpponentResult {
  cupIndex: number;
  hit: boolean;
}

interface OpponentThrowProps {
  startX: number;
  startY: number;
  cups: CupSpec[];
  aliveFlags: boolean[];
  accuracy: number;
  accent: string;
  /** Increment to make the opponent take one throw. */
  turnToken: number;
  onResult: (result: OpponentResult) => void;
}

export function OpponentThrow({
  startX,
  startY,
  cups,
  aliveFlags,
  accuracy,
  accent,
  turnToken,
  onResult,
}: OpponentThrowProps) {
  const ballX = useSharedValue(startX);
  const ballY = useSharedValue(startY);
  const ballOpacity = useSharedValue(0);
  const trailOpacity = useSharedValue(0);
  const [aimTarget, setAimTarget] = useState<{ x: number; y: number } | null>(null);
  const aimTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = () => {
    if (aimTimer.current) clearTimeout(aimTimer.current);
    if (flightTimer.current) clearTimeout(flightTimer.current);
    aimTimer.current = null;
    flightTimer.current = null;
  };

  useEffect(() => clearTimers, []);

  useEffect(() => {
    if (turnToken <= 0) return;

    const alive = cups.filter((c) => aliveFlags[c.index]);
    if (alive.length === 0) return;
    const target = alive[Math.floor(Math.random() * alive.length)];

    clearTimers();
    ballX.value = startX;
    ballY.value = startY;
    ballOpacity.value = withTiming(1, { duration: 150 });
    setAimTarget({ x: target.x, y: target.y });

    const hit = Math.random() < accuracy;
    const landX = hit ? target.x : target.x + (Math.random() - 0.5) * 80;
    const landY = hit ? target.y : target.y + 30 + Math.random() * 24;

    aimTimer.current = setTimeout(() => {
      setAimTarget(null);
      trailOpacity.value = withTiming(1, { duration: 60 });
      ballX.value = withTiming(landX, { duration: FLIGHT_DURATION, easing: Easing.out(Easing.quad) });
      ballY.value = withTiming(landY, { duration: FLIGHT_DURATION, easing: Easing.out(Easing.quad) });

      flightTimer.current = setTimeout(() => {
        trailOpacity.value = withTiming(0, { duration: 200 });
        ballOpacity.value = withTiming(0, { duration: 220 });
        onResult({ cupIndex: target.index, hit });
      }, FLIGHT_DURATION + 30);
    }, AIM_DURATION);

    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnToken]);

  const ballStyle = useAnimatedStyle(() => ({
    opacity: ballOpacity.value,
    transform: [
      { translateX: ballX.value - BALL_SIZE / 2 },
      { translateY: ballY.value - BALL_SIZE / 2 },
    ],
  }));

  const trailStyle = useAnimatedStyle(() => ({
    opacity: trailOpacity.value * 0.35,
    transform: [
      { translateX: ballX.value - BALL_SIZE / 2 },
      { translateY: ballY.value - BALL_SIZE / 2 - 12 },
      { scale: 1.15 },
    ],
  }));

  return (
    <>
      {aimTarget ? (
        <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} pointerEvents="none">
          <Line
            x1={startX}
            y1={startY}
            x2={aimTarget.x}
            y2={aimTarget.y}
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
      <Animated.View pointerEvents="none" style={[styles.ball, glow('medium', accent), ballStyle]}>
        <BallArt accent={accent} />
      </Animated.View>
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
