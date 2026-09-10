import { useCallback } from 'react';
import {
  runOnJS,
  useSharedValue,
  withTiming,
  Easing,
  type SharedValue,
} from 'react-native-reanimated';

import { GRAVITY, RESTITUTION, type Flight } from '@/lib/throwPhysics';

/**
 * Ball diameter, in table points.
 *
 * A real ping-pong ball is about 40mm against a 95mm cup, which would be 19
 * here. Drawn a little larger than life on purpose: from this camera a
 * true-to-scale ball is a speck at the far end of the table, and you need to be
 * able to follow it.
 */
export const BALL_SIZE = 25;

export interface BallPoint {
  /** Where the ball is on the table. */
  x: number;
  y: number;
  /** How high above it, in table points. */
  height: number;
  /** 0 while resting in the hand, 1 while a hop is playing. */
  flying: number;
  scale: number;
  opacity: number;
}

/**
 * The state of a ball in flight — position only, no drawing.
 *
 * It stays on Reanimated shared values because the gesture writes to them from
 * the UI thread and has to stay smooth; the 3D scene reads them once per frame
 * in its own render loop. Splitting it this way is what lets the same physics
 * drive your throw and the opponent's: an arc animated one way for you and a
 * flat slide for them reads as two different games.
 */
export function useBallFlight(restX: number, restY: number) {
  // Ground position: where the ball is on the table, ignoring how high it is.
  const groundX = useSharedValue(restX);
  const groundY = useSharedValue(restY);
  /** Seconds into the current hop; the animation plays this forward. */
  const legT = useSharedValue(0);
  const legStartX = useSharedValue(restX);
  const legStartY = useSharedValue(restY);
  const legEndX = useSharedValue(restX);
  const legEndY = useSharedValue(restY);
  const legSeconds = useSharedValue(1);
  const legUp = useSharedValue(0);
  /** 0 while the ball rests at `ground`, 1 while a hop is playing. */
  const airborne = useSharedValue(0);

  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const trail = useSharedValue(0);

  /** One hop: across the ground while gravity takes it up and back down. */
  const playLeg = useCallback(
    (
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
      legSeconds.value = seconds;
      legUp.value = up;
      airborne.value = 1;
      legT.value = 0;
      legT.value = withTiming(
        seconds,
        { duration: seconds * 1000, easing: Easing.linear },
        (finished) => {
          if (finished) runOnJS(onDone)();
        }
      );
    },
    [airborne, legEndX, legEndY, legSeconds, legStartX, legStartY, legT, legUp]
  );

  /** The whole flight, bounce and all, then `onLanded`. */
  const play = useCallback(
    (flight: Flight, onLanded: () => void) => {
      if (flight.bounceAt) {
        // Down onto the table first, then up again with whatever it kept.
        playLeg(flight.start, flight.bounceAt, flight.bounceTime, flight.launchUp, () => {
          playLeg(
            flight.bounceAt!,
            flight.landing,
            flight.hang - flight.bounceTime,
            flight.launchUp * RESTITUTION,
            onLanded
          );
        });
        return;
      }
      playLeg(flight.start, flight.landing, flight.hang, flight.launchUp, onLanded);
    },
    [playLeg]
  );

  /** Puts the ball back down where it started. */
  const settle = useCallback(
    (x: number, y: number) => {
      airborne.value = 0;
      groundX.value = withTiming(x, { duration: 120 });
      groundY.value = withTiming(y, { duration: 120 });
      scale.value = withTiming(1, { duration: 120 });
    },
    [airborne, groundX, groundY, scale]
  );

  /**
   * Where the ball is right now. Called once a frame by the renderer, on the
   * JS side, so it reads plain numbers off the shared values rather than
   * running as a worklet.
   */
  const sample = useCallback((): BallPoint => {
    const active = airborne.value;
    if (active < 0.5) {
      return {
        x: groundX.value,
        y: groundY.value,
        height: 0,
        flying: 0,
        scale: scale.value,
        opacity: opacity.value,
      };
    }
    const seconds = legSeconds.value;
    const t = Math.max(0, Math.min(legT.value, seconds));
    const share = t / Math.max(0.0001, seconds);
    return {
      x: legStartX.value + (legEndX.value - legStartX.value) * share,
      y: legStartY.value + (legEndY.value - legStartY.value) * share,
      height: Math.max(0, legUp.value * t - 0.5 * GRAVITY * t * t),
      flying: 1,
      scale: scale.value,
      opacity: opacity.value,
    };
  }, [airborne, groundX, groundY, legEndX, legEndY, legSeconds, legStartX, legStartY, legT, legUp, opacity, scale]);

  return {
    play,
    playLeg,
    settle,
    sample,
    groundX,
    groundY,
    scale,
    opacity,
    trail,
  } as const;
}

export type BallFlight = ReturnType<typeof useBallFlight>;

/** Re-exported so both ball components share one declaration. */
export type { SharedValue };
