import type { MatchResult, Milestone, NewsItem, Player } from '../types';
import { calculateMarketValue } from './marketValue';
import { checkMilestones } from './milestones';
import { generateMatchNews } from './press';
import { clamp } from './rng';

export interface ApplyMatchOutcome {
  player: Player;
  news: NewsItem[];
  milestones: Milestone[];
}

export function applyMatchToPlayer(
  player: Player,
  match: MatchResult,
  season: number,
  week: number,
  isNational: boolean,
): ApplyMatchOutcome {
  const isDebut = player.careerTotals.appearances === 0 && !isNational;
  const isFirstGoal = player.careerTotals.goals === 0 && match.playerStats.goals > 0;
  const isFirstCap = isNational && player.nationalTeam.caps === 0;

  const stats = match.playerStats;
  const ratingDelta = stats.rating - 6.5;
  const moraleDelta = clamp(ratingDelta * 2.5, -8, 10);
  const formDelta = clamp(ratingDelta / 1.5, -1.5, 1.5);
  const coachTrustDelta = isNational ? 0 : clamp(ratingDelta * 3, -8, 8);

  let next: Player = {
    ...player,
    fitness: clamp(player.fitness - (10 + Math.random() * 8), 0, 100),
    fatigue: clamp(player.fatigue + (14 + Math.random() * 10), 0, 100),
    morale: clamp(player.morale + moraleDelta, 0, 100),
    form: clamp(player.form + formDelta, -5, 5),
    coachTrust: clamp(player.coachTrust + coachTrustDelta, 0, 100),
    fanPopularity: clamp(player.fanPopularity + (stats.motm ? 3 : stats.goals > 0 ? 1.5 : ratingDelta > 0 ? 0.5 : -0.5), 0, 100),
  };

  if (!isNational) {
    next.careerTotals = {
      ...next.careerTotals,
      appearances: next.careerTotals.appearances + 1,
      goals: next.careerTotals.goals + stats.goals,
      assists: next.careerTotals.assists + stats.assists,
      yellow: next.careerTotals.yellow + (stats.yellow ? 1 : 0),
      red: next.careerTotals.red + (stats.red ? 1 : 0),
    };
  } else {
    next.nationalTeam = {
      ...next.nationalTeam,
      caps: next.nationalTeam.caps + 1,
      goals: next.nationalTeam.goals + stats.goals,
      assists: next.nationalTeam.assists + stats.assists,
    };
  }

  next.marketValue = calculateMarketValue(next);

  const milestones = checkMilestones(next, season, week, { isDebut, isFirstGoal, isFirstCap });
  next = { ...next, milestones: [...next.milestones, ...milestones] };

  const news = isNational ? [] : generateMatchNews(next, match, season, week);

  return { player: next, news, milestones };
}
