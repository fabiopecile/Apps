import { useEffect, useRef } from 'react';
import { withTiming } from 'react-native-reanimated';

import type { CupSpec } from '@/lib/arcadeLayout';
import { buildFlight, cupMouth } from '@/lib/throwPhysics';
import type { BallFlight } from './useBallFlight';

/** The pause before they let go, so the ball does not appear mid-air. */
const AIM_DURATION = 220;

interface RemoteThrowProps {
  /** Their ball. Owned by the match screen, drawn by the scene. */
  flight: BallFlight;
  startX: number;
  startY: number;
  /** The rack being thrown at — yours. */
  cups: CupSpec[];
  accent: string;
  /** Where their ball came down, from the room. */
  landing: { x: number; y: number } | null;
  /** Which cups it took, so the ball can drop into one of them. */
  cupIndex: number | null;
  /** Counts up per throw. A redraw of the same id must not throw again. */
  shotId: number;
  /** Called once the ball has finished, so the screen can react to the result. */
  onDone: () => void;
}

/**
 * The other player's throw, replayed.
 *
 * The swipe happened on their phone; what crosses the network is the point
 * where the ball came down. Both ends build the flight from the same function,
 * so this is not an approximation of their throw — it is the same parabola,
 * drawn twice. Nothing is simulated here that could drift from what they saw.
 *
 * Deliberately separate from `OpponentThrow`: that one decides where to aim,
 * which is the one thing this must never do.
 */
export function RemoteThrow({
  flight,
  startX,
  startY,
  cups,
  landing,
  cupIndex,
  shotId,
  onDone,
}: RemoteThrowProps) {
  const aimTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** What the callback should be when the ball lands, without re-running the effect. */
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    flight.opacity.value = 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(
    () => () => {
      if (aimTimer.current) clearTimeout(aimTimer.current);
    },
    []
  );

  useEffect(() => {
    if (shotId <= 0 || !landing) return;

    const thrown = buildFlight({ x: startX, y: startY }, landing, false);
    const sunk = cupIndex == null ? undefined : cups.find((cup) => cup.index === cupIndex);

    if (aimTimer.current) clearTimeout(aimTimer.current);
    flight.settle(startX, startY);
    flight.scale.value = 1;
    flight.opacity.value = withTiming(1, { duration: 150 });

    aimTimer.current = setTimeout(() => {
      flight.trail.value = withTiming(1, { duration: 60 });
      flight.play(thrown, () => {
        flight.trail.value = withTiming(0, { duration: 130 });
        if (sunk) {
          const at = cupMouth(sunk);
          // Shrunk away inside the cup rather than sliding out of the front of
          // it — the same ending as both of the other throws.
          flight.scale.value = withTiming(0.12, { duration: 150 });
          flight.playLeg(at, at, 0.15, 0, () => {});
        }
        flight.opacity.value = withTiming(0, { duration: 180 });
        doneRef.current();
      });
    }, AIM_DURATION);

    return () => {
      if (aimTimer.current) clearTimeout(aimTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shotId]);

  return null;
}
