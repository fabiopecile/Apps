import type {
  Attributes, Appearance, Contract, Foot, Player, Position, Teammate,
} from '../types';
import { getClub } from '../data/clubs';
import { randomFullName } from '../data/names';
import { calculateOverall, emptyAttributes, keyAttributesForPosition } from './attributes';
import { calculateMarketValue } from './marketValue';
import { defaultTraits, derivePersonalityType } from './personality';
import { clamp, randInt } from './rng';

export interface CreationInput {
  name: string;
  age: number;
  nationality: string;
  position: Position;
  foot: Foot;
  heightCm: number;
  weightKg: number;
  appearance: Appearance;
  startClubId: string;
}

function generateStartingAttributes(position: Position, age: number): Attributes {
  const base = emptyAttributes(0);
  const keys = keyAttributesForPosition(position);
  const youthBonus = age <= 17 ? 0 : 3;

  for (const key of Object.keys(base) as (keyof Attributes)[]) {
    const isKey = keys.includes(key);
    const floor = isKey ? 45 : 30;
    const spread = isKey ? 20 : 20;
    base[key] = clamp(randInt(floor, floor + spread) + youthBonus, 15, 80);
  }
  return base;
}

function generatePotential(age: number): number {
  // Younger prospects can reach higher ceilings.
  const roll = randInt(0, 100);
  let ceiling: number;
  if (roll > 92) ceiling = randInt(90, 99);
  else if (roll > 70) ceiling = randInt(80, 89);
  else if (roll > 35) ceiling = randInt(68, 79);
  else ceiling = randInt(55, 67);
  const ageAdjust = age >= 18 ? 2 : 0;
  return clamp(ceiling - ageAdjust, 50, 99);
}

export function generateTeammates(clubId: string, playerPosition: Position): Teammate[] {
  const positions: Position[] = ['GK', 'CB', 'CB', 'LB', 'RB', 'DM', 'CM', 'CM', 'AM', 'LW', 'RW', 'ST', 'ST', 'GK'];
  const club = getClub(clubId);
  const relationshipTypes: Teammate['relationshipType'][] = ['neutral', 'friend', 'neutral', 'rival', 'neutral'];
  return positions
    .filter((p) => p !== playerPosition || Math.random() > 0.5)
    .slice(0, 12)
    .map((pos, i) => {
      const { first, last } = randomFullName();
      const relType = i === 0
        ? 'mentor'
        : relationshipTypes[randInt(0, relationshipTypes.length - 1)];
      return {
        id: `${clubId}-tm-${i}`,
        name: `${first} ${last}`,
        position: pos,
        overall: clamp(club.reputation - 10 + randInt(-8, 12), 45, 92),
        relationship: relType === 'mentor' ? 40 : relType === 'rival' ? -20 : randInt(-10, 30),
        relationshipType: relType,
        age: randInt(19, 34),
      };
    });
}

export function createPlayer(input: CreationInput): Player {
  const attributes = generateStartingAttributes(input.position, input.age);
  const potential = generatePotential(input.age);
  const club = getClub(input.startClubId);
  const traits = defaultTraits();

  const contract: Contract = {
    clubId: input.startClubId,
    salaryPerWeek: clamp(Math.round(club.reputation * 8 + randInt(-100, 200)), 350, 5000),
    yearsLeft: 3,
    squadNumber: randInt(2, 33),
    releaseClause: null,
    bonusPerGoal: 0,
    startingXiGuarantee: false,
    signingBonus: 0,
  };

  const player: Player = {
    id: crypto.randomUUID(),
    name: input.name,
    age: input.age,
    birthSeason: 0,
    nationality: input.nationality,
    position: input.position,
    secondaryPositions: [],
    foot: input.foot,
    heightCm: input.heightCm,
    weightKg: input.weightKg,
    appearance: input.appearance,

    attributes,
    potential,
    fitness: 100,
    morale: 70,
    form: 0,
    fatigue: 10,

    personalityType: 'balanced',
    traits,

    clubId: input.startClubId,
    contract,
    coachTrust: 55,
    squadRole: 'youth',

    teammates: generateTeammates(input.startClubId, input.position),

    fanPopularity: 5,
    mediaImage: 0,
    marketValue: 0,

    bankBalance: 5000,
    weeklyWage: contract.salaryPerWeek,
    sponsors: [],
    assets: [],
    investments: [],
    happiness: 70,

    injury: null,

    nationalTeam: {
      called: false,
      nationality: input.nationality,
      caps: 0,
      goals: 0,
      assists: 0,
      isCaptain: false,
      managerTrust: 0,
    },

    milestones: [],
    careerLog: [],
    careerTotals: {
      appearances: 0,
      goals: 0,
      assists: 0,
      yellow: 0,
      red: 0,
      trophies: 0,
      moneyEarned: 0,
      clubsPlayed: [club.name],
      ballonDors: 0,
    },
    ballonDorHistory: [],

    retired: false,
    hasFamily: false,
    hasPartner: false,
    pets: 0,
  };

  player.marketValue = calculateMarketValue(player);
  player.personalityType = derivePersonalityType(player.traits, calculateOverall(attributes, input.position), 0);

  return player;
}
