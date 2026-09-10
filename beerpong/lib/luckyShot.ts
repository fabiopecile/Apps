/**
 * One free throw a day, at a rack with a golden cup in it.
 *
 * The point is a reason to open the app on a day nobody is playing beer pong.
 * A daily challenge asks for a session; this asks for fifteen seconds, and it
 * is over whether you win or not — which is exactly what makes it worth coming
 * back for.
 *
 * Three things here are deliberate:
 *
 * - **The golden cup is fixed for the day.** Its position comes from the date,
 *   not from a die rolled when the screen opens. Otherwise the game is "reload
 *   until the gold cup is the easy one", which is not a game.
 * - **A miss still costs the day.** Anything else and there is no shot to take,
 *   only a shot to keep taking.
 * - **The streak pays, not the luck.** Coming back seven days running is worth
 *   more than being lucky once, because turning up is the thing being rewarded.
 *
 * Pure, with the clock passed in, so the day rolling over can be tested rather
 * than waited for: `npm run test:lucky`.
 */

/** Every cup is worth something; one of them is worth coming back for. */
export const LUCKY_GOLDEN_COINS = 500;
export const LUCKY_CUP_COINS = 60;
/** Each day in a row adds this to the golden prize, up to the cap. */
export const LUCKY_STREAK_BONUS = 100;
export const LUCKY_MAX_STREAK = 5;

export type LuckyOutcome = 'golden' | 'cup' | 'miss';

export interface LuckyState {
  /** The day the last shot was taken, as YYYY-MM-DD, or '' for never. */
  lastDay: string;
  /** Days in a row with a shot taken. */
  streak: number;
  /** What the last shot paid, so the screen can say so on the way back. */
  lastPrize: number;
  lastOutcome: LuckyOutcome | null;
}

export const EMPTY_LUCKY: LuckyState = {
  lastDay: '',
  streak: 0,
  lastPrize: 0,
  lastOutcome: null,
};

/** The phone's own day, so "today" means what the player thinks it means. */
export function dayKeyOf(now: Date): string {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/** Yesterday's key, which is what keeps a streak alive. */
function previousDayKey(now: Date): string {
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  return dayKeyOf(yesterday);
}

export function canPlayLucky(state: LuckyState, now: Date): boolean {
  return state.lastDay !== dayKeyOf(now);
}

/**
 * Which cup is golden today.
 *
 * A small string hash of the date, so it is the same cup all day on every
 * device and cannot be re-rolled by closing the app. Not a secret, and not
 * meant to be one — knowing which cup it is does not make hitting it easier.
 */
export function goldenCupFor(dayKey: string, cupCount: number): number {
  let hash = 2166136261;
  for (let i = 0; i < dayKey.length; i++) {
    hash ^= dayKey.charCodeAt(i);
    // FNV-1a, kept in 32 bits by the shifts.
    hash = (hash + (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24)) >>> 0;
  }
  return hash % Math.max(1, cupCount);
}

/** What the streak will be once today's shot is taken. */
export function streakAfter(state: LuckyState, now: Date): number {
  if (state.lastDay === previousDayKey(now)) return state.streak + 1;
  if (state.lastDay === dayKeyOf(now)) return state.streak;
  // A missed day is a broken streak, and it starts again at one today.
  return 1;
}

/** What hitting the golden cup pays, given the streak that shot earns. */
export function goldenPrizeFor(streak: number): number {
  const steps = Math.min(Math.max(streak - 1, 0), LUCKY_MAX_STREAK - 1);
  return LUCKY_GOLDEN_COINS + steps * LUCKY_STREAK_BONUS;
}

export interface LuckyResult {
  state: LuckyState;
  coins: number;
  streak: number;
}

/**
 * Takes today's shot.
 *
 * Returns the same state untouched if the day is already used, so a double tap
 * or a second tab cannot pay twice.
 */
export function playLucky(state: LuckyState, outcome: LuckyOutcome, now: Date): LuckyResult {
  if (!canPlayLucky(state, now)) return { state, coins: 0, streak: state.streak };
  const streak = streakAfter(state, now);
  const coins =
    outcome === 'golden' ? goldenPrizeFor(streak) : outcome === 'cup' ? LUCKY_CUP_COINS : 0;
  return {
    state: { lastDay: dayKeyOf(now), streak, lastPrize: coins, lastOutcome: outcome },
    coins,
    streak,
  };
}

/** Hours and minutes until the next shot, for the "come back tomorrow" line. */
export function hoursUntilNextShot(now: Date): { hours: number; minutes: number } {
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const ms = midnight.getTime() - now.getTime();
  return { hours: Math.floor(ms / 3600000), minutes: Math.floor((ms % 3600000) / 60000) };
}
