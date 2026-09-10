/**
 * What is free and what is not.
 *
 * The arcade is free, all of it, forever — it is a game and there are a hundred
 * like it. The camera tracker is the part that is worth money, because it is a
 * tool rather than a toy and nothing else does it: point the phone at a real
 * table and the score keeps itself.
 *
 * So the free tier is a real number of tracked games a week rather than a
 * crippled version of the feature. Somebody who plays once a month never pays
 * and never should; somebody who hosts every weekend hits the limit in the
 * first evening and knows exactly what they would be buying.
 *
 * Kept as pure functions with the clock passed in, so a week rolling over can
 * be tested rather than waited for.
 */

/** Tracked games a week without paying. */
export const FREE_TRACKED_GAMES_PER_WEEK = 3;

export interface TrackerUse {
  /** The Monday of the week these games were counted in, as YYYY-MM-DD. */
  weekStart: string;
  used: number;
}

export const EMPTY_TRACKER_USE: TrackerUse = { weekStart: '', used: 0 };

/**
 * The Monday of whatever week this is, in the phone's own timezone.
 *
 * Local rather than UTC on purpose: a game that starts at half past midnight on
 * Sunday belongs to the weekend the player thinks they are in, not to the week
 * the UTC clock has already moved on to.
 */
export function weekStartOf(now: Date): string {
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  // getDay() is 0 on Sunday, and a week here starts on Monday.
  const back = (day.getDay() + 6) % 7;
  day.setDate(day.getDate() - back);
  const month = String(day.getMonth() + 1).padStart(2, '0');
  const date = String(day.getDate()).padStart(2, '0');
  return `${day.getFullYear()}-${month}-${date}`;
}

/** Use so far this week, with a stale week counted as none. */
export function usageThisWeek(use: TrackerUse, now: Date): number {
  return use.weekStart === weekStartOf(now) ? use.used : 0;
}

/** How many tracked games are left. `null` means no limit. */
export function trackedGamesLeft(use: TrackerUse, now: Date, pro: boolean): number | null {
  if (pro) return null;
  return Math.max(0, FREE_TRACKED_GAMES_PER_WEEK - usageThisWeek(use, now));
}

export function canTrackGame(use: TrackerUse, now: Date, pro: boolean): boolean {
  const left = trackedGamesLeft(use, now, pro);
  return left === null || left > 0;
}

/**
 * Counts one tracked game. Called when a game actually starts, not when the
 * screen opens — looking at the table costs nothing.
 */
export function registerTrackedGame(use: TrackerUse, now: Date, pro: boolean): TrackerUse {
  if (pro) return use;
  const week = weekStartOf(now);
  if (use.weekStart !== week) return { weekStart: week, used: 1 };
  return { weekStart: week, used: use.used + 1 };
}
