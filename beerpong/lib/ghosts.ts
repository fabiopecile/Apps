import type { AiDifficulty } from './competition';

/**
 * Opponents built out of how people really throw.
 *
 * The camera already counts every throw and every cup at a real table, per
 * team, by the name somebody typed in. That is a measurement of a person's
 * game, and until now it was only ever a scoreboard that got thrown away when
 * the evening ended. This keeps it: play a few games at a table and the arcade
 * gains an opponent who sinks cups at the rate you actually sink them.
 *
 * It is the one thing in the app nobody can copy without building the camera
 * first, which is the reason it exists.
 *
 * Two honesty rules, both enforced below rather than left to the screen:
 *
 * A ghost needs enough throws behind it to mean anything. Three throws and one
 * cup is not a 33% shooter, it is no information at all, and an opponent built
 * from it would be a made-up opponent wearing a real person's name.
 *
 * And a ghost is never presented as the person. It carries their accuracy and
 * their name, because that is what makes it worth playing; it does not pretend
 * to be them, and the screen says so.
 */

export interface Ghost {
  /** The team name as it was typed at the table. Also the key. */
  name: string;
  /** Throws and hits, summed over every tracked game under that name. */
  throws: number;
  hits: number;
  /** Their best run of cups in a row, for the card. */
  bestStreak: number;
  games: number;
  /** When they last played, so the list can be newest first. */
  lastAt: number;
}

/**
 * Throws needed before a ghost can be played.
 *
 * Twenty is roughly two games at a real table, and it is a compromise rather
 * than a point where the number settles. Simulating a true 30% shooter a
 * thousand times (`npm run test:ghosts` prints the table) gives the middle 90%
 * of runs:
 *
 *     5 throws    0% – 60%
 *    10 throws   10% – 50%
 *    20 throws   15% – 45%
 *    40 throws   20% – 43%
 *    80 throws   23% – 39%
 *
 * So even here the rate can be fifteen points off, and no threshold anybody
 * would actually reach in an evening fixes that. What twenty does is rule out
 * the cases that are not measurements at all — one cup from three throws is not
 * a 33% shooter — and the screen says outright that the rate sharpens the more
 * somebody plays, rather than presenting it as a fact about them.
 */
export const GHOST_MIN_THROWS = 20;

/** How many are kept. The rest fall off by how long ago they last played. */
export const GHOST_LIMIT = 12;

export interface TrackedSide {
  name: string;
  hits: number;
  throws: number;
  bestStreak: number;
}

/**
 * Folds one finished game into the record.
 *
 * Matched on the name, trimmed and case-insensitively, because "Lena" and
 * "lena" across two evenings are one person and two half-ghosts are worse than
 * none. The stored spelling is whatever was typed most recently.
 */
export function foldGame(ghosts: Ghost[], sides: TrackedSide[], at: number): Ghost[] {
  const next = [...ghosts];
  for (const side of sides) {
    const name = side.name.trim();
    // An unnamed team is every unnamed team; there is no person behind it.
    if (!name || side.throws <= 0) continue;
    const at_ = next.findIndex((g) => g.name.toLowerCase() === name.toLowerCase());
    const existing = at_ >= 0 ? next[at_] : null;
    const merged: Ghost = {
      name,
      throws: (existing?.throws ?? 0) + side.throws,
      hits: (existing?.hits ?? 0) + side.hits,
      bestStreak: Math.max(existing?.bestStreak ?? 0, side.bestStreak),
      games: (existing?.games ?? 0) + 1,
      lastAt: at,
    };
    if (at_ >= 0) next[at_] = merged;
    else next.push(merged);
  }
  return next.sort((a, b) => b.lastAt - a.lastAt).slice(0, GHOST_LIMIT);
}

/** Cups per throw, as measured. */
export function ghostAccuracy(ghost: Ghost): number {
  return ghost.throws > 0 ? ghost.hits / ghost.throws : 0;
}

export function isPlayable(ghost: Ghost): boolean {
  return ghost.throws >= GHOST_MIN_THROWS;
}

export function findGhost(ghosts: Ghost[], name: string): Ghost | null {
  const wanted = name.trim().toLowerCase();
  return ghosts.find((g) => g.name.toLowerCase() === wanted) ?? null;
}

export interface GhostSkill {
  accuracy: number;
  focus: number;
  aim: 'random' | 'cluster';
  playerSkill: number;
  /** The nearest named difficulty, only for colouring the card. */
  nearest: AiDifficulty;
}

/**
 * How a ghost throws.
 *
 * The accuracy is theirs, untouched — that is the whole point, and rounding it
 * towards a preset would make every ghost the same three opponents with
 * different names on them. It is clamped only at the ends, because a rate of
 * zero is an opponent who cannot lose you a game and a rate of one is not
 * something a person has ever done over twenty throws.
 *
 * The rest follows from it. Somebody who sinks half their throws at a real
 * table is playing a thought-out game, so their ghost picks off a cluster and
 * concentrates; somebody hitting one in four is throwing at the rack.
 */
export function ghostSkill(ghost: Ghost): GhostSkill {
  const measured = ghostAccuracy(ghost);
  const accuracy = Math.min(0.85, Math.max(0.12, measured));
  return {
    accuracy,
    focus: Math.min(0.25, Math.max(0, (accuracy - 0.3) * 0.5)),
    aim: accuracy >= 0.5 ? 'cluster' : 'random',
    // Unchanged by who you are playing: how much help *your* throw gets is not
    // the opponent's business, and tying it to their rating would quietly make
    // good opponents easier to beat.
    playerSkill: 0.55,
    nearest:
      accuracy >= 0.66 ? 'pro' : accuracy >= 0.54 ? 'hard' : accuracy >= 0.38 ? 'medium' : 'easy',
  };
}
