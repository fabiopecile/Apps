import { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { withTiming } from 'react-native-reanimated';
import { glow } from '@/theme';
import type { CupSpec } from '@/lib/arcadeLayout';
import {
  buildFlight,
  cupMouth,
  resolveLanding,
  spreadForAccuracy,
  wobble,
} from '@/lib/throwPhysics';
import { BallArt } from './BallArt';
import { BALL_SIZE, useBallFlight } from './useBallFlight';

/** How long they pause before letting go. */
const AIM_DURATION = 220;

interface OpponentResult {
  cupIndex: number;
  hit: boolean;
}

interface OpponentThrowProps {
  startX: number;
  startY: number;
  cups: CupSpec[];
  aliveFlags: boolean[];
  /** 0-1, roughly the share of throws they land. */
  accuracy: number;
  accent: string;
  /** Increment to make the opponent take one throw. */
  turnToken: number;
  onResult: (result: OpponentResult) => void;
}

/**
 * The opponent's throw — the same physics as yours.
 *
 * It used to settle the outcome with `Math.random() < accuracy` and then slide
 * the ball flat to whatever that decided. Beside a ball that arcs, drops and
 * casts a shadow, that read as two different games. Now they throw the same
 * parabola and their skill is a spread around the cup they picked, so a near
 * miss looks like a near miss and their rim-outs are real rim-outs.
 */
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
  const flight = useBallFlight(startX, startY);
  const aimTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    if (turnToken <= 0) return;

    const alive = cups.filter((c) => aliveFlags[c.index]);
    if (alive.length === 0) return;
    const target = alive[Math.floor(Math.random() * alive.length)];

    // Where they meant it to go, and where their hand actually put it.
    //
    // Aimed at the mouth, not at the cup's stored centre. Aiming at the centre
    // threw every ball a cup-mouth's height low and left the spread to rescue
    // it: measured, a dead-steady opponent with a 15pt spread landed 2.7% of
    // its throws. The same mistake the player's throw had.
    const mouth = cupMouth(target);
    const offset = wobble(spreadForAccuracy(accuracy));
    const landing = { x: mouth.x + offset.x, y: mouth.y + offset.y };
    const outcome = resolveLanding(landing, cups, aliveFlags);
    const thrown = buildFlight({ x: startX, y: startY }, landing, false);

    if (aimTimer.current) clearTimeout(aimTimer.current);
    flight.settle(startX, startY);
    flight.scale.value = 1;
    flight.opacity.value = withTiming(1, { duration: 150 });

    aimTimer.current = setTimeout(() => {
      flight.trail.value = withTiming(1, { duration: 60 });
      flight.play(thrown, () => {
        flight.trail.value = withTiming(0, { duration: 130 });
        // Their ball drops into the cup the same way yours does.
        if (outcome.hit) {
          const sunk = cups.find((c) => c.index === outcome.cupIndex);
          const at = sunk ? cupMouth(sunk) : landing;
          flight.scale.value = withTiming(0.1, { duration: 120 });
          flight.playLeg(at, { x: at.x, y: at.y + 16 }, 0.12, 0, () => {});
        }
        flight.opacity.value = withTiming(0, { duration: 180 });
        // A cup they landed in is the cup that goes; anything else is a miss,
        // and the score only ever needs the cup they were aiming at.
        onResult({ cupIndex: outcome.cupIndex ?? target.index, hit: outcome.hit });
      });
    }, AIM_DURATION);

    return () => {
      if (aimTimer.current) clearTimeout(aimTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnToken]);

  return (
    <>
      <Animated.View pointerEvents="none" style={[styles.ballShadow, flight.shadowStyle]} />
      <Animated.View pointerEvents="none" style={[styles.ball, flight.trailStyle]}>
        <BallArt accent={accent} />
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[styles.ball, glow('medium', accent), flight.ballStyle]}
      >
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
  ballShadow: {
    position: 'absolute',
    width: BALL_SIZE,
    height: BALL_SIZE,
    borderRadius: BALL_SIZE / 2,
    backgroundColor: '#000000',
  },
});
