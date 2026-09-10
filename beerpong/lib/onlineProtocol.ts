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

export type Seat = 0 | 1;

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

export interface OnlineMatch {
  /**
   * Bumped by every accepted action. The room is the only writer, so a client
   * can throw away anything that arrives out of order without thinking.
   */
  version: number;
  startCups: number;
  teams: [OnlineTeam, OnlineTeam];
  activeTeam: Seat;
  winner: Seat | null;
  startedAt: number;
  /** Enough steps back to undo a whole bad minute. */
  history: MatchSnapshot[];
}

export type OnlineAction =
  /** A cup went down on the reporting seat's rack — so the other side scored. */
  | { type: 'cupDown' }
  /** The throw at the reporting seat's rack missed, so the reporter is up. */
  | { type: 'miss' }
  | { type: 'undo' }
  | { type: 'rename'; name: string }
  | { type: 'rematch' }
  | { type: 'setCups'; cups: number };

/** What the room sends down the socket. */
export type ServerMessage =
  | { type: 'state'; match: OnlineMatch; present: [boolean, boolean]; seat: Seat; code: string }
  | { type: 'error'; reason: 'full' | 'missing' | 'taken' | 'badCode' };

const HISTORY_LIMIT = 30;

function makeTeam(name: string, cups: number): OnlineTeam {
  return { name, cupsLeft: cups, hits: 0, throws: 0, streak: 0, bestStreak: 0 };
}

export function createMatch(startCups: number, names: [string, string], now: number): OnlineMatch {
  return {
    version: 1,
    startCups,
    teams: [makeTeam(names[0], startCups), makeTeam(names[1], startCups)],
    activeTeam: 0,
    winner: null,
    startedAt: now,
    history: [],
  };
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

    case 'undo': {
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
      });
    }

    case 'rematch': {
      const fresh = createMatch(match.startCups, [match.teams[0].name, match.teams[1].name], now);
      return { ...fresh, version: match.version + 1 };
    }

    default:
      return match;
  }
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
    case 'setCups':
      return typeof (value as { cups?: unknown }).cups === 'number';
    default:
      return false;
  }
}
