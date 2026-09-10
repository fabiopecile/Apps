/**
 * Whose turn it is, and why.
 *
 * The game used to hand the turn over after every single throw, hit or miss.
 * That is not beer pong and, more to the point, it has no shape: two players
 * taking strict turns can never go on a run, never claw anything back, and
 * never feel a game slipping away. The real rules put all of that in:
 *
 * - You throw **two balls** a turn.
 * - Sink **both** and you get them back — throw two more. That is a run, and it
 *   is where a game is won.
 * - Lose your **last cup** and you are not out yet: you shoot **redemption**,
 *   throwing until you miss. Miss once and it is over. Clear what is left of
 *   their rack and you have levelled it — which sends the game to
 *   **overtime**, three cups a side.
 *
 * That last part used to be wrong here, and it cost somebody a game they had
 * won: a successful redemption ended the match in favour of the side that had
 * just been on the brink. It does not. Redemption gets you level, not ahead —
 * both racks come back at three cups and it is decided over again, for as many
 * overtimes as it takes.
 *
 * Kept away from the screen so the rules can be checked without a browser —
 * `tools/test_turn_rules.mjs` walks whole games through them.
 */

export const BALLS_PER_TURN = 2;

export interface TurnState {
  /** Throws left in this set. */
  ballsLeft: number;
  /** How many of this set have gone in, which is what earns the balls back. */
  hitsThisSet: number;
  /** True while shooting to survive after losing your last cup. */
  redemption: boolean;
}

/**
 * What the throw that just happened means for whose turn it is.
 *
 * `throwAgain` keeps the ball with you; `ballsBack` does too, but it is worth
 * saying out loud on screen because it is the thing you were hoping for.
 */
export type TurnOutcome =
  | 'throwAgain'
  | 'ballsBack'
  | 'pass'
  /** Redemption cleared their rack: level again, so the game goes to overtime. */
  | 'overtime'
  /** Redemption missed: that is the match. */
  | 'eliminated';

export function startTurn(redemption = false): TurnState {
  return { ballsLeft: redemption ? 1 : BALLS_PER_TURN, hitsThisSet: 0, redemption };
}

/**
 * Applies one throw.
 *
 * `cupsLeftForOther` is how many cups the side being thrown at still has
 * *after* this throw has been counted, which is what decides whether a
 * redemption run has finished the job.
 */
export function afterThrow(
  state: TurnState,
  hit: boolean,
  cupsLeftForOther: number
): { next: TurnState; outcome: TurnOutcome } {
  if (state.redemption) {
    // No two-ball set here: you shoot until you miss, and every cup counts.
    if (!hit) return { next: state, outcome: 'eliminated' };
    if (cupsLeftForOther === 0) return { next: state, outcome: 'overtime' };
    return { next: { ...state, hitsThisSet: state.hitsThisSet + 1 }, outcome: 'throwAgain' };
  }

  const ballsLeft = state.ballsLeft - 1;
  const hitsThisSet = state.hitsThisSet + (hit ? 1 : 0);
  if (ballsLeft > 0) {
    return { next: { ...state, ballsLeft, hitsThisSet }, outcome: 'throwAgain' };
  }
  if (hitsThisSet >= BALLS_PER_TURN) {
    // Both in: the balls come back and the set starts over.
    return { next: startTurn(false), outcome: 'ballsBack' };
  }
  return { next: { ...state, ballsLeft: 0, hitsThisSet }, outcome: 'pass' };
}

/** True while the throw still belongs to whoever just took it. */
export function keepsThrowing(outcome: TurnOutcome): boolean {
  return outcome === 'throwAgain' || outcome === 'ballsBack';
}
