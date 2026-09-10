/**
 * How the opponent decides where to throw, and how well.
 *
 * This is the part that makes a difficulty *better* rather than just luckier,
 * and both levers here were chosen from measurement rather than taste —
 * `npm run bench:ai` runs whole simulated matches through this exact file.
 *
 * What that measurement showed, and it was not what I expected:
 *
 * - **Which cup they aim at barely decides matches.** Aiming at the sheltered
 *   middle of a rack lifts a single throw from 62% to 86% on a full rack,
 *   because a stray can still drop into a neighbour. Over a whole game it is
 *   worth almost nothing — 85% of matches won either way. Being good early only
 *   gets you to the hard part sooner.
 * - **The last cups decide everything.** Every strategy converges to about 24%
 *   on a lone cup, because a lone cup is a small target and the spread is the
 *   spread. So the only lever that changes how a game *ends* is how much better
 *   they get as the rack empties.
 *
 * Hence `focus`: a model of a player concentrating when it gets tight. It is
 * the difference between an opponent who cannot close a game and one who can.
 * Targeting stays anyway, because it costs nothing and makes their early
 * throws look like they meant them.
 */

import type { CupSpec } from './arcadeLayout';

export type AimStrategy = 'random' | 'cluster';

/** Cups this far apart, measured in cup widths, count as neighbours. */
const NEIGHBOUR_REACH = 1.6;

/** How many cups still standing sit next to this one. */
function neighbours(cup: CupSpec, cups: CupSpec[], alive: boolean[]): number {
  let count = 0;
  for (const other of cups) {
    if (other.index === cup.index || !alive[other.index]) continue;
    if (Math.hypot(other.x - cup.x, other.y - cup.y) < cup.width * NEIGHBOUR_REACH) count += 1;
  }
  return count;
}

/**
 * The cup they throw at.
 *
 * `cluster` is what a real player means by "aim at the middle of the rack": a
 * throw that strays off a sheltered cup has somewhere else to fall. Ties break
 * towards the near end, because that is the shorter throw.
 */
export function pickTarget(
  strategy: AimStrategy,
  cups: CupSpec[],
  alive: boolean[],
  random: () => number = Math.random
): CupSpec | null {
  const standing = cups.filter((cup) => alive[cup.index]);
  if (standing.length === 0) return null;
  if (strategy === 'random') return standing[Math.floor(random() * standing.length)];
  return standing.reduce((best, cup) => {
    const here = neighbours(cup, cups, alive);
    const there = neighbours(best, cups, alive);
    if (here !== there) return here > there ? cup : best;
    return cup.y > best.y ? cup : best;
  });
}

/**
 * Their accuracy right now, given how much of the rack is left.
 *
 * At a full rack this is the plain number; by the last cup they have all of
 * `focus` on top. Capped below 1 because an opponent who never misses is not a
 * game, it is a cutscene.
 */
export function effectiveAccuracy(
  base: number,
  focus: number,
  cupsLeft: number,
  startCups: number
): number {
  const span = Math.max(1, startCups - 1);
  const emptied = Math.min(1, Math.max(0, (startCups - cupsLeft) / span));
  return Math.min(0.94, base + focus * emptied);
}
