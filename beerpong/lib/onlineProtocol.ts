/**
 * Two tables, one game.
 *
 * The camera tracker already knows something that makes online play simple:
 * a cup going down on *your* rack means the *other* side threw it. So neither
 * phone ever has to claim its own hits. Each side watches its own ten cups and
 * reports what happened to them, and the two reports cannot contradict each
 * other because they are about different racks.
 *
 * That also makes the turn self-correcting. "A cup went down on my rack" means
 * they are throwing, so it is their turn; "the throw at my rack missed" means
 * it is mine. Whatever the two phones believed a second ago, the next report
 * puts them back in step — which matters at a party, where somebody always
 * taps the wrong thing.
 *
 * Everything here is pure and free of any network or React import on purpose:
 * the same file runs in the app and inside the Cloudflare Worker that holds the
 * room, so there is one set of rules rather than two that drift apart.
 * `npm run test:online` exercises it.
 */

import { OVERTIME_CUP_COUNT } from './arcadeLayout';
import { afterThrow, keepsThrowing, startTurn, type TurnState } from './turnRules';

export type Seat = 0 | 1;

/**
 * What is being played in the room.
 *
 * 'camera' is the original: two real tables, each phone watching its own cups,
 * and the score is all that travels. 'arcade' is the flick game, one player a
 * phone — the rules there are the real beer pong ones from `turnRules`, so the
 * room has to run them rather than just count.
 *
 * A room made before this existed has no kind stored; it is a camera room, and
 * saying so here rather than at every use site keeps the old ones working.
 */
export type MatchKind = 'camera' | 'arcade';

export function matchKind(match: OnlineMatch): MatchKind {
  return match.kind === 'arcade' ? 'arcade' : 'camera';
}

/** Cups a side gets in overtime. The same number as the offline game uses. */
export const OVERTIME_CUPS = OVERTIME_CUP_COUNT;

/** The other side. */
export function otherSeat(seat: Seat): Seat {
  return seat === 0 ? 1 : 0;
}

/**
 * Room codes are read out loud across a noisy room, so the alphabet leaves out
 * everything that gets misheard or mistyped: I, L, O, 0 and 1.
 */
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const ROOM_CODE_LENGTH = 4;

/** `random` is injected so a test can pin the code it gets. */
export function makeRoomCode(random: () => number = Math.random): string {
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    const pick = Math.floor(random() * ROOM_CODE_ALPHABET.length);
    code += ROOM_CODE_ALPHABET[Math.min(pick, ROOM_CODE_ALPHABET.length - 1)];
  }
  return code;
}

/** Whatever was typed, reduced to the characters a code can contain. */
export function normaliseRoomCode(raw: string): string {
  return raw
    .toUpperCase()
    .split('')
    .filter((character) => ROOM_CODE_ALPHABET.includes(character))
    .join('')
    .slice(0, ROOM_CODE_LENGTH);
}

export function isRoomCode(raw: string): boolean {
  return normaliseRoomCode(raw).length === ROOM_CODE_LENGTH;
}

export const MAX_TEAM_NAME = 16;
export const CUP_COUNT_CHOICES = [6, 10, 15] as const;

export interface OnlineTeam {
  name: string;
  /** The cup design this side is playing with, when it has bought one. */
  skin?: string;
  cupsLeft: number;
  hits: number;
  throws: number;
  streak: number;
  bestStreak: number;
}

interface MatchSnapshot {
  teams: [OnlineTeam, OnlineTeam];
  activeTeam: Seat;
  winner: Seat | null;
}

/**
 * A throw somebody took, kept so the other phone can show it.
 *
 * The landing point rather than the swipe: both phones run the same physics
 * from `buildFlight(start, landing, bounce)`, so sending where the ball came
 * down is enough to draw the identical arc at the other end — and it cannot
 * drift, because there is nothing left to simulate.
 */
export interface OnlineShot {
  seat: Seat;
  hit: boolean;
  /** Cups that went down, by rack index. Two of them on a bounce shot. */
  cups: number[];
  /** Ground coordinates on the target's rack. */
  landing: { x: number; y: number };
  bounce: boolean;
  /** Counts up, so a phone can tell a new throw from a redrawn one. */
  id: number;
}

/** Worth saying on screen, and only the room knows when it happened. */
export type OnlineNote = 'ballsBack' | 'redemption' | 'overtime' | null;

export interface OnlineMatch {
  /**
   * Bumped by every accepted action. The room is the only writer, so a client
   * can throw away anything that arrives out of order without thinking.
   */
  version: number;
  /** Absent in rooms opened before the arcade game existed: those are 'camera'. */
  kind?: MatchKind;
  startCups: number;
  teams: [OnlineTeam, OnlineTeam];
  activeTeam: Seat;
  winner: Seat | null;
  startedAt: number;
  /** Enough steps back to undo a whole bad minute. */
  history: MatchSnapshot[];

  // ---- arcade only ----------------------------------------------------
  /** Which cups still stand, per seat. Index matches the rack layout. */
  alive?: [boolean[], boolean[]];
  /** Balls left in the set for whoever is throwing, and whether it is redemption. */
  turn?: TurnState;
  lastShot?: OnlineShot;
  note?: OnlineNote;
  /** Overtimes played so far, for the scoreboard. */
  overtime?: number;
}

export type OnlineAction =
  /** A cup went down on the reporting seat's rack — so the other side scored. */
  | { type: 'cupDown' }
  /** The throw at the reporting seat's rack missed, so the reporter is up. */
  | { type: 'miss' }
  | { type: 'undo' }
  | { type: 'rename'; name: string }
  /** Which cup design to show on this seat's rack. Vanity, and nothing else. */
  | { type: 'skin'; id: string }
  | { type: 'rematch' }
  | { type: 'setCups'; cups: number }
  /**
   * Arcade only: the throw this seat just took, already resolved by the
   * physics on its own phone.
   *
   * The room does not re-simulate it — it cannot, the swipe happened over
   * there — so it takes the result and owns everything that follows from it:
   * whose turn it is now, what the score is, whether that was the match. Which
   * is to say a determined player could claim a hit they did not make. That is
   * a game you open by reading four characters out to somebody, so the answer
   * to cheating is the same as at a real table: play with people you like.
   */
  | {
      type: 'shot';
      hit: boolean;
      cups: number[];
      landing: { x: number; y: number };
      bounce: boolean;
    };

/** What the room sends down the socket. */
export type ServerMessage =
  | { type: 'state'; match: OnlineMatch; present: [boolean, boolean]; seat: Seat; code: string }
  | { type: 'error'; reason: 'full' | 'missing' | 'taken' | 'badCode' };

const HISTORY_LIMIT = 30;

function makeTeam(name: string, cups: number): OnlineTeam {
  return { name, cupsLeft: cups, hits: 0, throws: 0, streak: 0, bestStreak: 0 };
}

export function createMatch(
  startCups: number,
  names: [string, string],
  now: number,
  kind: MatchKind = 'camera'
): OnlineMatch {
  const base: OnlineMatch = {
    version: 1,
    kind,
    startCups,
    teams: [makeTeam(names[0], startCups), makeTeam(names[1], startCups)],
    activeTeam: 0,
    winner: null,
    startedAt: now,
    history: [],
  };
  if (kind !== 'arcade') return base;
  return {
    ...base,
    alive: [fullRack(startCups), fullRack(startCups)],
    turn: startTurn(),
    note: null,
    overtime: 0,
  };
}

function fullRack(cups: number): boolean[] {
  return Array.from({ length: cups }, () => true);
}

function snapshot(match: OnlineMatch): MatchSnapshot[] {
  const entry: MatchSnapshot = {
    teams: [{ ...match.teams[0] }, { ...match.teams[1] }],
    activeTeam: match.activeTeam,
    winner: match.winner,
  };
  return [...match.history, entry].slice(-HISTORY_LIMIT);
}

function cleanName(raw: string, fallback: string): string {
  const trimmed = raw.trim().slice(0, MAX_TEAM_NAME);
  return trimmed.length > 0 ? trimmed : fallback;
}

/**
 * The rules, applied by the room and nobody else.
 *
 * Returns the same object when an action changes nothing, so the room can skip
 * the broadcast by identity.
 */
export function applyAction(
  match: OnlineMatch,
  seat: Seat,
  action: OnlineAction,
  now: number
): OnlineMatch {
  const next = (patch: Partial<OnlineMatch>): OnlineMatch => ({
    ...match,
    ...patch,
    version: match.version + 1,
  });

  switch (action.type) {
    case 'cupDown': {
      if (match.winner != null) return match;
      if (match.teams[seat].cupsLeft <= 0) return match;
      const scorer = otherSeat(seat);
      const teams: [OnlineTeam, OnlineTeam] = [{ ...match.teams[0] }, { ...match.teams[1] }];
      const streak = teams[scorer].streak + 1;
      teams[scorer] = {
        ...teams[scorer],
        hits: teams[scorer].hits + 1,
        throws: teams[scorer].throws + 1,
        streak,
        bestStreak: Math.max(teams[scorer].bestStreak, streak),
      };
      teams[seat] = { ...teams[seat], cupsLeft: teams[seat].cupsLeft - 1 };
      return next({
        teams,
        // Reported by the side being thrown at, so it also settles the turn.
        activeTeam: scorer,
        winner: teams[seat].cupsLeft === 0 ? scorer : null,
        history: snapshot(match),
      });
    }

    case 'miss': {
      if (match.winner != null) return match;
      const thrower = otherSeat(seat);
      const teams: [OnlineTeam, OnlineTeam] = [{ ...match.teams[0] }, { ...match.teams[1] }];
      teams[thrower] = { ...teams[thrower], throws: teams[thrower].throws + 1, streak: 0 };
      return next({ teams, activeTeam: seat, history: snapshot(match) });
    }

    case 'shot':
      return applyShot(match, seat, action);

    case 'undo': {
      // The snapshot holds the score, not the racks or the ball count, so an
      // undo in the arcade game would restore half a position. There is no
      // undo button there — a throw that happened, happened — and refusing it
      // here means a stray message cannot produce one.
      if (matchKind(match) === 'arcade') return match;
      const previous = match.history[match.history.length - 1];
      if (!previous) return match;
      return next({
        teams: [{ ...previous.teams[0] }, { ...previous.teams[1] }],
        activeTeam: previous.activeTeam,
        winner: previous.winner,
        history: match.history.slice(0, -1),
      });
    }

    case 'rename': {
      const name = cleanName(action.name, match.teams[seat].name);
      if (name === match.teams[seat].name) return match;
      const teams: [OnlineTeam, OnlineTeam] = [{ ...match.teams[0] }, { ...match.teams[1] }];
      teams[seat] = { ...teams[seat], name };
      return next({ teams });
    }

    case 'skin': {
      // Not checked against a purchase, and deliberately not: the room would
      // have to be told about licences to do that, and the worst a faked one
      // buys is a flag on cups nobody else can keep. What it *is* checked for
      // is length, so this cannot be used to push a novel through the socket.
      const id = action.id.slice(0, 24);
      if (id === match.teams[seat].skin) return match;
      const teams: [OnlineTeam, OnlineTeam] = [{ ...match.teams[0] }, { ...match.teams[1] }];
      teams[seat] = { ...teams[seat], skin: id };
      return next({ teams });
    }

    case 'setCups': {
      // Only while nothing has happened yet — changing the rack size mid-game
      // would silently rewrite a score somebody is looking at.
      const cups = Math.round(action.cups);
      if (!CUP_COUNT_CHOICES.includes(cups as (typeof CUP_COUNT_CHOICES)[number])) return match;
      if (match.teams[0].throws > 0 || match.teams[1].throws > 0) return match;
      if (cups === match.startCups) return match;
      return next({
        startCups: cups,
        teams: [
          { ...match.teams[0], cupsLeft: cups },
          { ...match.teams[1], cupsLeft: cups },
        ],
        // The racks are part of the position in the arcade game, so they have
        // to come along or the screen would show ten cups worth three points.
        ...(matchKind(match) === 'arcade'
          ? { alive: [fullRack(cups), fullRack(cups)] as [boolean[], boolean[]] }
          : {}),
      });
    }

    case 'rematch': {
      const fresh = createMatch(
        match.startCups,
        [match.teams[0].name, match.teams[1].name],
        now,
        matchKind(match)
      );
      return { ...fresh, version: match.version + 1 };
    }

    default:
      return match;
  }
}

/**
 * One arcade throw, and everything that follows from it.
 *
 * The same rules as the offline game, because they are literally the same
 * functions: `afterThrow` decides the turn, and clearing somebody's rack sends
 * them to redemption rather than ending it. Getting that wrong offline cost
 * somebody a game they had won; running it in two places instead of one is how
 * it would come back.
 */
function applyShot(
  match: OnlineMatch,
  seat: Seat,
  action: Extract<OnlineAction, { type: 'shot' }>
): OnlineMatch {
  if (matchKind(match) !== 'arcade') return match;
  if (match.winner != null) return match;
  // Throwing out of turn is the one thing the room can and must refuse: two
  // phones that both believe it is their go would otherwise both score.
  if (seat !== match.activeTeam) return match;
  if (!Number.isFinite(action.landing?.x) || !Number.isFinite(action.landing?.y)) return match;

  const target = otherSeat(seat);
  const alive: [boolean[], boolean[]] = [
    [...(match.alive?.[0] ?? [])],
    [...(match.alive?.[1] ?? [])],
  ];
  const turn = match.turn ?? startTurn();

  // Only cups that are really still standing over there come down, however
  // many the sender listed. A bounce shot takes two, anything else one.
  const limit = action.bounce ? 2 : 1;
  const falling = Array.from(new Set(action.cups ?? []))
    .filter((index) => Number.isInteger(index) && alive[target][index] === true)
    .slice(0, limit);
  const hit = action.hit === true && falling.length > 0;
  falling.forEach((index) => {
    if (hit) alive[target][index] = false;
  });

  const cupsLeft = alive[target].filter(Boolean).length;
  const teams: [OnlineTeam, OnlineTeam] = [{ ...match.teams[0] }, { ...match.teams[1] }];
  const streak = hit ? teams[seat].streak + 1 : 0;
  teams[seat] = {
    ...teams[seat],
    throws: teams[seat].throws + 1,
    hits: teams[seat].hits + (hit ? 1 : 0),
    streak,
    bestStreak: Math.max(teams[seat].bestStreak, streak),
  };
  teams[target] = { ...teams[target], cupsLeft };

  const lastShot: OnlineShot = {
    seat,
    hit,
    cups: hit ? falling : [],
    landing: { x: action.landing.x, y: action.landing.y },
    bounce: action.bounce === true,
    id: (match.lastShot?.id ?? 0) + 1,
  };
  const carry = { version: match.version + 1, teams, alive, lastShot };

  // Their last cup is gone, and they have not shot redemption yet: they throw
  // until they miss. Level, not lost.
  if (!turn.redemption && cupsLeft === 0) {
    return {
      ...match,
      ...carry,
      activeTeam: target,
      turn: startTurn(true),
      note: 'redemption',
    };
  }

  const { next: nextTurn, outcome } = afterThrow(turn, hit, cupsLeft);

  if (outcome === 'overtime') {
    // Redemption came good. Three cups each and the side that just earned the
    // ball throws first.
    return {
      ...match,
      ...carry,
      startCups: OVERTIME_CUPS,
      teams: [
        { ...teams[0], cupsLeft: OVERTIME_CUPS },
        { ...teams[1], cupsLeft: OVERTIME_CUPS },
      ],
      alive: [fullRack(OVERTIME_CUPS), fullRack(OVERTIME_CUPS)],
      activeTeam: seat,
      turn: startTurn(),
      note: 'overtime',
      overtime: (match.overtime ?? 0) + 1,
    };
  }

  if (outcome === 'eliminated') {
    // Shooting to survive and missed: the side being thrown at has it.
    return { ...match, ...carry, winner: target, turn: nextTurn, note: null };
  }

  if (keepsThrowing(outcome)) {
    return {
      ...match,
      ...carry,
      turn: nextTurn,
      note: outcome === 'ballsBack' ? 'ballsBack' : null,
    };
  }

  return { ...match, ...carry, activeTeam: target, turn: startTurn(), note: null };
}

/** Cheap guard for whatever comes off the wire. */
export function isOnlineAction(value: unknown): value is OnlineAction {
  if (typeof value !== 'object' || value === null) return false;
  const type = (value as { type?: unknown }).type;
  switch (type) {
    case 'cupDown':
    case 'miss':
    case 'undo':
    case 'rematch':
      return true;
    case 'rename':
      return typeof (value as { name?: unknown }).name === 'string';
    case 'skin':
      return typeof (value as { id?: unknown }).id === 'string';
    case 'setCups':
      return typeof (value as { cups?: unknown }).cups === 'number';
    case 'shot': {
      const shot = value as { hit?: unknown; cups?: unknown; landing?: unknown };
      const landing = shot.landing as { x?: unknown; y?: unknown } | undefined;
      return (
        typeof shot.hit === 'boolean' &&
        Array.isArray(shot.cups) &&
        shot.cups.every((index) => typeof index === 'number') &&
        typeof landing === 'object' &&
        landing !== null &&
        typeof landing.x === 'number' &&
        typeof landing.y === 'number'
      );
    }
    default:
      return false;
  }
}
