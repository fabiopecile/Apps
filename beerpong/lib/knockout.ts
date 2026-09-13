import type { AiDifficulty } from './competition';
import { LEAGUE_OPPONENTS, type Opponent } from './opponents';

/**
 * A tournament you pay to enter and can win back several times over.
 *
 * The party tournament in the camera tab could not be this. Its winners are
 * reported by tapping a name, which is right for a room full of people and
 * fatal for a prize: anybody could enter eight imaginary teams, tap themselves
 * through the bracket and mint coins in half a minute. A prize has to sit
 * behind something that cannot be asserted, so it sits here — every round is a
 * match you play, swipe by swipe, against an opponent who gets harder each
 * round.
 *
 * The maths is deliberately close to fair rather than generous. The pot is the
 * stake times the number of teams, so a four-team run pays four times and needs
 * two wins, an eight-team run pays eight and needs three. Somebody winning half
 * their matches comes out level over a long enough run; somebody better than
 * that comes out ahead, which is the point. It is a coin sink with a way back
 * out, not a fountain.
 */

export interface KnockoutRun {
  /** Coins paid to enter, already taken. */
  stake: number;
  /** 4 or 8. Decides how many rounds and what the pot is worth. */
  teams: number;
  /** Which round is next, counting from 1. */
  round: number;
  /** Who is drawn for each round, one id per round, hardest last. */
  opponentIds: string[];
  /**
   * True while a match of this run is out being played.
   *
   * This is what stops the obvious way to cheat the pot: start the final, see
   * it going badly, leave, come back and play it again. A run found with this
   * still set has had a match walked out of, and that counts as a loss — which
   * is also how a tournament works at a table.
   */
  pending: boolean;
  startedAt: number;
}

/** What you can put in. Three steps, roughly an evening, a week and a month. */
export const KNOCKOUT_STAKES = [200, 500, 1200] as const;

/** How many teams a bracket can have. */
export const KNOCKOUT_SIZES = [4, 8] as const;

/**
 * How hard each round is, per size.
 *
 * The eight-team run pays twice as much and ends against the hardest opponent
 * in the game, which is what makes the two worth choosing between rather than
 * one being strictly better.
 */
const LADDER: Record<number, AiDifficulty[]> = {
  4: ['medium', 'hard'],
  8: ['medium', 'hard', 'pro'],
};

export function roundsFor(teams: number): number {
  return LADDER[teams]?.length ?? 0;
}

/** What the whole bracket is worth. */
export function potFor(stake: number, teams: number): number {
  return stake * teams;
}

/** How hard the opponent in a given round is. Round counts from 1. */
export function difficultyForRound(teams: number, round: number): AiDifficulty {
  const ladder = LADDER[teams] ?? LADDER[4];
  return ladder[Math.min(ladder.length - 1, Math.max(0, round - 1))];
}

/** The name a round goes by: final, semi-final, and so on. */
export function roundKey(teams: number, round: number): 'final' | 'semi' | 'quarter' {
  const left = roundsFor(teams) - round;
  if (left <= 0) return 'final';
  if (left === 1) return 'semi';
  return 'quarter';
}

/**
 * Draws the field.
 *
 * Opponents are picked to match each round's difficulty and never repeat, so
 * the bracket can be shown in full before a coin is staked — knowing who is
 * waiting in the final is half of what makes it worth entering.
 */
export function drawOpponents(teams: number, random: () => number = Math.random): string[] {
  const taken = new Set<string>();
  const drawn = (LADDER[teams] ?? LADDER[4]).map((level) => {
    const band =
      level === 'medium'
        ? [2, 3]
        : level === 'hard'
          ? [3, 4]
          : [4, 5];
    const pool = LEAGUE_OPPONENTS.filter(
      (o) => !taken.has(o.id) && o.difficulty >= band[0] && o.difficulty <= band[1]
    );
    const fallback = LEAGUE_OPPONENTS.filter((o) => !taken.has(o.id));
    const from = pool.length > 0 ? pool : fallback;
    const pick = from[Math.floor(random() * from.length)] ?? LEAGUE_OPPONENTS[0];
    taken.add(pick.id);
    return pick.id;
  });
  // Sorted by the characters' own difficulty, not left in the order they were
  // drawn. The bands overlap, so a run could come out with Ice in the semi and
  // Blitz — nominally the easier of the two — in the final. The *match* is
  // harder either way, because that comes from the round, but a final whose
  // face is the friendlier one reads as the draw being broken.
  return drawn.sort((a, b) => opponentById(a).difficulty - opponentById(b).difficulty);
}

export function opponentById(id: string): Opponent {
  return LEAGUE_OPPONENTS.find((o) => o.id === id) ?? LEAGUE_OPPONENTS[0];
}

export function startRun(
  stake: number,
  teams: number,
  now: number,
  random: () => number = Math.random
): KnockoutRun {
  return {
    stake,
    teams,
    round: 1,
    opponentIds: drawOpponents(teams, random),
    pending: false,
    startedAt: now,
  };
}

export interface KnockoutResult {
  /** The run as it stands afterwards, or null once it is over either way. */
  run: KnockoutRun | null;
  /** Coins to pay out. Only ever the whole pot, only ever on the final. */
  coins: number;
  /** True when the bracket was won. */
  champion: boolean;
  /** True when the run ended, won or lost. */
  finished: boolean;
}

/** One round decided. A loss ends the run and the stake stays lost. */
export function reportRound(run: KnockoutRun, won: boolean): KnockoutResult {
  if (!won) {
    return { run: null, coins: 0, champion: false, finished: true };
  }
  const last = run.round >= roundsFor(run.teams);
  if (last) {
    return {
      run: null,
      coins: potFor(run.stake, run.teams),
      champion: true,
      finished: true,
    };
  }
  return {
    run: { ...run, round: run.round + 1, pending: false },
    coins: 0,
    champion: false,
    finished: false,
  };
}
