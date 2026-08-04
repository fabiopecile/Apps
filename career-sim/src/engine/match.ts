import type {
  CompetitionType, MatchEvent, MatchResult, MatchStats, Player, Position,
} from '../types';
import { calculateOverall } from './attributes';
import { chance, clamp, pick, randFloat, randInt } from './rng';
import { getClub } from '../data/clubs';

const opponentNamePool = [
  'Ironbridge', 'Glenmark', 'Highfield', 'Redstone', 'Sable Harbour', 'Amberfield',
  'Copper Vale', 'Wren City', 'Silverlake', 'Stonegate', 'Falcon Bay', 'Marlow',
  'Duskwood', 'Farrow Town', 'Elmport', 'Griffin Hill', 'Hollowmere', 'Blackpine',
];

function opponentName(): string {
  return `${pick(opponentNamePool)} ${pick(['FC', 'United', 'City', 'Athletic', 'SC', 'Rovers'])}`;
}

const attackingPositions: Position[] = ['ST', 'LW', 'RW', 'AM'];
const creativePositions: Position[] = ['AM', 'CM', 'LW', 'RW', 'LB', 'RB'];
const defensivePositions: Position[] = ['GK', 'CB', 'LB', 'RB', 'DM'];

export interface SimContext {
  player: Player;
  competition: CompetitionType;
  competitionName: string;
  home: boolean;
  opponentStrength?: number;
  season: number;
  opponentNameOverride?: string;
  opponentBadgeColorOverride?: string;
}

function performanceScore(player: Player): number {
  const overall = calculateOverall(player.attributes, player.position);
  const fitnessFactor = player.fitness / 100;
  const moraleFactor = 0.85 + (player.morale / 100) * 0.3;
  const formFactor = 1 + player.form / 20;
  const fatiguePenalty = 1 - clamp(player.fatigue - 60, 0, 40) / 100;
  const chemistryFactor = 1 + (avgChemistry(player) / 100) * 0.1;
  return overall * fitnessFactor * moraleFactor * formFactor * fatiguePenalty * chemistryFactor;
}

function avgChemistry(player: Player): number {
  if (player.teammates.length === 0) return 0;
  return player.teammates.reduce((s, t) => s + t.relationship, 0) / player.teammates.length;
}

export function simulateMatch(ctx: SimContext): MatchResult {
  const { player } = ctx;
  const club = getClub(player.clubId);
  const teamStrength = club.reputation + randFloat(-8, 8) + performanceScore(player) / 10;
  const oppStrength = ctx.opponentStrength ?? clamp(club.reputation + randInt(-25, 25), 25, 99);

  const strengthDiff = teamStrength - oppStrength;
  const homeAdvantage = ctx.home ? 3 : -3;
  const netDiff = strengthDiff + homeAdvantage;

  const expectedGoalsFor = clamp(1.3 + netDiff / 22, 0.2, 4.5);
  const expectedGoalsAgainst = clamp(1.3 - netDiff / 22, 0.2, 4.5);

  let goalsFor = poisson(expectedGoalsFor);
  let goalsAgainst = poisson(expectedGoalsAgainst);

  const events: MatchEvent[] = [];
  const perf = performanceScore(player) / 100;
  const isAttacker = attackingPositions.includes(player.position);
  const isCreative = creativePositions.includes(player.position);
  const isDefender = defensivePositions.includes(player.position);

  // Player goals: weighted by position and overall performance, capped by team goals for attackers.
  let playerGoals = 0;
  const goalChanceBase = isAttacker ? 0.85 : isCreative ? 0.35 : 0.08;
  for (let i = 0; i < goalsFor; i++) {
    if (chance(goalChanceBase * perf * 0.9)) playerGoals++;
  }
  playerGoals = Math.min(playerGoals, goalsFor);

  let playerAssists = 0;
  const assistChanceBase = isCreative ? 0.5 : isAttacker ? 0.25 : 0.12;
  const remainingGoals = goalsFor - playerGoals;
  for (let i = 0; i < remainingGoals; i++) {
    if (chance(assistChanceBase * perf)) playerAssists++;
  }

  // last-minute goal flavor
  let lastMinuteHero = false;
  if (playerGoals > 0 && chance(0.18)) {
    lastMinuteHero = true;
    events.push({ minute: randInt(88, 95), type: 'goal', description: `Last-Minute-Tor in der ${randInt(88, 95)}. Minute!` });
  }
  for (let i = 0; i < playerGoals; i++) {
    if (!(lastMinuteHero && i === playerGoals - 1)) {
      events.push({ minute: randInt(1, 90), type: 'goal', description: 'Tor erzielt' });
    }
  }
  for (let i = 0; i < playerAssists; i++) {
    events.push({ minute: randInt(1, 90), type: 'assist', description: 'Vorlage gegeben' });
  }

  // hattrick
  if (playerGoals >= 3) {
    events.push({ minute: 90, type: 'goal', description: 'Hattrick!' });
  }

  // own goal (rare, for defenders under pressure)
  let ownGoal = false;
  if (isDefender && chance(0.015)) {
    ownGoal = true;
    goalsAgainst++;
    events.push({ minute: randInt(1, 90), type: 'own_goal', description: 'Unglückliches Eigentor' });
  }

  // cards
  let yellow = chance(0.14 + player.attributes.aggression / 900 + player.traits.temper / 700);
  let red = false;
  if (yellow && chance(0.02 + player.traits.temper / 1200)) {
    red = true;
    events.push({ minute: randInt(20, 90), type: 'red', description: 'Platzverweis nach zwei gelben Karten' });
  } else if (chance(0.003 + player.traits.temper / 2500)) {
    red = true;
    events.push({ minute: randInt(20, 90), type: 'red', description: 'Glatt Rot nach grobem Foul' });
  }
  if (yellow && !red) {
    events.push({ minute: randInt(10, 88), type: 'yellow', description: 'Gelbe Karte' });
  }

  // penalty
  if (isAttacker && chance(0.1)) {
    const penScore = player.attributes.penalties + randFloat(-15, 15);
    if (penScore > 55) {
      playerGoals++;
      goalsFor = Math.max(goalsFor, playerGoals);
      events.push({ minute: randInt(1, 90), type: 'penalty_scored', description: 'Elfmeter verwandelt!' });
    } else {
      events.push({ minute: randInt(1, 90), type: 'penalty_missed', description: 'Elfmeter vergeben' });
    }
  }

  // injury risk
  let injuryEvent = false;
  const injuryChance = 0.012 + clamp(player.fatigue - 70, 0, 30) / 1500;
  if (!red && chance(injuryChance)) {
    injuryEvent = true;
    events.push({ minute: randInt(1, 90), type: 'injury', description: 'Der Spieler geht verletzt vom Feld' });
  }

  const minutesPlayed = red ? randInt(20, 88) : injuryEvent ? randInt(15, 85) : 90;

  const rating = computeRating({
    goals: playerGoals, assists: playerAssists, goalsFor, goalsAgainst,
    yellow, red, ownGoal, perf, isAttacker, isCreative, isDefender,
  });

  const motm = rating >= 8.3 && chance(0.6);
  if (motm) events.push({ minute: 90, type: 'motm', description: 'Spieler des Spiels!' });

  const possession = clamp(45 + netDiff / 2 + randInt(-6, 6), 28, 78);
  const passAccuracy = clamp(70 + player.attributes.shortPassing / 4 + randInt(-8, 8), 45, 98);
  const duelsWonPct = clamp(48 + (player.attributes.tackling + player.attributes.strength) / 8 + randInt(-10, 10), 20, 95);
  const chancesCreated = isCreative || isAttacker ? randInt(0, 5) : randInt(0, 2);
  const distanceKm = round1(randFloat(8.5, 12.5));

  const playerStats: MatchStats = {
    goals: playerGoals,
    assists: playerAssists,
    rating: round1(rating),
    possession,
    passAccuracy,
    duelsWonPct,
    yellow: yellow && !red,
    red,
    chancesCreated,
    distanceKm,
    motm,
    minutesPlayed,
  };

  const headline = buildHeadline({
    player, goalsFor, goalsAgainst, home: ctx.home, playerGoals, playerAssists,
    motm, red, lastMinuteHero, opponent: '',
  });

  const opponent = ctx.opponentNameOverride ?? opponentName();

  return {
    id: crypto.randomUUID(),
    season: ctx.season,
    competition: ctx.competition,
    competitionName: ctx.competitionName,
    opponent,
    opponentBadgeColor: ctx.opponentBadgeColorOverride ?? pick(['#c8102e', '#1c2c5b', '#00954c', '#f6a800', '#0b4ea2', '#7b0c26']),
    home: ctx.home,
    goalsFor,
    goalsAgainst,
    playerStats,
    events,
    headline: headline.replace('{opponent}', opponent),
    penaltyShootout: undefined,
    injuryOccurred: injuryEvent,
  };
}

function poisson(lambda: number): number {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= Math.random();
  } while (p > L);
  return k - 1;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function computeRating(args: {
  goals: number; assists: number; goalsFor: number; goalsAgainst: number;
  yellow: boolean; red: boolean; ownGoal: boolean; perf: number;
  isAttacker: boolean; isCreative: boolean; isDefender: boolean;
}): number {
  let rating = 6.2 + (args.perf - 1) * 3;
  rating += args.goals * (args.isAttacker ? 0.55 : 0.85);
  rating += args.assists * 0.5;
  if (args.isDefender && args.goalsAgainst === 0) rating += 0.6;
  if (args.red) rating -= 1.8;
  if (args.yellow) rating -= 0.2;
  if (args.ownGoal) rating -= 1.2;
  if (args.goalsFor > args.goalsAgainst) rating += 0.25;
  if (args.goalsFor < args.goalsAgainst) rating -= 0.25;
  rating += randFloat(-0.4, 0.4);
  return clamp(rating, 3.5, 10);
}

function buildHeadline(args: {
  player: Player; goalsFor: number; goalsAgainst: number; home: boolean;
  playerGoals: number; playerAssists: number; motm: boolean; red: boolean;
  lastMinuteHero: boolean; opponent: string;
}): string {
  const { player, goalsFor, goalsAgainst, playerGoals, playerAssists, motm, red, lastMinuteHero } = args;
  const won = goalsFor > goalsAgainst;
  const lost = goalsFor < goalsAgainst;
  const name = player.name;

  if (lastMinuteHero) return `${name} rettet sein Team in letzter Sekunde gegen {opponent}!`;
  if (playerGoals >= 3) return `Hattrick-Held ${name} zerlegt {opponent}!`;
  if (red) return `Rote Karte! ${name} sieht früh Rot gegen {opponent}.`;
  if (motm && won) return `${name} glänzt als Mann des Spiels beim Sieg gegen {opponent}.`;
  if (playerGoals > 0 && won) return `${name} trifft beim Erfolg gegen {opponent}.`;
  if (playerAssists > 0 && won) return `${name} legt auf – Sieg gegen {opponent}.`;
  if (won) return `Team mit ${name} siegt gegen {opponent}.`;
  if (lost) return `Niederlage gegen {opponent} trotz Einsatz von ${name}.`;
  return `Remis gegen {opponent}.`;
}

export { opponentName };
