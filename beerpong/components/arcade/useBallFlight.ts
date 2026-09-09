import { useCallback } from 'react';
import {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
  type SharedValue,
} from 'react-native-reanimated';

import { APEX, GRAVITY, RESTITUTION, type Flight } from '@/lib/throwPhysics';

export const BALL_SIZE = 30;
/**
 * How much of the ball's real height turns into travel up the screen. The
 * table is drawn from a low angle, so height and distance share an axis; the
 * shadow stays on the ground and tells the two apart.
 */
export const HEIGHT_LIFT = 0.55;
/** How much bigger the ball looks at the top of its arc. */
const HEIGHT_ZOOM = 0.42;

/**
 * Plays a `Flight` — the shared animation behind both balls on the table.
 *
 * Your throw and the opponent's are the same physics, so they have to be the
 * same animation too: an arc drawn one way for you and a flat slide for them
 * reads as two different games. Only the input differs — your swipe against
 * their aim.
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

  const ballStyle = useAnimatedStyle(() => {
    const point = flightPoint(
      airborne.value, legT.value,
      legStartX.value, legStartY.value, legEndX.value, legEndY.value,
      legSeconds.value, legUp.value, groundX.value, groundY.value
    );
    const zoom = 1 + (point.height / APEX) * HEIGHT_ZOOM;
    return {
      opacity: opacity.value,
      transform: [
        { translateX: point.x - BALL_SIZE / 2 },
        { translateY: point.y - point.height * HEIGHT_LIFT - BALL_SIZE / 2 },
        { scale: scale.value * zoom },
      ],
    };
  });

  const trailStyle = useAnimatedStyle(() => {
    const point = flightPoint(
      airborne.value, legT.value,
      legStartX.value, legStartY.value, legEndX.value, legEndY.value,
      legSeconds.value, legUp.value, groundX.value, groundY.value
    );
    return {
      opacity: trail.value * opacity.value * 0.35,
      transform: [
        { translateX: point.x - BALL_SIZE / 2 },
        { translateY: point.y - point.height * HEIGHT_LIFT - BALL_SIZE / 2 + 12 },
        { scale: scale.value * 1.15 },
      ],
    };
  });

  /**
   * The shadow stays flat on the table under the ball. It is what makes the
   * arc readable: the ball rising up the screen and the shadow running along
   * the table are the same throw seen two ways.
   */
  const shadowStyle = useAnimatedStyle(() => {
    const point = flightPoint(
      airborne.value, legT.value,
      legStartX.value, legStartY.value, legEndX.value, legEndY.value,
      legSeconds.value, legUp.value, groundX.value, groundY.value
    );
    const climb = Math.min(1, point.height / APEX);
    return {
      opacity: opacity.value * 0.45 * (1 - climb * 0.75),
      transform: [
        { translateX: point.x - BALL_SIZE / 2 },
        { translateY: point.y + BALL_SIZE * 0.34 },
        { scaleX: 1 - climb * 0.4 },
        { scaleY: (1 - climb * 0.4) * 0.3 },
      ],
    };
  });

  return {
    play,
    playLeg,
    settle,
    groundX,
    groundY,
    scale,
    opacity,
    trail,
    ballStyle,
    trailStyle,
    shadowStyle,
  } as const;
}

export type BallFlight = ReturnType<typeof useBallFlight>;

/**
 * One point of the flight, as a worklet. Deliberately takes plain numbers
 * rather than the `Flight` object: a shared value holding a nested object
 * would have to be copied across to the UI thread on every frame.
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

/** Re-exported so both ball components share one declaration. */
export type { SharedValue };
