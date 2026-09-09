import { useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { glow } from '@/theme';
import type { CupSpec } from '@/lib/arcadeLayout';
import { previewFlight, resolveThrow, sampleFlight, type Flight } from '@/lib/throwPhysics';
import { BallArt } from './BallArt';
import { BALL_SIZE, HEIGHT_LIFT, useBallFlight } from './useBallFlight';

/** Radius of the ring that marks where the arc comes down. */
const AIM_MARKER = 26;
/** Let go later than this after the hand stopped and it is not a throw. */
const STALE_HAND_MS = 120;

export interface ThrowResult {
  cupIndex: number | null;
  hit: boolean;
  power: number;
  /** True when the ball caught the rim and kicked out. */
  rimOut: boolean;
  /** True when this was a bounce shot, which is worth two cups. */
  bounce: boolean;
  /** How far short (negative) or long (positive) of the nearest cup it landed. */
  overshoot: number;
  /** How far wide of the nearest cup it landed. */
  sideways: number;
}

interface ThrowBallProps {
  startX: number;
  startY: number;
  cups: CupSpec[];
  aliveFlags: boolean[];
  accent: string;
  /** 0-1: how steady your hand is. Sets how far a throw can stray. */
  skill: number;
  onResult: (result: ThrowResult) => void;
  disabled?: boolean;
  /** Fades the ball out while the other side is throwing. */
  hidden?: boolean;
  /** 'up' throws at a rack above the ball, 'down' at one below it. */
  direction?: 'up' | 'down';
  /** Bounced in off the table: harder to land, but takes two cups. */
  bounce?: boolean;
  /** Fires the instant the ball catches the rim, before it kicks away. */
  onRim?: () => void;
  /** Fires as the ball leaves your hand. */
  onLaunch?: () => void;
  /**
   * How much the table is shrunk on screen. The hand's speed is measured in
   * screen points but the throw is computed in table points, so on a small
   * screen a swipe that looks like it reaches a cup has to be scaled up to
   * actually reach it.
   */
  inputScale?: number;
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
  inputScale = 1,
}: ThrowBallProps) {
  const flight = useBallFlight(startX, startY);

  const [aim, setAim] = useState<Flight | null>(null);
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
    flight.opacity.value = withTiming(hidden ? 0 : 1, { duration: 260 });
  }, [hidden, flight.opacity]);

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
    flight.settle(startX, startY);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startX, startY]);

  const finishThrow = (result: Omit<ThrowResult, 'bounce'>) => {
    setFlyingState(false);
    setAim(null);
    onResult({ ...result, bounce });
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => flight.settle(startX, startY), 220);
  };

  /**
   * A real throw: the speed of your hand becomes the speed of the ball, and
   * where it comes down is wherever the parabola puts it.
   */
  const throwBall = (velocityX: number, velocityY: number) => {
    const outcome = resolveThrow({
      start: { x: startX, y: startY },
      velocityX,
      velocityY,
      direction,
      skill,
      bounce,
      cups,
      aliveFlags,
    });
    // Too slow to leave the hand — not a throw, so not a turn.
    if (!outcome) return;

    const { hit, rimOut, cupIndex, power, landing } = outcome;
    const miss = missDistance(landing, cups, aliveFlags, direction);
    const result = { cupIndex, hit, power, rimOut, ...miss };

    setFlyingState(true);
    onLaunch?.();
    flight.trail.value = withTiming(1, { duration: 60 });
    flight.scale.value = withTiming(hit ? 0.62 : 0.8, {
      duration: outcome.flight.hang * 1000,
    });

    flight.play(outcome.flight, () => {
      flight.trail.value = withTiming(0, { duration: 200 });
      if (rimOut) {
        // Caught the lip: a short, low hop away from the rack.
        const away = direction === 'up' ? 1 : -1;
        rimContact();
        flight.playLeg(
          landing,
          {
            x: landing.x + (Math.random() < 0.5 ? -1 : 1) * (30 + Math.random() * 28),
            y: landing.y + away * (26 + Math.random() * 20),
          },
          0.34,
          190,
          () => {}
        );
        if (resultTimer.current) clearTimeout(resultTimer.current);
        resultTimer.current = setTimeout(() => finishThrow(result), 400);
        return;
      }
      finishThrow(result);
    });
  };

  /**
   * The hand's speed, measured here rather than taken from the gesture: the
   * throw is only as good as this number, and sampling it the same way on
   * every platform is worth the few lines. An exponential average over the
   * last frames, so one jittery sample cannot launch the ball.
   */
  const lastX = useSharedValue(0);
  const lastY = useSharedValue(0);
  const lastAt = useSharedValue(0);
  const velX = useSharedValue(0);
  const velY = useSharedValue(0);
  /** Screen points per table point; see `inputScale`. */
  const scale = useSharedValue(inputScale);
  scale.value = inputScale;

  const pan = Gesture.Pan()
    .enabled(!disabled && !flying)
    .onBegin((e) => {
      lastX.value = e.absoluteX;
      lastY.value = e.absoluteY;
      lastAt.value = Date.now();
      velX.value = 0;
      velY.value = 0;
    })
    .onUpdate((e) => {
      const now = Date.now();
      const dt = (now - lastAt.value) / 1000;
      // Below a couple of milliseconds the division blows up on noise.
      if (dt < 0.004) return;
      const factor = 1 / Math.max(0.05, scale.value);
      const vx = ((e.absoluteX - lastX.value) / dt) * factor;
      const vy = ((e.absoluteY - lastY.value) / dt) * factor;
      lastX.value = e.absoluteX;
      lastY.value = e.absoluteY;
      lastAt.value = now;
      // Weighted towards the newest sample: a throw is the last moment of the
      // swipe, not its average.
      velX.value = velX.value * 0.4 + vx * 0.6;
      velY.value = velY.value * 0.4 + vy * 0.6;
      runOnJS(showAim)(velX.value, velY.value);
    })
    .onEnd(() => {
      runOnJS(setAim)(null);
      // A hand that has stopped is not throwing. Without this, aiming slowly,
      // pausing and letting go would launch the ball with whatever speed the
      // last movement happened to have — no movement means no new samples, so
      // the average never decays on its own.
      if (Date.now() - lastAt.value > STALE_HAND_MS) return;
      runOnJS(throwBall)(velX.value, velY.value);
    })
    .onFinalize(() => {
      runOnJS(setAim)(null);
    });

  /** The arc the current swipe speed would fly, drawn while you swing. */
  function showAim(velocityX: number, velocityY: number) {
    setAim(
      previewFlight({
        start: { x: startX, y: startY },
        velocityX,
        velocityY,
        direction,
        bounce,
      })
    );
  }

  const arc = aim && !flying ? arcPath(aim) : null;

  return (
    <>
      {arc ? (
        <>
          <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} pointerEvents="none">
            <Path
              d={arc}
              stroke={accent}
              strokeWidth={2.5}
              strokeDasharray="7,7"
              fill="none"
              opacity={0.8}
            />
          </Svg>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.aimMarker,
              {
                left: aim!.landing.x - AIM_MARKER / 2,
                top: aim!.landing.y - (AIM_MARKER * 0.42) / 2,
                borderColor: accent,
              },
            ]}
          />
        </>
      ) : null}

      <Animated.View pointerEvents="none" style={[styles.ballShadow, flight.shadowStyle]} />
      <Animated.View pointerEvents="none" style={[styles.ball, flight.trailStyle]}>
        <BallArt accent={accent} />
      </Animated.View>
      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.ball, glow('medium', accent), flight.ballStyle]}>
          <BallArt accent={accent} />
        </Animated.View>
      </GestureDetector>
    </>
  );
}

/**
 * How badly a throw missed, relative to the nearest cup still standing.
 *
 * With the swipe deciding everything, "you missed" is not useful on its own —
 * the two ways to miss have opposite fixes. This is what lets the game say
 * whether the ball was short or long.
 */
function missDistance(
  landing: { x: number; y: number },
  cups: CupSpec[],
  aliveFlags: boolean[],
  direction: 'up' | 'down'
): { overshoot: number; sideways: number } {
  let best: CupSpec | null = null;
  let bestDistance = Infinity;
  for (const cup of cups) {
    if (!aliveFlags[cup.index]) continue;
    const distance = Math.hypot(landing.x - cup.x, landing.y - cup.y);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = cup;
    }
  }
  if (!best) return { overshoot: 0, sideways: 0 };
  // Positive means past the cup, whichever way down the table that is.
  const along = direction === 'up' ? best.y - landing.y : landing.y - best.y;
  return { overshoot: along, sideways: landing.x - best.x };
}

/** The aiming arc, drawn the way the ball will actually fly it. */
function arcPath(flight: Flight): string {
  const steps = 22;
  const points: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * flight.hang;
    const point = sampleFlight(flight, t);
    const x = point.x.toFixed(1);
    const y = (point.y - point.height * HEIGHT_LIFT).toFixed(1);
    points.push(`${i === 0 ? 'M' : 'L'}${x},${y}`);
  }
  return points.join(' ');
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
