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
import Svg, { Path } from 'react-native-svg';
import { glow } from '@/theme';
import type { CupSpec } from '@/lib/arcadeLayout';
import {
  APEX,
  GRAVITY,
  RESTITUTION,
  previewFlight,
  resolveThrow,
  sampleFlight,
  type Flight,
} from '@/lib/throwPhysics';
import { BallArt } from './BallArt';

const BALL_SIZE = 30;
/** Radius of the ring that marks where the arc comes down. */
const AIM_MARKER = 26;
/**
 * How much of the ball's real height turns into travel up the screen. The
 * table is drawn from a low angle, so height and distance share an axis; the
 * shadow stays on the ground and tells the two apart.
 */
const HEIGHT_LIFT = 0.55;
/** How much bigger the ball looks at the top of its arc. */
const HEIGHT_ZOOM = 0.42;
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
  // Ground position — where the ball is on the table, ignoring how high it is.
  const groundX = useSharedValue(startX);
  const groundY = useSharedValue(startY);
  /** Height above the table, in points. Lifts and enlarges the ball. */
  const height = useSharedValue(0);
  const ballScale = useSharedValue(1);
  const ballOpacity = useSharedValue(1);
  const trailOpacity = useSharedValue(0);
  /** Seconds into the current flight; the animation plays this forward. */
  const flightT = useSharedValue(0);
  /** The parabola being flown, as plain numbers a worklet can read. */
  const legStartX = useSharedValue(startX);
  const legStartY = useSharedValue(startY);
  const legEndX = useSharedValue(startX);
  const legEndY = useSharedValue(startY);
  const legDuration = useSharedValue(1);
  const legUp = useSharedValue(0);
  const following = useSharedValue(0);

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
    groundX.value = withTiming(startX, { duration: 160 });
    groundY.value = withTiming(startY, { duration: 160 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startX, startY]);

  const finishThrow = (cupIndex: number | null, hit: boolean, power: number, rimOut: boolean) => {
    setFlyingState(false);
    setAim(null);
    onResult({ cupIndex, hit, power, rimOut, bounce });
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => {
      following.value = 0;
      height.value = withTiming(0, { duration: 200 });
      groundX.value = withTiming(startX, { duration: 260 });
      groundY.value = withTiming(startY, { duration: 260 });
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
   * Plays one hop of the flight: the ball crosses the ground from one point to
   * the next while gravity takes it up and back down.
   */
  const flyLeg = (
    from: { x: number; y: number },
    to: { x: number; y: number },
    seconds: number,
    up: number,
    onDone: () => void
  ) => {
    legStartX.value = from.x;
    legStartY.value = from.y;
    legEndX.value = to.x;
    legEndY.value = to.y;
    legDuration.value = seconds;
    legUp.value = up;
    following.value = 1;
    flightT.value = 0;
    flightT.value = withTiming(
      seconds,
      { duration: seconds * 1000, easing: Easing.linear },
      (finished) => {
        if (finished) runOnJS(onDone)();
      }
    );
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

    const { hit, rimOut, cupIndex, power, flight } = outcome;

    setFlyingState(true);
    onLaunch?.();
    trailOpacity.value = withTiming(1, { duration: 60 });
    ballScale.value = withTiming(hit ? 0.62 : 0.8, { duration: flight.hang * 1000 });

    const land = () => {
      trailOpacity.value = withTiming(0, { duration: 200 });
      if (rimOut) {
        kickOut(flight.landing, cupIndex, hit, power);
        return;
      }
      height.value = 0;
      finishThrow(cupIndex, hit, power, false);
    };

    if (flight.bounceAt) {
      // Down onto the table first, then up again with whatever it kept.
      flyLeg(flight.start, flight.bounceAt, flight.bounceTime, flight.launchUp, () => {
        flyLeg(
          flight.bounceAt!,
          flight.landing,
          flight.hang - flight.bounceTime,
          flight.launchUp * RESTITUTION,
          land
        );
      });
      return;
    }
    flyLeg(flight.start, flight.landing, flight.hang, flight.launchUp, land);
  };

  /** Caught the lip: a short, low hop away from the rack. */
  const kickOut = (
    landing: { x: number; y: number },
    cupIndex: number | null,
    hit: boolean,
    power: number
  ) => {
    const away = direction === 'up' ? 1 : -1;
    const kick = {
      x: landing.x + (Math.random() < 0.5 ? -1 : 1) * (30 + Math.random() * 28),
      y: landing.y + away * (26 + Math.random() * 20),
    };
    rimContact();
    flyLeg(landing, kick, 0.34, 190, () => {
      height.value = 0;
    });
    scheduleResult(cupIndex, hit, power, 400);
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
      const vx = (e.absoluteX - lastX.value) / dt;
      const vy = (e.absoluteY - lastY.value) / dt;
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

  /**
   * Ball position, height and all. `height` lifts it up the screen and makes
   * it bigger, as if it were coming towards you off the table.
   */
  const ballStyle = useAnimatedStyle(() => {
    'worklet';
    const point = flightPoint(
      following.value,
      flightT.value,
      legStartX.value,
      legStartY.value,
      legEndX.value,
      legEndY.value,
      legDuration.value,
      legUp.value,
      groundX.value,
      groundY.value
    );
    const lift = point.height * HEIGHT_LIFT;
    const zoom = 1 + (point.height / Math.max(1, APEX)) * HEIGHT_ZOOM;
    return {
      opacity: ballOpacity.value,
      transform: [
        { translateX: point.x - BALL_SIZE / 2 },
        { translateY: point.y - lift - BALL_SIZE / 2 },
        { scale: ballScale.value * zoom },
      ],
    };
  });

  const trailStyle = useAnimatedStyle(() => {
    'worklet';
    const point = flightPoint(
      following.value,
      flightT.value,
      legStartX.value,
      legStartY.value,
      legEndX.value,
      legEndY.value,
      legDuration.value,
      legUp.value,
      groundX.value,
      groundY.value
    );
    const lift = point.height * HEIGHT_LIFT;
    return {
      opacity: trailOpacity.value * ballOpacity.value * 0.35,
      transform: [
        { translateX: point.x - BALL_SIZE / 2 },
        { translateY: point.y - lift - BALL_SIZE / 2 + 12 },
        { scale: ballScale.value * 1.15 },
      ],
    };
  });

  /**
   * The shadow stays flat on the table under the ball. It is what makes the
   * arc readable: the ball rising up the screen and the shadow running along
   * the table are the same throw seen two ways.
   */
  const shadowStyle = useAnimatedStyle(() => {
    'worklet';
    const point = flightPoint(
      following.value,
      flightT.value,
      legStartX.value,
      legStartY.value,
      legEndX.value,
      legEndY.value,
      legDuration.value,
      legUp.value,
      groundX.value,
      groundY.value
    );
    const climb = Math.min(1, point.height / Math.max(1, APEX));
    return {
      opacity: ballOpacity.value * 0.45 * (1 - climb * 0.75),
      transform: [
        { translateX: point.x - BALL_SIZE / 2 },
        { translateY: point.y + BALL_SIZE * 0.34 },
        { scaleX: 1 - climb * 0.4 },
        { scaleY: (1 - climb * 0.4) * 0.3 },
      ],
    };
  });

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

/**
 * One point of the flight, as a worklet. Deliberately takes plain numbers
 * rather than the `Flight` object: shared values cannot hold a nested object
 * that the UI thread reads every frame without copying it each time.
 */
function flightPoint(
  active: number,
  t: number,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  seconds: number,
  up: number,
  restX: number,
  restY: number
) {
  'worklet';
  if (active < 0.5) return { x: restX, y: restY, height: 0 };
  const clamped = Math.max(0, Math.min(t, seconds));
  const share = clamped / Math.max(0.0001, seconds);
  return {
    x: fromX + (toX - fromX) * share,
    y: fromY + (toY - fromY) * share,
    height: Math.max(0, up * clamped - 0.5 * GRAVITY * clamped * clamped),
  };
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
