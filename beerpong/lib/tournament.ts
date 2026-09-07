import type { TranslationKey } from './i18n';

export interface TournamentMatch {
  id: string;
  round: number;
  /** Position within the round, left to right. */
  slot: number;
  teamA: string | null;
  teamB: string | null;
  winner: string | null;
}

export interface Tournament {
  teams: string[];
  matches: TournamentMatch[];
  champion: string | null;
  createdAt: number;
}

export const MIN_TEAMS = 3;
export const MAX_TEAMS = 8;

/** The key for a round's name; the caller translates it. */
export function roundNameKey(round: number, totalRounds: number): TranslationKey {
  const fromEnd = totalRounds - round;
  if (fromEnd === 0) return 'tournament.round.final';
  if (fromEnd === 1) return 'tournament.round.semi';
  if (fromEnd === 2) return 'tournament.round.quarter';
  return 'tournament.round.n';
}

export function totalRoundsFor(teamCount: number): number {
  return Math.ceil(Math.log2(Math.max(2, teamCount)));
}

/**
 * Single elimination. Teams beyond the last power of two get a bye in round
 * one, which resolves immediately so nobody sits waiting on an empty match.
 */
export function createBracket(teams: string[]): TournamentMatch[] {
  const size = Math.pow(2, totalRoundsFor(teams.length));
  const seeded: (string | null)[] = [...teams];
  while (seeded.length < size) seeded.push(null);

  const rounds = totalRoundsFor(teams.length);
  const matches: TournamentMatch[] = [];

  for (let i = 0; i < size / 2; i++) {
    const teamA = seeded[i * 2];
    const teamB = seeded[i * 2 + 1];
    matches.push({
      id: `r1-${i}`,
      round: 1,
      slot: i,
      teamA,
      teamB,
      // A team with no opponent walks through.
      winner: teamA && !teamB ? teamA : null,
    });
  }

  for (let round = 2; round <= rounds; round++) {
    const count = size / Math.pow(2, round);
    for (let slot = 0; slot < count; slot++) {
      matches.push({
        id: `r${round}-${slot}`,
        round,
        slot,
        teamA: null,
        teamB: null,
        winner: null,
      });
    }
  }

  return propagate(matches);
}

/** Moves decided winners into their next-round slots, byes included. */
export function propagate(matches: TournamentMatch[]): TournamentMatch[] {
  const next = matches.map((m) => ({ ...m }));
  const rounds = Math.max(...next.map((m) => m.round));

  for (let round = 1; round < rounds; round++) {
    const current = next.filter((m) => m.round === round);
    for (const match of current) {
      if (!match.winner) continue;
      const target = next.find((m) => m.round === round + 1 && m.slot === Math.floor(match.slot / 2));
      if (!target) continue;
      if (match.slot % 2 === 0) target.teamA = match.winner;
      else target.teamB = match.winner;
    }
    // A slot that ends up with a single team advances without playing.
    for (const match of next.filter((m) => m.round === round + 1)) {
      const feeders = next.filter(
        (m) => m.round === round && Math.floor(m.slot / 2) === match.slot
      );
      const allDecided = feeders.every((m) => m.winner != null || (m.teamA == null && m.teamB == null));
      if (allDecided && !match.winner && match.teamA && !match.teamB) {
        match.winner = match.teamA;
      }
    }
  }

  return next;
}

export function championOf(matches: TournamentMatch[]): string | null {
  const rounds = Math.max(...matches.map((m) => m.round));
  const final = matches.find((m) => m.round === rounds && m.slot === 0);
  return final?.winner ?? null;
}

/** The next match that still needs a result. */
export function nextPlayableMatch(matches: TournamentMatch[]): TournamentMatch | null {
  return (
    matches
      .filter((m) => !m.winner && m.teamA && m.teamB)
      .sort((a, b) => a.round - b.round || a.slot - b.slot)[0] ?? null
  );
}
