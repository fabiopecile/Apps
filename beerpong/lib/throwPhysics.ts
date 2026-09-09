/**
 * A thrown ball: a real projectile, launched by the speed of your swipe.
 *
 * The ball leaves your hand with a velocity, gravity pulls it back down, and
 * it lands where the parabola says it lands. Nothing here decides in advance
 * whether a throw goes in — the flight decides, and the cup it comes down in
 * is the cup that goes.
 *
 * What is a modelling choice rather than raw physics: the throw is a *lob*,
 * thrown up at a fixed vertical speed, with the swipe setting only how hard it
 * is pushed down the table. That is how a person tosses a ping-pong ball into
 * a cup — you do not vary the arc much, you vary the push. Modelling the angle
 * as free instead makes range grow with the square of the speed, which put the
 * whole table inside a 35% band of swipe speeds: unthrowable on a phone.
 *
 * Nothing here touches React, animation or the DOM, so the whole flight can be
 * simulated a hundred thousand times in a test.
 */

import type { CupSpec } from './arcadeLayout';

export interface Point {
  x: number;
  y: number;
}

/** Points per second squared, at the scale this table is drawn. */
export const GRAVITY = 2000;
/** How long a lobbed throw stays in the air. */
export const HANG_TIME = 0.75;
/** Upward launch speed, the one that gives that hang time. */
export const LAUNCH_UP = (GRAVITY * HANG_TIME) / 2;
/** Highest the ball gets, in points: about a third of the table's length. */
export const APEX = (LAUNCH_UP * LAUNCH_UP) / (2 * GRAVITY);

/**
 * Swipe speed (points per second) to launch speed down the table. Tuned so a
 * gentle flick reaches the near cup and a firm one reaches the back row, with
 * the whole rack inside a comfortable range of swipe speeds.
 */
const FLICK_TO_LAUNCH = 0.276;
/** Slower than this is a nudge, not a throw. */
export const MIN_FLICK_SPEED = 260;
/** Past this the ball has left the table anyway. */
export const MAX_RANGE = 520;

/**
 * Wobble at zero steadiness, in points. Scaled down by steadiness and up by
 * how hard the ball was thrown. Tuned by simulation rather than by feel.
 */
const SPREAD_AT_ZERO_SKILL = 88;
/** A bounce shot is thrown flatter and lands wilder. */
const BOUNCE_SPREAD_FACTOR = 1.6;
/** How much speed the ball keeps when it bounces off the table. */
export const RESTITUTION = 0.6;

/**
 * A cup's mouth as an ellipse. The table is drawn from a low angle, so the
 * opening is much shallower than it is wide; a ball landing a few points long
 * still drops in, one landing a few points wide does not.
 */
const MOUTH_HEIGHT_RATIO = 0.34;
/** Inside this the ball drops in; out to the second it catches the rim. */
const IN_THRESHOLD = 0.85;
const RIM_THRESHOLD = 1.25;

/** How fast the hand was moving, in points per second. */
export function flickSpeed(velocityX: number, velocityY: number): number {
  return Math.hypot(velocityX, velocityY);
}

/**
 * How far a swipe of this speed carries. Horizontal speed times hang time —
 * the plain range of a projectile that goes up and comes back down.
 */
export function rangeFor(speed: number): number {
  return Math.min(MAX_RANGE, speed * FLICK_TO_LAUNCH * HANG_TIME);
}

/** The swipe speed that would land the ball a given distance away. */
export function speedForRange(range: number): number {
  return range / (FLICK_TO_LAUNCH * HANG_TIME);
}

/** Height above the table at time t, for a lob launched at `up` points/second. */
export function heightAt(t: number, up: number = LAUNCH_UP): number {
  return Math.max(0, up * t - 0.5 * GRAVITY * t * t);
}

/** 0-1: how hard this throw was, as a share of the longest one possible. */
export function powerOfRange(range: number): number {
  return clamp(range / MAX_RANGE, 0, 1);
}

/**
 * How far off a throw can land. Steadiness sets the size of the miss rather
 * than the odds of one, and throwing hard costs accuracy — which is what makes
 * the back row genuinely harder than the cup in front of you.
 */
export function spreadFor(skill: number, power: number, bounce: boolean): number {
  const base = SPREAD_AT_ZERO_SKILL * (1 - clamp(skill, 0, 1));
  return base * (0.8 + power * 0.35) * (bounce ? BOUNCE_SPREAD_FACTOR : 1);
}

/**
 * How wide the opponent throws, for a given nominal accuracy.
 *
 * The opponent used to settle its throws with `Math.random() < accuracy` and
 * then slide the ball to the answer. Now it throws the same parabola you do,
 * so its skill has to be a spread as well — and the two are not related by any
 * formula worth deriving, because a badly missed ball still drops into a
 * neighbouring cup on a full rack.
 *
 * So this is measured rather than derived: each pair is a spread in points and
 * the share of throws that landed in *some* cup over 40,000 simulated throws at
 * a random cup of a full rack (`tools/test_throw_physics.mjs` checks the
 * opponents still hit at the rate their profile claims). Note the floor near
 * 26%: past a certain wildness the rack is simply a big enough target.
 */
const ACCURACY_TO_SPREAD: [spread: number, rate: number][] = [
  [15, 0.997],
  [20, 0.953],
  [25, 0.853],
  [30, 0.73],
  [35, 0.616],
  [40, 0.517],
  [50, 0.383],
  [60, 0.306],
  [75, 0.261],
];

export function spreadForAccuracy(accuracy: number): number {
  const table = ACCURACY_TO_SPREAD;
  if (accuracy >= table[0][1]) return table[0][0];
  for (let i = 1; i < table.length; i++) {
    const [wideSpread, wideRate] = table[i];
    const [tightSpread, tightRate] = table[i - 1];
    if (accuracy >= wideRate) {
      const share = (accuracy - wideRate) / (tightRate - wideRate);
      return wideSpread + (tightSpread - wideSpread) * share;
    }
  }
  return table[table.length - 1][0];
}

/**
 * Triangular noise rather than flat: small errors are common, big ones rare,
 * which is how a throw actually scatters. Takes its randomness as an argument
 * so a test can drive it.
 */
export function wobble(spread: number, random: () => number = Math.random): Point {
  const bell = () => random() + random() - 1;
  return { x: bell() * spread, y: bell() * spread };
}

/**
 * A flight the renderer can play back frame by frame. A bounce shot touches
 * the table once on the way, which is why it can carry two cups: the ball
 * comes in low and rolling rather than dropping from above.
 */
export interface Flight {
  start: Point;
  /** Where the ball finally comes down. */
  landing: Point;
  /** Seconds in the air, start to landing. */
  hang: number;
  /** Where it first touches the table on a bounce shot, else null. */
  bounceAt: Point | null;
  /** Seconds until that first touch. */
  bounceTime: number;
  /** Upward launch speed of the first hop. */
  launchUp: number;
}

/**
 * Where the ball is, and how high, part-way through a flight.
 *
 * `height` is real height above the table, not a screen offset — the renderer
 * decides how much to lift and enlarge the ball for it, and keeps the shadow
 * on the ground so the two together read as an arc.
 */
export function sampleFlight(flight: Flight, t: number): { x: number; y: number; height: number } {
  const { start, landing, bounceAt, bounceTime, hang, launchUp } = flight;
  const clamped = clamp(t, 0, hang);

  if (bounceAt && clamped > bounceTime) {
    const since = clamped - bounceTime;
    const share = (clamped - bounceTime) / Math.max(0.0001, hang - bounceTime);
    return {
      x: bounceAt.x + (landing.x - bounceAt.x) * share,
      y: bounceAt.y + (landing.y - bounceAt.y) * share,
      height: heightAt(since, launchUp * RESTITUTION),
    };
  }

  const to = bounceAt ?? landing;
  const legTime = bounceAt ? bounceTime : hang;
  const share = clamped / Math.max(0.0001, legTime);
  return {
    x: start.x + (to.x - start.x) * share,
    y: start.y + (to.y - start.y) * share,
    height: heightAt(clamped, launchUp),
  };
}

/** The parabola a swipe would fly right now, for the aiming arc. */
export function previewFlight(params: {
  start: Point;
  velocityX: number;
  velocityY: number;
  direction: 'up' | 'down';
  bounce: boolean;
}): Flight | null {
  const { start, velocityX, velocityY, direction, bounce } = params;
  const speed = flickSpeed(velocityX, velocityY);
  if (speed < MIN_FLICK_SPEED) return null;
  // Throwing backwards is not a throw at the rack.
  if (direction === 'up' ? velocityY >= 0 : velocityY <= 0) return null;

  const range = rangeFor(speed);
  const landing = {
    x: start.x + (velocityX / speed) * range,
    y: start.y + (velocityY / speed) * range,
  };
  return buildFlight(start, landing, bounce);
}

/**
 * Splits a flight into its hops. A bounce keeps `RESTITUTION` of its upward
 * speed, so the second hop lasts that much less and covers that much less
 * ground — which fixes where on the table it has to touch down.
 */
export function buildFlight(start: Point, landing: Point, bounce: boolean): Flight {
  if (!bounce) {
    return { start, landing, hang: HANG_TIME, bounceAt: null, bounceTime: 0, launchUp: LAUNCH_UP };
  }
  const firstShare = 1 / (1 + RESTITUTION);
  return {
    start,
    landing,
    hang: HANG_TIME,
    bounceAt: {
      x: start.x + (landing.x - start.x) * firstShare,
      y: start.y + (landing.y - start.y) * firstShare,
    },
    bounceTime: HANG_TIME * firstShare,
    launchUp: (GRAVITY * (HANG_TIME * firstShare)) / 2,
  };
}

export interface LandingResult {
  /** The cup the ball came down on, or null if it landed on bare table. */
  cupIndex: number | null;
  hit: boolean;
  /** Caught the lip and kicked away. */
  rimOut: boolean;
}

/**
 * What the ball came down on. Only cups still standing can be hit — a ball
 * landing where a sunk cup used to be is simply a miss.
 */
export function resolveLanding(
  landing: Point,
  cups: CupSpec[],
  aliveFlags: boolean[]
): LandingResult {
  let closest: CupSpec | null = null;
  let closestDistance = Infinity;

  for (const cup of cups) {
    if (!aliveFlags[cup.index]) continue;
    const rx = cup.width / 2;
    const ry = Math.max(6, cup.width * MOUTH_HEIGHT_RATIO);
    const dx = (landing.x - cup.x) / rx;
    const dy = (landing.y - cup.y) / ry;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < closestDistance) {
      closestDistance = distance;
      closest = cup;
    }
  }

  if (!closest || closestDistance > RIM_THRESHOLD) {
    return { cupIndex: null, hit: false, rimOut: false };
  }
  if (closestDistance <= IN_THRESHOLD) {
    return { cupIndex: closest.index, hit: true, rimOut: false };
  }
  return { cupIndex: closest.index, hit: false, rimOut: true };
}

export interface ThrowOutcome extends LandingResult {
  /** 0-1, how hard it was thrown. */
  power: number;
  /** Where the swipe alone would have put it. */
  aim: Point;
  /** Where it came down once the hand's wobble is counted. */
  landing: Point;
  /** The parabola to draw. */
  flight: Flight;
}

/** The whole throw, from swipe to result. Null when the swipe was too slow. */
export function resolveThrow(params: {
  start: Point;
  velocityX: number;
  velocityY: number;
  direction: 'up' | 'down';
  skill: number;
  bounce: boolean;
  cups: CupSpec[];
  aliveFlags: boolean[];
  random?: () => number;
}): ThrowOutcome | null {
  const { start, velocityX, velocityY, direction, skill, bounce, cups, aliveFlags } = params;
  const random = params.random ?? Math.random;

  const aimed = previewFlight({ start, velocityX, velocityY, direction, bounce });
  if (!aimed) return null;

  const aim = aimed.landing;
  const range = Math.hypot(aim.x - start.x, aim.y - start.y);
  const power = powerOfRange(range);
  const offset = wobble(spreadFor(skill, power, bounce), random);
  const landing = { x: aim.x + offset.x, y: aim.y + offset.y };

  return {
    ...resolveLanding(landing, cups, aliveFlags),
    power,
    aim,
    landing,
    flight: buildFlight(start, landing, bounce),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
