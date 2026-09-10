/**
 * A thrown ball: a real projectile, launched by how far you dragged it.
 *
 * The ball leaves your hand with a velocity, gravity pulls it back down, and
 * it lands where the parabola says it lands. Nothing here decides in advance
 * whether a throw goes in — the flight decides, and the cup it comes down in
 * is the cup that goes.
 *
 * Strength comes from the *length* of the drag, not its speed, and that is the
 * single most important choice in this file. Speed cannot be seen: nothing on
 * screen reports how fast a thumb just moved, it cannot be corrected part-way,
 * and there is one throw per turn to learn from. Length is under your finger
 * the whole time. Built on speed first, the throw was called too hard four
 * times over, and no amount of assistance on top of it fixed that.
 *
 * What is a modelling choice rather than raw physics: the throw is a *lob*,
 * thrown up at a fixed vertical speed, with the drag setting only how hard it
 * is pushed down the table. That is how a person tosses a ping-pong ball into
 * a cup — you do not vary the arc much, you vary the push. Modelling the angle
 * as free instead makes range grow with the square of the push, which put the
 * whole table inside a 35% band: unthrowable on a phone.
 *
 * Nothing here touches React, animation or the DOM, so the whole flight can be
 * simulated a hundred thousand times in a test.
 */

import type { CupSpec } from './arcadeLayout';

export interface Point {
  x: number;
  y: number;
}

/**
 * Points per second squared, at the scale this table is drawn.
 *
 * Gravity and hang time are chosen together: the apex is `g * T^2 / 8`.
 *
 * Both went up when the camera was raised, and the second reason is the less
 * obvious one. From twelve degrees above the felt, a vertical rise showed on
 * screen almost in full while travel down the table barely showed at all — so
 * a modest lob looked like a high arc. From thirty-two degrees the table's
 * length is half again as visible and the rise slightly less, which flattened
 * the same throw into a line drive. The apex went from 116 points to 240 to
 * put the arc back, and the flight from 0.40s to 0.52s because it read as
 * hurried.
 */
export const GRAVITY = 7100;
/** How long a lobbed throw stays in the air. */
export const HANG_TIME = 0.52;
/** Upward launch speed, the one that gives that hang time. */
export const LAUNCH_UP = (GRAVITY * HANG_TIME) / 2;
/** Highest the ball gets, in points: about a third of the table's length. */
export const APEX = (LAUNCH_UP * LAUNCH_UP) / (2 * GRAVITY);

/**
 * How far the ball flies per point your finger travelled.
 *
 * Strength used to come from how *fast* the hand was moving, and that was the
 * single biggest thing wrong with the throw. Speed is invisible: nothing on
 * screen tells you how quickly your thumb just moved, you cannot correct it
 * part-way, and you get one throw per turn to learn from. Length you can see —
 * the ball is under your finger the whole time — and you can adjust it before
 * letting go. Every game that gets this right does it by length.
 *
 * At 4.6, the nearest cup wants a 114pt drag and the back row 141pt, both
 * comfortable inside a thumb's reach on a phone.
 *
 * The two are close together on purpose, and that is not a fudge: on a real
 * table every cup is roughly the same distance away, because the table is long
 * compared with the rack. A throw at the back row is not a harder *push* than
 * one at the front, it is a harder *aim* — which is the half of it you can see.
 */
const DRAG_TO_RANGE = 4.6;
/** Shorter than this is a fumble, not a throw. */
export const MIN_DRAG = 38;
/** Past this the ball has left the table anyway. */
export const MAX_RANGE = 900;

/**
 * Wobble at zero steadiness, in points. Scaled down by steadiness and up by
 * how hard the ball was thrown. Tuned by simulation rather than by feel, and
 * re-tuned whenever the table changes shape: with this, a normal thrower lands
 * about 90% at the front cup and about 87% on the last cup standing.
 *
 * Note what is *not* a difficulty measure any more: hitting the back row of a
 * full rack. On a real triangle a throw that misses its cup drops into the
 * neighbour, so aiming at the middle of a full rack is easier than aiming at
 * the lone cup in front. The honest hard case is the end of a game, one cup
 * left with nothing around it to catch a miss, and that is what the test
 * measures.
 */
const SPREAD_AT_ZERO_SKILL = 75;
/** How much of that wobble goes into depth rather than sideways; see below. */
const DEPTH_WOBBLE = 0.6;
/** A bounce shot is thrown flatter and lands wilder. */
const BOUNCE_SPREAD_FACTOR = 1.6;
/** How much speed the ball keeps when it bounces off the table. */
export const RESTITUTION = 0.6;

/**
 * The catching ellipse, as a fraction of a cup's width.
 *
 * The drawn rim is 0.37 of the width; this is deliberately wider, because a
 * ball has to be allowed to clip the inside of the lip and drop rather than
 * needing to thread the exact pixels of the opening. Its height follows the
 * drawn openness, so the target is the shape you can see.
 */
const MOUTH_RX = 0.52;
/** Inside the first the ball drops in; out to the second it catches the rim. */
const IN_THRESHOLD = 1;
const RIM_THRESHOLD = 1.45;

/**
 * The opening of a cup, on the table — what a throw is actually aimed at.
 *
 * A circle, and directly above where the cup stands. Both of those used to be
 * false: the layout was in screen coordinates, so a mouth was an ellipse and
 * sat a third of a cup's height above the point the cup was stored at, and
 * getting either wrong meant balls scoring without looking like they went in.
 * In ground coordinates there is nothing left to get wrong.
 */
export function cupMouth(cup: CupSpec): Point & { rx: number; ry: number } {
  const r = cup.width * MOUTH_RX;
  return { x: cup.x, y: cup.y, rx: r, ry: r };
}

/** How long the drag was, in table points. */
export function dragLength(dragX: number, dragY: number): number {
  return Math.hypot(dragX, dragY);
}

/** How far a drag of this length carries the ball. */
export function rangeForDrag(drag: number): number {
  return Math.min(MAX_RANGE, drag * DRAG_TO_RANGE);
}

/** The drag that would land the ball a given distance away. */
export function dragForRange(range: number): number {
  return range / DRAG_TO_RANGE;
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
 * the share of throws that landed in *some* cup over 60,000 simulated throws at
 * a random cup of *your* full rack — the one they actually throw at, and the
 * wide near one, so measuring on the far rack gets it badly wrong (`tools/test_throw_physics.mjs` checks the
 * opponents still hit at the rate their profile claims). Note the floor around
 * a quarter: past a certain wildness the rack is simply a big enough target,
 * so the weakest opponents need a very wide spread for a small change in rate.
 * Re-measure this whenever the cup mouth changes — widening it once made every
 * opponent quietly better than its profile said, and the test caught it.
 *
 * The numbers used to bottom out around a quarter no matter how wild the throw.
 * That was not the rack being a big target: the opponent was aiming at each
 * cup's stored centre rather than its mouth, so every ball went a mouth-height
 * low and only the spread ever rescued it. A dead-steady opponent landed 2.7%.
 *
 * The last two rows are extrapolated rather than measured — on a tight triangle
 * the rate falls off so slowly that measuring past 200pt of spread costs a lot
 * of throws for very little, and no opponent in the league is that bad.
 */
const ACCURACY_TO_SPREAD: [spread: number, rate: number][] = [
  [25, 0.97],
  [33, 0.859],
  [42, 0.774],
  [53, 0.709],
  [66, 0.653],
  [82, 0.588],
  [102, 0.512],
  [128, 0.429],
  [160, 0.342],
  [200, 0.26],
  [280, 0.17],
  [400, 0.1],
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

/**
 * The parabola this drag would fly.
 *
 * `carry` is how far the ball was already walked towards the rack before being
 * let go. It is taken *off* the range, so the ball lands where the drag says
 * regardless of where it left from. That is what lets the ball follow the
 * finger the whole way — the alternative, holding it back on a leash, is what
 * made the throw feel stuck, and letting it run free without this would turn
 * every drag up the table into free distance.
 */
export function previewFlight(params: {
  start: Point;
  dragX: number;
  dragY: number;
  direction: 'up' | 'down';
  bounce: boolean;
  carry?: number;
}): Flight | null {
  const { start, dragX, dragY, direction, bounce } = params;
  const drag = dragLength(dragX, dragY);
  if (drag < MIN_DRAG) return null;
  // Dragging backwards is not a throw at the rack.
  if (direction === 'up' ? dragY >= 0 : dragY <= 0) return null;

  // Pulling back does not lend distance, so only a forward carry counts.
  const range = Math.max(0, rangeForDrag(drag) - Math.max(0, params.carry ?? 0));
  const landing = {
    x: start.x + (dragX / drag) * range,
    y: start.y + (dragY / drag) * range,
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
    const mouth = cupMouth(cup);
    const dx = (landing.x - mouth.x) / mouth.rx;
    const dy = (landing.y - mouth.y) / mouth.ry;
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

/**
 * How much a throw that is nearly the right strength gets pulled onto the right
 * strength.
 *
 * Judging how hard to flick is the hardest part of the gesture and the least
 * interesting: there is nothing on screen that tells you how fast your thumb
 * just moved, so it is guesswork with a one-throw-per-turn feedback loop.
 * Direction you can see and aim; strength you cannot. So strength is helped and
 * direction is not — the pull is along the line of the throw only, never
 * sideways, and it never moves the ball to a different cup than the one it was
 * already heading for.
 *
 * The window has to cover the whole depth of a rack *plus* the error in a
 * drag, because the required strength moves as cups are cleared: the nearest
 * cup starts 525pt away and the last one standing can be 650pt away. Measured
 * in the browser under narrower windows, a run stalled at 6 of 10 cups — once
 * the front rows were gone, every throw fell short of everything left and got
 * no help at all, throw after throw, with the game telling the player "drag
 * further" and the player having no way to know how much further. At 220 any
 * drag between roughly 66 and 189 points lands somewhere on the rack, and
 * which cup it finds is down to your line. Strength therefore picks the table, and the pull finds the cup;
 * direction is still entirely yours. A wild overthrow is still a wild
 * overthrow — nothing is pulled onto a cup it was never near, and a test says
 * so.
 */
const ASSIST_WINDOW = 220;
const ASSIST_STRENGTH = 0.85;

/**
 * Pulls the landing distance towards whichever standing cup the throw was
 * nearly reaching. Returns the aim point unchanged when nothing is close.
 */
function assistDistance(
  start: Point,
  aim: Point,
  cups: CupSpec[],
  aliveFlags: boolean[]
): Point {
  const dx = aim.x - start.x;
  const dy = aim.y - start.y;
  const range = Math.hypot(dx, dy);
  if (range < 1) return aim;

  let best: number | null = null;
  let bestGap = Infinity;
  for (const cup of cups) {
    if (!aliveFlags[cup.index]) continue;
    const mouth = cupMouth(cup);
    // How far away that cup is, and how far the aim point sits from it.
    const cupRange = Math.hypot(mouth.x - start.x, mouth.y - start.y);
    const miss = Math.hypot(aim.x - mouth.x, aim.y - mouth.y);
    if (miss < bestGap) {
      bestGap = miss;
      best = cupRange;
    }
  }
  if (best === null || Math.abs(best - range) > ASSIST_WINDOW) return aim;

  const pulled = range + (best - range) * ASSIST_STRENGTH;
  return { x: start.x + (dx / range) * pulled, y: start.y + (dy / range) * pulled };
}

export interface ThrowOutcome extends LandingResult {
  /** 0-1, how hard it was thrown. */
  power: number;
  /** Where the drag alone would have put it. */
  aim: Point;
  /** Where it came down once the hand's wobble is counted. */
  landing: Point;
  /** The parabola to draw. */
  flight: Flight;
}

/** The whole throw, from drag to result. Null when the drag was too short. */
export function resolveThrow(params: {
  start: Point;
  dragX: number;
  dragY: number;
  direction: 'up' | 'down';
  skill: number;
  bounce: boolean;
  cups: CupSpec[];
  aliveFlags: boolean[];
  carry?: number;
  random?: () => number;
}): ThrowOutcome | null {
  const { start, dragX, dragY, direction, skill, bounce, cups, aliveFlags } = params;
  const random = params.random ?? Math.random;
  const carry = params.carry ?? 0;

  const aimed = previewFlight({ start, dragX, dragY, direction, bounce, carry });
  if (!aimed) return null;

  const aim = assistDistance(start, aimed.landing, cups, aliveFlags);
  // How hard it was thrown, not how far it happened to travel — a ball let go
  // half way up the table was still thrown that hard, and pays the same
  // accuracy for it.
  const power = powerOfRange(rangeForDrag(dragLength(dragX, dragY)));
  const offset = wobble(spreadFor(skill, power, bounce), random);
  // The hand's error is mostly sideways, because the depth is the part being
  // helped: scattering it as hard as the sideways error would undo the help on
  // the very next line. Applying the help *after* the wobble instead was tried
  // and removes the challenge outright — the nearest cup went to 100% even at
  // 40% strength, and the test that says a steadier hand must score more
  // caught it.
  const landing = { x: aim.x + offset.x, y: aim.y + offset.y * DEPTH_WOBBLE };

  const outcome = resolveLanding(landing, cups, aliveFlags);

  // What you watch has to be what gets counted.
  //
  // The wobble decides *whether* the throw goes in and *which* cup catches it.
  // Once that is settled, the ball is flown into that cup rather than to the
  // scattered point beside it — otherwise the ball lands next to one cup while
  // a different one goes over, which from the player's side is the game
  // scoring a cup they did not hit.
  const sunk = outcome.hit && outcome.cupIndex != null
    ? cups.find((cup) => cup.index === outcome.cupIndex)
    : null;
  const shown = sunk ? cupMouth(sunk) : landing;

  return {
    ...outcome,
    power,
    aim,
    landing: shown,
    flight: buildFlight(start, shown, bounce),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
