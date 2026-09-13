/**
 * The scoreboard everyone at the party can see on their own phone.
 *
 * Not the online match protocol, and deliberately a different thing. There, two
 * tables play each other and the room is the referee — neither phone is trusted
 * to say what the score is, because both have a reason to be wrong. Here there
 * is one game, at one table, and one phone counting it. The others are looking
 * over its shoulder.
 *
 * So the model is simple and says so: the host's phone is the scoreboard, the
 * server passes its state along unchanged, and a watcher can do nothing but
 * look. Nothing a watcher sends is ever read. That is the honest shape of the
 * feature — dressing it up as something the server arbitrates would be pretend
 * rigour, since the host is the only one who can see the table.
 *
 * Shared by the app and the Worker so the two cannot drift, exactly like
 * `onlineProtocol.ts`.
 */

export interface PartyTeam {
  name: string;
  cupsLeft: number;
  hits: number;
  throws: number;
}

export interface PartyState {
  teams: [PartyTeam, PartyTeam];
  startCups: number;
  activeTeam: 0 | 1;
  winner: 0 | 1 | null;
  /** Bumped by the host on every change, so a late message cannot undo one. */
  version: number;
}

/** What the host sends. Nothing else is accepted from anybody. */
export type PartyAction = { type: 'score'; state: PartyState } | { type: 'ping' };

export type PartyMessage =
  | { type: 'party'; state: PartyState | null; watchers: number; hosted: boolean }
  | { type: 'pong' }
  | { type: 'error'; reason: 'hosted' | 'full' | 'badCode' };

/** How many people can watch one game. Past this, the room says it is full. */
export const PARTY_WATCHER_LIMIT = 40;

/** Codes look like the room codes people already read out. */
export const PARTY_CODE_LENGTH = 4;
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function normalisePartyCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, PARTY_CODE_LENGTH);
}

export function isPartyCode(code: string): boolean {
  return (
    code.length === PARTY_CODE_LENGTH &&
    [...code].every((character) => CODE_ALPHABET.includes(character))
  );
}

export function makePartyCode(random: () => number = Math.random): string {
  let code = '';
  for (let i = 0; i < PARTY_CODE_LENGTH; i++) {
    code += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)];
  }
  return code;
}

const isTeam = (value: unknown): value is PartyTeam => {
  if (typeof value !== 'object' || value === null) return false;
  const team = value as Record<string, unknown>;
  return (
    typeof team.name === 'string' &&
    team.name.length <= 24 &&
    Number.isInteger(team.cupsLeft) &&
    (team.cupsLeft as number) >= 0 &&
    (team.cupsLeft as number) <= 15 &&
    Number.isInteger(team.hits) &&
    (team.hits as number) >= 0 &&
    Number.isInteger(team.throws) &&
    (team.throws as number) >= 0
  );
};

/**
 * Everything the host sends is checked before it is stored.
 *
 * The host is trusted to say what the score is — that is the design — but not
 * to send something that will make forty other phones fall over. A name is
 * capped, counts have to be whole and in range, and anything else is dropped on
 * the floor rather than passed on.
 */
export function isPartyState(value: unknown): value is PartyState {
  if (typeof value !== 'object' || value === null) return false;
  const state = value as Record<string, unknown>;
  if (!Array.isArray(state.teams) || state.teams.length !== 2) return false;
  if (!state.teams.every(isTeam)) return false;
  if (!Number.isInteger(state.startCups)) return false;
  if (![6, 10, 15].includes(state.startCups as number)) return false;
  if (state.activeTeam !== 0 && state.activeTeam !== 1) return false;
  if (state.winner !== null && state.winner !== 0 && state.winner !== 1) return false;
  if (!Number.isInteger(state.version) || (state.version as number) < 0) return false;
  return true;
}

export function isPartyAction(value: unknown): value is PartyAction {
  if (typeof value !== 'object' || value === null) return false;
  const action = value as Record<string, unknown>;
  if (action.type === 'ping') return true;
  return action.type === 'score' && isPartyState(action.state);
}
