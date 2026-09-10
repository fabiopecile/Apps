import { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Easing, runOnJS, useSharedValue, withTiming } from 'react-native-reanimated';
import type { CupSpec } from '@/lib/arcadeLayout';
import { RESTITUTION, cupMouth, resolveThrow, type Point } from '@/lib/throwPhysics';
import type { BallFlight } from './useBallFlight';

/**
 * How much of a swinging hand's travel the ball still comes along for, and the
 * hand speeds between which its grip fades from full to that.
 *
 * Below `AIM_SPEED` the ball is pinned to the finger — that is the gesture the
 * game is built on, and it has to be exact. Above `SWING_SPEED` it slips, so
 * the swing does not eat the throw: a hard flick runs most of the way up the
 * table, and a ball glued to it would arrive at the cup already, with nothing
 * left to fly. Measured before this: a 160pt flick carried 179 of a 187pt
 * throw and left an 8pt hop. A hard switch between the two was tried first and
 * showed up as the ball snagging mid-drag; fading it over a range does not.
 */
const SWING_GRIP = 0.32;
const AIM_SPEED = 300;
const SWING_SPEED = 900;

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
  /** The ball this controls. Owned by the match screen, drawn by the scene. */
  flight: BallFlight;
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
  flight,
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
  const flyingRef = useRef(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resultTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stable JS target for runOnJS — the prop itself may be undefined.
  const rimContact = () => onRim?.();

  /**
   * Whether a throw is in the air, kept as a shared value rather than React
   * state.
   *
   * It only ever gated the gesture, and doing that through `.enabled()` meant
   * a re-render and a rebuilt `Pan` the instant the ball left the hand —
   * a stall exactly where the throw is being watched. The handlers below check
   * this instead, and nothing re-renders.
   */
  const busy = useSharedValue(0);

  const setFlyingState = (value: boolean) => {
    flyingRef.current = value;
    busy.value = value ? 1 : 0;
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
    onResult({ ...result, bounce });
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => flight.settle(startX, startY), 60);
  };

  /**
   * A real throw: the ball leaves from wherever your finger let go of it, at
   * the speed your hand was moving.
   */
  const throwBall = (dragX: number, dragY: number, fromX: number, fromY: number) => {
    const outcome = resolveThrow({
      start: { x: fromX, y: fromY },
      dragX,
      dragY,
      direction,
      skill,
      bounce,
      cups,
      aliveFlags,
      carry: carriedFrom(fromY),
    });
    // Too short to be a throw, so not a turn either. The ball rolls back to
    // its mark instead of staying wherever it was dropped.
    if (!outcome) {
      flight.settle(startX, startY);
      return;
    }

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
      flight.trail.value = withTiming(0, { duration: 130 });
      if (rimOut) {
        bounceOffRim(landing, result);
        return;
      }
      if (hit) {
        // Into the hole, not wherever the parabola happened to end: the ball
        // slides the last few points to the rim it caught and drops there.
        const cup = cupIndex != null ? cups.find((c) => c.index === cupIndex) : null;
        dropIntoCup(cup ? cupMouth(cup) : landing, result);
        return;
      }
      finishThrow(result);
    });
  };

  /**
   * Into the cup. The arc already ends on the table at the cup's own position,
   * which puts the ball inside it and behind its near wall — so all that is
   * left is to shrink it away out of sight.
   *
   * It used to slide `y + 16` first, which in the old flat drawing meant
   * "sixteen points further down the screen" and read as dropping. In ground
   * coordinates y runs *along the table*, so the same line slid the ball
   * sixteen points towards the viewer and straight back out of the front of
   * the cup. From the player's side of it: the ball stopped going in.
   */
  const dropIntoCup = (at: Point, result: Omit<ThrowResult, 'bounce'>) => {
    flight.scale.value = withTiming(0.12, { duration: 150, easing: Easing.in(Easing.quad) });
    flight.playLeg(at, at, 0.15, 0, () => {});
    if (resultTimer.current) clearTimeout(resultTimer.current);
    resultTimer.current = setTimeout(() => finishThrow(result), 160);
  };

  /**
   * Off the rim. Two hops, the second keeping `RESTITUTION` of the first's
   * bounce — the same number the bounce shot uses, so a ball coming off a cup
   * behaves like a ball coming off the table.
   */
  const bounceOffRim = (at: Point, result: Omit<ThrowResult, 'bounce'>) => {
    const away = direction === 'up' ? 1 : -1;
    const side = Math.random() < 0.5 ? -1 : 1;
    rimContact();
    const first = {
      x: at.x + side * (20 + Math.random() * 14),
      y: at.y + away * (16 + Math.random() * 12),
    };
    const second = {
      x: first.x + side * (12 + Math.random() * 10),
      y: first.y + away * (10 + Math.random() * 8),
    };
    flight.playLeg(at, first, 0.15, 360, () => {
      flight.playLeg(first, second, 0.1, 360 * RESTITUTION, () => {});
    });
    if (resultTimer.current) clearTimeout(resultTimer.current);
    resultTimer.current = setTimeout(() => finishThrow(result), 260);
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
  /** The last finger position the ball was moved to follow. */
  const grabX = useSharedValue(0);
  const grabY = useSharedValue(0);
  /**
   * Where the finger first went down, kept for the whole gesture.
   *
   * The distance from here to where you let go *is* the throw's strength, so
   * unlike `grab` above it never moves. Strength used to come from how fast the
   * hand was going, which cannot be seen and cannot be corrected part-way; this
   * is under your thumb the whole time.
   */
  const originX = useSharedValue(0);
  const originY = useSharedValue(0);
  /** Screen points per table point; see `inputScale`. */
  const scale = useSharedValue(inputScale);
  scale.value = inputScale;

  const pan = Gesture.Pan()
    .enabled(!disabled)
    // The ball has to move the instant the finger does. A pan normally waits
    // for a few points of travel before it activates, and that showed up as
    // the ball staying put for the first 40pt of the drag.
    .minDistance(0)
    .onBegin((e) => {
      if (busy.value) return;
      lastX.value = e.absoluteX;
      lastY.value = e.absoluteY;
      grabX.value = e.absoluteX;
      grabY.value = e.absoluteY;
      originX.value = e.absoluteX;
      originY.value = e.absoluteY;
      lastAt.value = Date.now();
      velX.value = 0;
      velY.value = 0;
      // Cancel any settling animation and take the ball at its mark.
      flight.groundX.value = startX;
      flight.groundY.value = startY;
    })
    .onUpdate((e) => {
      if (busy.value) return;
      const factor = 1 / Math.max(0.05, scale.value);

      const now = Date.now();
      const dt = (now - lastAt.value) / 1000;
      // Below a couple of milliseconds the division blows up on noise.
      if (dt >= 0.004) {
        const vx = ((e.absoluteX - lastX.value) / dt) * factor;
        const vy = ((e.absoluteY - lastY.value) / dt) * factor;
        lastX.value = e.absoluteX;
        lastY.value = e.absoluteY;
        lastAt.value = now;
        // Weighted towards the newest sample: a throw is the last moment of
        // the swipe, not its average.
        velX.value = velX.value * 0.4 + vx * 0.6;
        velY.value = velY.value * 0.4 + vy * 0.6;
      }

      const swing = Math.min(
        1,
        Math.max(0, (Math.hypot(velX.value, velY.value) - AIM_SPEED) / (SWING_SPEED - AIM_SPEED))
      );
      const grip = 1 - swing * (1 - SWING_GRIP);
      flight.groundX.value += (e.absoluteX - grabX.value) * factor * grip;
      flight.groundY.value += (e.absoluteY - grabY.value) * factor * grip;
      grabX.value = e.absoluteX;
      grabY.value = e.absoluteY;

    })
    .onEnd((e) => {
      if (busy.value) return;
      // Pausing before you let go is allowed now, and that matters: with the
      // strength coming from how far you dragged rather than how fast, there is
      // nothing stale about a hand that has stopped. You can line the shot up,
      // think, and release.
      const factor = 1 / Math.max(0.05, scale.value);
      runOnJS(throwBall)(
        (e.absoluteX - originX.value) * factor,
        (e.absoluteY - originY.value) * factor,
        flight.groundX.value,
        flight.groundY.value
      );
    })
    .onFinalize((_e, success) => {
      if (busy.value) return;
      // Cancelled part-way through: put the ball back rather than leaving it
      // stranded under where the finger was.
      if (!success) runOnJS(settleBack)();
    });

  function settleBack() {
    if (flyingRef.current) return;
    flight.settle(startX, startY);
  }

  /** How far the ball has already travelled towards the rack in your hand. */
  function carriedFrom(fromY: number) {
    return direction === 'up' ? startY - fromY : fromY - startY;
  }

  return (
    <GestureDetector gesture={pan}>
      {/* The whole table is the grab area. There is nothing else to touch in
          here, and hunting for a 18pt ball with a thumb is its own difficulty
          nobody asked for. */}
      <Animated.View style={StyleSheet.absoluteFill} />
    </GestureDetector>
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

const styles = StyleSheet.create({});
