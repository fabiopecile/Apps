/**
 * Where a thrown ball actually lands, and what it hits.
 *
 * The old throw rolled a die: `skill + power * 0.28` against `Math.random()`.
 * Aiming picked which cup you were nominally throwing at, but not whether you
 * hit it, so practice changed nothing. This replaces that with a real throw —
 * the flick sets a landing point on the table, a small wobble is added, and
 * whatever cup that point falls into is the cup you sank.
 *
 * Nothing here touches React, animation or the DOM, so the whole thing can be
 * simulated a hundred thousand times in a test.
 */

import type { CupSpec } from './arcadeLayout';

export interface Point {
  x: number;
  y: number;
}

/**
 * The drag maps one-to-one onto the table: wherever you pull the ring, that is
 * where the ball is thrown. Anything else — a drag that flies further than
 * your finger, a minimum reach — makes the ring stop meaning what it shows,
 * and then the aim cannot be learned. An amplified drag was tried first and
 * threw a third of the table too far.
 */
const AIM_SCALE = 1;
/** A drag this long is a full-strength throw; past it, nothing more happens. */
export const MAX_REACH = 420;
/**
 * Wobble at zero steadiness, in points. Scaled down by skill and up by power.
 * Tuned by simulation, not by feel: at these numbers a normal thrower aiming
 * perfectly lands about half of their throws at the nearest cup and about a
 * quarter at the far row, which is roughly where real beer pong sits. Turning
 * it down made the near cup a formality (99% at the first attempt).
 */
const SPREAD_AT_ZERO_SKILL = 88;
/** A bounce shot is thrown harder and lands wilder. */
const BOUNCE_SPREAD_FACTOR = 1.6;

/**
 * A cup's mouth as an ellipse. The table is drawn from a low angle, so the
 * opening is much shallower than it is wide; a ball landing a few points long
 * still drops in, one landing a few points wide does not.
 */
const MOUTH_HEIGHT_RATIO = 0.34;
/** Inside this the ball drops in; out to the second it catches the rim. */
const IN_THRESHOLD = 0.85;
const RIM_THRESHOLD = 1.25;

/** 0-1: how hard the flick was, as a share of the longest throw possible. */
export function throwPower(dragY: number): number {
  return clamp(Math.abs(dragY) / MAX_REACH, 0, 1);
}

/**
 * Where the player pointed, before any wobble. This is what the aim marker
 * shows while dragging — the honest target, not the outcome.
 */
export function aimPoint(
  start: Point,
  dragX: number,
  dragY: number,
  direction: 'up' | 'down'
): Point {
  const reach = throwPower(dragY) * MAX_REACH;
  const away = direction === 'up' ? -1 : 1;
  return { x: start.x + dragX * AIM_SCALE, y: start.y + away * reach };
}

/**
 * How far off the aim a throw can land. Steadiness (the old `skill` number)
 * now sets the size of the miss rather than the odds of one, and throwing
 * hard costs accuracy — which is what makes the back row genuinely harder
 * than the cup in front of you.
 */
export function spreadFor(skill: number, power: number, bounce: boolean): number {
  const base = SPREAD_AT_ZERO_SKILL * (1 - clamp(skill, 0, 1));
  return base * (0.8 + power * 0.35) * (bounce ? BOUNCE_SPREAD_FACTOR : 1);
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
  power: number;
  aim: Point;
  landing: Point;
}

/** The whole throw, from flick to result. */
export function resolveThrow(params: {
  start: Point;
  dragX: number;
  dragY: number;
  direction: 'up' | 'down';
  skill: number;
  bounce: boolean;
  cups: CupSpec[];
  aliveFlags: boolean[];
  random?: () => number;
}): ThrowOutcome {
  const { start, dragX, dragY, direction, skill, bounce, cups, aliveFlags } = params;
  const random = params.random ?? Math.random;
  const power = throwPower(dragY);
  const aim = aimPoint(start, dragX, dragY, direction);
  const offset = wobble(spreadFor(skill, power, bounce), random);
  const landing = { x: aim.x + offset.x, y: aim.y + offset.y };
  return { ...resolveLanding(landing, cups, aliveFlags), power, aim, landing };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
