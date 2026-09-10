/**
 * What actually happened, kept so it can be looked at.
 *
 * The counters the app already had — cups hit, throws, wins — answer "how much
 * have I played". They cannot answer the questions people actually ask about
 * their own game: *where* do I hit, am I in form, is a match taking me longer
 * than it used to. Those need the individual results kept rather than summed
 * away, so this holds a rolling list of matches and a per-cup tally.
 *
 * Bounded on purpose. Thirty matches is a couple of evenings, which is the
 * horizon "form" means anything over, and it keeps what goes into storage to a
 * few kilobytes rather than growing forever on somebody's phone.
 *
 * Pure, and every selector takes the state — `npm run test:stats`.
 */

/** How many matches are remembered. Older ones fall off the end. */
export const MATCH_HISTORY = 30;
/** How many count as "current form". */
export const FORM_LENGTH = 10;

export type StatsMode = 'offline' | 'rivals' | 'weekend' | 'passplay' | 'lucky' | 'tracker';

export interface MatchRecord {
  at: number;
  mode: StatsMode;
  won: boolean;
  /** Cups you sank in that match. */
  cupsHit: number;
  throws: number;
  /** How long it took, wall clock. */
  seconds: number;
  /** Division after the match, where the mode has one. */
  division?: number;
}

export interface StatsState {
  /**
   * Hits per rack position, indexed exactly as `arcadeLayout` indexes cups —
   * 0 is the back of the rack, the last is the cup nearest the thrower.
   */
  cupHits: number[];
  /** Newest last. */
  matches: MatchRecord[];
}

export const RACK_POSITIONS = 10;

export const EMPTY_STATS: StatsState = {
  cupHits: Array(RACK_POSITIONS).fill(0),
  matches: [],
};

/** Counts one sunk cup at a rack position. */
export function recordCup(stats: StatsState, index: number): StatsState {
  if (!Number.isInteger(index) || index < 0 || index >= RACK_POSITIONS) return stats;
  const cupHits = stats.cupHits.slice();
  // A stored array from an older version can be short; treat missing as zero.
  while (cupHits.length < RACK_POSITIONS) cupHits.push(0);
  cupHits[index] += 1;
  return { ...stats, cupHits };
}

export function recordMatch(stats: StatsState, match: MatchRecord): StatsState {
  return { ...stats, matches: [...stats.matches, match].slice(-MATCH_HISTORY) };
}

/**
 * Share of all sunk cups that fell at each position, 0-1.
 *
 * Shares rather than counts because the interesting thing is the shape: an even
 * rack means ten roughly equal numbers, and a lean shows up as one corner
 * running hot. With no data at all every position is zero — not an even tenth,
 * which would draw a confident heatmap of nothing.
 */
export function hitShares(stats: StatsState): number[] {
  const total = stats.cupHits.reduce((sum, value) => sum + value, 0);
  if (total === 0) return Array(RACK_POSITIONS).fill(0);
  return Array.from({ length: RACK_POSITIONS }, (_, i) => (stats.cupHits[i] ?? 0) / total);
}

export function totalCupsRecorded(stats: StatsState): number {
  return stats.cupHits.reduce((sum, value) => sum + value, 0);
}

/** The last matches, newest first, optionally for one mode. */
export function recentMatches(stats: StatsState, count: number, mode?: StatsMode): MatchRecord[] {
  const pool = mode ? stats.matches.filter((match) => match.mode === mode) : stats.matches;
  return pool.slice(-count).reverse();
}

/** Current form as wins and losses, newest first. */
export function form(stats: StatsState, count = FORM_LENGTH): boolean[] {
  return recentMatches(stats, count).map((match) => match.won);
}

/**
 * Average time per sunk cup, in seconds, for one mode.
 *
 * `null` when nothing has been sunk in that mode — an honest gap rather than a
 * zero, which would read as "instant".
 */
export function secondsPerCup(stats: StatsState, mode?: StatsMode): number | null {
  const pool = mode ? stats.matches.filter((match) => match.mode === mode) : stats.matches;
  const cups = pool.reduce((sum, match) => sum + match.cupsHit, 0);
  if (cups === 0) return null;
  const seconds = pool.reduce((sum, match) => sum + match.seconds, 0);
  return seconds / cups;
}

/** Hit rate over the recorded matches, 0-1, or null with nothing thrown. */
export function hitRate(stats: StatsState, mode?: StatsMode): number | null {
  const pool = mode ? stats.matches.filter((match) => match.mode === mode) : stats.matches;
  const throws = pool.reduce((sum, match) => sum + match.throws, 0);
  if (throws === 0) return null;
  return pool.reduce((sum, match) => sum + match.cupsHit, 0) / throws;
}

/**
 * Net result over the last matches: wins minus losses.
 *
 * The competitor's "rating trend" in one number, and the one people actually
 * read — plus or minus, and how far.
 */
export function netForm(stats: StatsState, count = FORM_LENGTH): number {
  return form(stats, count).reduce((sum, won) => sum + (won ? 1 : -1), 0);
}

/** The division after each of the last ranked matches, oldest first. */
export function divisionTrail(stats: StatsState, count = FORM_LENGTH): number[] {
  return stats.matches
    .filter((match) => match.division != null)
    .slice(-count)
    .map((match) => match.division as number);
}

/** The longest run of wins anywhere in what is remembered. */
export function bestRun(stats: StatsState): number {
  let best = 0;
  let run = 0;
  for (const match of stats.matches) {
    run = match.won ? run + 1 : 0;
    if (run > best) best = run;
  }
  return best;
}
