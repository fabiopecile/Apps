// Core domain types for the football career simulator.

export type Position =
  | 'GK'
  | 'LB'
  | 'CB'
  | 'RB'
  | 'DM'
  | 'CM'
  | 'AM'
  | 'LW'
  | 'RW'
  | 'ST';

export type Foot = 'left' | 'right';

export type SkinTone = 'light' | 'medium' | 'tan' | 'dark' | 'deep';

export type HairStyle =
  | 'short'
  | 'buzz'
  | 'curly'
  | 'long'
  | 'mohawk'
  | 'bald'
  | 'afro'
  | 'ponytail';

export type BeardStyle = 'none' | 'stubble' | 'full' | 'goatee' | 'mustache';

export interface Attributes {
  pace: number;
  acceleration: number;
  stamina: number;
  strength: number;
  technique: number;
  ballControl: number;
  dribbling: number;
  shortPassing: number;
  longPassing: number;
  crossing: number;
  shooting: number;
  penalties: number;
  freeKick: number;
  heading: number;
  tackling: number;
  positioning: number;
  aggression: number;
  vision: number;
  leadership: number;
}

export type AttributeKey = keyof Attributes;

export type PersonalityType =
  | 'leader'
  | 'legend'
  | 'gentleman'
  | 'badboy'
  | 'quiet_pro'
  | 'superstar'
  | 'money_hunter'
  | 'balanced';

export interface PersonalityTraits {
  professionalism: number; // 0-100
  arrogance: number;
  loyalty: number;
  greed: number;
  temper: number;
  charisma: number;
}

export interface Appearance {
  skinTone: SkinTone;
  hairStyle: HairStyle;
  hairColor: string;
  beard: BeardStyle;
}

export interface Contract {
  clubId: string;
  salaryPerWeek: number;
  yearsLeft: number;
  squadNumber: number;
  releaseClause: number | null;
  bonusPerGoal: number;
  startingXiGuarantee: boolean;
  signingBonus: number;
}

export type CompetitionType =
  | 'league'
  | 'domestic_cup'
  | 'continental_cup'
  | 'national_friendly'
  | 'national_qualifier'
  | 'national_tournament';

export interface MatchEvent {
  minute: number;
  type:
    | 'goal'
    | 'assist'
    | 'yellow'
    | 'red'
    | 'injury'
    | 'own_goal'
    | 'penalty_scored'
    | 'penalty_missed'
    | 'substitution'
    | 'motm';
  description: string;
}

export interface MatchStats {
  goals: number;
  assists: number;
  rating: number; // 0-10
  possession: number;
  passAccuracy: number;
  duelsWonPct: number;
  yellow: boolean;
  red: boolean;
  chancesCreated: number;
  distanceKm: number;
  motm: boolean;
  minutesPlayed: number;
}

export interface MatchResult {
  id: string;
  season: number;
  competition: CompetitionType;
  competitionName: string;
  opponent: string;
  opponentBadgeColor: string;
  home: boolean;
  goalsFor: number;
  goalsAgainst: number;
  playerStats: MatchStats;
  events: MatchEvent[];
  headline: string;
  penaltyShootout?: { scored: boolean; teamWon: boolean };
  injuryOccurred?: boolean;
}

export interface Teammate {
  id: string;
  name: string;
  position: Position;
  overall: number;
  relationship: number; // -100..100
  relationshipType:
    | 'best_friend'
    | 'friend'
    | 'neutral'
    | 'rival'
    | 'mentor'
    | 'conflict';
  age: number;
}

export interface Club {
  id: string;
  name: string;
  shortName: string;
  country: string;
  leagueId: string;
  tier: number; // 1 = top flight
  reputation: number; // 1-100
  primaryColor: string;
  secondaryColor: string;
  stadium: string;
  capacity: number;
  budget: number;
  coachName: string;
}

export interface League {
  id: string;
  name: string;
  country: string;
  tier: number;
  clubIds: string[];
  continentalSlot: 'champions' | 'europa' | 'none';
}

export interface Sponsor {
  id: string;
  name: string;
  tier: 'boot' | 'apparel' | 'lifestyle' | 'endorsement';
  weeklyIncome: number;
  requiredReputation: number;
  signedOnSeason: number;
}

export type PropertyType = 'apartment' | 'house' | 'mansion' | 'estate';
export type CarTier = 'city' | 'sport' | 'super' | 'hyper';

export interface OwnedAsset {
  id: string;
  name: string;
  type: 'property' | 'car' | 'watch' | 'pet';
  tier: string;
  value: number;
  happinessBonus: number;
}

export interface Investment {
  id: string;
  name: string;
  type: 'real_estate' | 'stocks' | 'company' | 'startup' | 'restaurant' | 'academy';
  invested: number;
  weeklyReturn: number;
  risk: 'low' | 'medium' | 'high';
  foundedSeason: number;
}

export type InjuryType =
  | 'muscle_strain'
  | 'acl_tear'
  | 'meniscus'
  | 'ankle_sprain'
  | 'shoulder_dislocation'
  | 'concussion';

export interface Injury {
  type: InjuryType;
  label: string;
  weeksOut: number;
  weeksRemaining: number;
  severity: 'minor' | 'moderate' | 'severe';
}

export interface NewsItem {
  id: string;
  week: number;
  season: number;
  headline: string;
  body: string;
  tone: 'positive' | 'negative' | 'neutral';
  requiresResponse: boolean;
  responded: boolean;
  source: 'press' | 'social' | 'club' | 'federation';
}

export type ResponseTone = 'humble' | 'confident' | 'provocative' | 'funny';

export interface Milestone {
  id: string;
  season: number;
  week: number;
  label: string;
  description: string;
  icon: string;
}

export interface CareerRecordEntry {
  key: string;
  label: string;
  value: number;
  unit?: string;
}

export interface NationalTeamStatus {
  called: boolean;
  nationality: string;
  caps: number;
  goals: number;
  assists: number;
  isCaptain: boolean;
  managerTrust: number; // 0-100
}

export interface BallonDorResult {
  season: number;
  rank: number | null;
  winnerName: string;
  top3: string[];
  playerVotesShare: number;
}

export interface TransferOffer {
  id: string;
  clubId: string;
  clubName: string;
  fee: number;
  salaryPerWeek: number;
  years: number;
  squadNumber: number;
  startingXiGuarantee: boolean;
  signingBonus: number;
  releaseClause: number | null;
  deadlineWeek: number;
  reason: string;
}

export type RandomEventType =
  | 'new_coach'
  | 'coach_fired'
  | 'investor_takeover'
  | 'stadium_expansion'
  | 'teammate_injured'
  | 'captain_sold'
  | 'media_scandal'
  | 'sponsor_change'
  | 'fan_protest'
  | 'club_crisis'
  | 'insolvency'
  | 'surprise_offer';

export interface GameEventLogEntry {
  id: string;
  season: number;
  week: number;
  type: RandomEventType | 'system';
  headline: string;
  body: string;
}

export type TrainingType =
  | 'sprint'
  | 'passing'
  | 'crossing'
  | 'freekick'
  | 'penalty'
  | 'dribbling'
  | 'reaction'
  | 'shooting';

export interface TrainingResult {
  type: TrainingType;
  score: number; // 0-100
  grade: 'poor' | 'okay' | 'good' | 'great' | 'perfect';
  attributeGains: Partial<Attributes>;
}

export type SeasonPhase =
  | 'preseason'
  | 'inseason'
  | 'transfer_window'
  | 'season_end'
  | 'offseason';

export interface SeasonFixture {
  week: number;
  competition: CompetitionType;
  competitionName: string;
  opponent: string;
  opponentBadgeColor: string;
  home: boolean;
  played: boolean;
}

export interface SeasonStatLine {
  season: number;
  clubName: string;
  appearances: number;
  goals: number;
  assists: number;
  yellow: number;
  red: number;
  avgRating: number;
  trophies: string[];
}

export interface CareerTotals {
  appearances: number;
  goals: number;
  assists: number;
  yellow: number;
  red: number;
  trophies: number;
  moneyEarned: number;
  clubsPlayed: string[];
  ballonDors: number;
}

export interface Player {
  id: string;
  name: string;
  age: number;
  birthSeason: number;
  nationality: string;
  position: Position;
  secondaryPositions: Position[];
  foot: Foot;
  heightCm: number;
  weightKg: number;
  appearance: Appearance;

  attributes: Attributes;
  potential: number; // ceiling for overall growth 40-99
  fitness: number; // 0-100
  morale: number; // 0-100
  form: number; // -5..5 momentum modifier
  fatigue: number; // 0-100

  personalityType: PersonalityType;
  traits: PersonalityTraits;

  clubId: string;
  contract: Contract;
  coachTrust: number; // 0-100
  squadRole: 'star' | 'starter' | 'rotation' | 'backup' | 'youth';

  teammates: Teammate[];

  fanPopularity: number; // 0-100
  mediaImage: number; // -100..100
  marketValue: number;

  bankBalance: number;
  weeklyWage: number;
  sponsors: Sponsor[];
  assets: OwnedAsset[];
  investments: Investment[];
  happiness: number; // 0-100, derived from personal life

  injury: Injury | null;

  nationalTeam: NationalTeamStatus;

  milestones: Milestone[];
  careerLog: SeasonStatLine[];
  careerTotals: CareerTotals;
  ballonDorHistory: BallonDorResult[];

  retired: boolean;
  hasFamily: boolean;
  hasPartner: boolean;
  pets: number;
}

export interface GameState {
  createdAt: number;
  player: Player | null;
  season: number;
  week: number;
  phase: SeasonPhase;
  fixtures: SeasonFixture[];
  seasonMatches: MatchResult[];
  allMatches: MatchResult[];
  news: NewsItem[];
  eventLog: GameEventLogEntry[];
  pendingOffers: TransferOffer[];
  pendingTrainingType: TrainingType | null;
  recordsBook: CareerRecordEntry[];
  screen: ScreenId;
  lastRetirementSummary: RetirementSummary | null;
  rngSeed: number;
}

export interface RetirementSummary {
  player: Player;
  awards: string[];
}

export type ScreenId =
  | 'intro'
  | 'creation'
  | 'hub'
  | 'match'
  | 'training'
  | 'transfers'
  | 'press'
  | 'squad'
  | 'national'
  | 'finances'
  | 'career'
  | 'ballondor'
  | 'retirement';
