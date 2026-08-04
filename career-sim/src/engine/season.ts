import type { CompetitionType, Club, League, MatchResult, Player, SeasonFixture } from '../types';
import { getClub, leagueOfClub, continentalCupName, domesticCupNames } from '../data/clubs';
import { opponentName } from './match';
import { chance, clamp, pick } from './rng';

export const SEASON_LENGTH_WEEKS = 40;
export const PRESEASON_WEEKS = [1, 2];
export const SEASON_END_WEEKS = [37, 38];
export const OFFSEASON_WEEKS = [39, 40];
export const TRANSFER_WINDOW_WEEKS = [1, 2, 20, 21];
export const INTERNATIONAL_WEEKS = [8, 16, 24, 32];

export function generateSeasonFixtures(player: Player): SeasonFixture[] {
  const fixtures: SeasonFixture[] = [];
  const club = getClub(player.clubId);
  const league = leagueOfClub(player.clubId);
  const playsInEurope = club.reputation >= 72;

  const inSeasonWeeks = Array.from({ length: 36 - 3 + 1 }, (_, i) => i + 3).filter(
    (w) => !INTERNATIONAL_WEEKS.includes(w),
  );

  let cupRoundsLeft = 4;
  let continentalRoundsLeft = playsInEurope ? 6 : 0;

  for (const week of inSeasonWeeks) {
    let competition: CompetitionType = 'league';
    let competitionName = `${league.name}`;

    const isCupWeek = week % 5 === 0 && cupRoundsLeft > 0;
    const isContinentalWeek = week % 4 === 1 && continentalRoundsLeft > 0;

    if (isContinentalWeek) {
      competition = 'continental_cup';
      competitionName = continentalCupName;
      continentalRoundsLeft--;
    } else if (isCupWeek) {
      competition = 'domestic_cup';
      competitionName = domesticCupNames[league.id] ?? 'Pokal';
      cupRoundsLeft--;
    }

    fixtures.push({
      week,
      competition,
      competitionName,
      opponent: opponentName(),
      opponentBadgeColor: pick(['#c8102e', '#1c2c5b', '#00954c', '#f6a800', '#0b4ea2', '#7b0c26']),
      home: chance(0.5),
      played: false,
    });
  }

  return fixtures;
}

export function isTransferWindow(week: number): boolean {
  return TRANSFER_WINDOW_WEEKS.includes(week);
}

export function isInternationalWeek(week: number): boolean {
  return INTERNATIONAL_WEEKS.includes(week);
}

export function rollSeasonTrophies(matches: MatchResult[], club: Club, league: League): string[] {
  const trophies: string[] = [];
  const leagueMatches = matches.filter((m) => m.competition === 'league');
  const avgRating = leagueMatches.length
    ? leagueMatches.reduce((s, m) => s + m.playerStats.rating, 0) / leagueMatches.length
    : 6;

  const leagueChance = clamp((club.reputation - 55) / 220 + (avgRating - 6) / 10, 0.02, 0.55);
  if (chance(leagueChance)) trophies.push(`${league.name} Meister`);

  const cupMatches = matches.filter((m) => m.competition === 'domestic_cup');
  if (cupMatches.length >= 3 && chance(clamp(club.reputation / 400 + (avgRating - 6) / 10, 0.03, 0.35))) {
    trophies.push(`${domesticCupNames[league.id] ?? 'Pokal'} Sieger`);
  }

  const contMatches = matches.filter((m) => m.competition === 'continental_cup');
  if (contMatches.length >= 5 && chance(clamp(club.reputation / 550 + (avgRating - 6) / 12, 0.02, 0.25))) {
    trophies.push(`${continentalCupName} Sieger`);
  }

  return trophies;
}

export function weekPhaseLabel(week: number): string {
  if (PRESEASON_WEEKS.includes(week)) return 'Vorbereitung';
  if (SEASON_END_WEEKS.includes(week)) return 'Saisonende';
  if (OFFSEASON_WEEKS.includes(week)) return 'Sommerpause';
  if (isInternationalWeek(week)) return 'Länderspielpause';
  if (isTransferWindow(week)) return 'Transferfenster';
  return 'Saison';
}
