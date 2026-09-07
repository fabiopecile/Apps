export type AiDifficulty = 'easy' | 'medium' | 'hard';
export type MatchMode = 'offline' | 'rivals' | 'weekend' | 'passplay';

export interface AiPreset {
  id: AiDifficulty;
  label: string;
  description: string;
  /** How often the AI sinks a cup. */
  opponentAccuracy: number;
  /** Your own base hit chance before the swipe-power bonus. */
  playerSkill: number;
  color: string;
  rewardCoins: number;
}

export const AI_PRESETS: Record<AiDifficulty, AiPreset> = {
  easy: {
    id: 'easy',
    label: 'Einfach',
    description: 'Lockerer Gegner, viel Spielraum für deine Würfe.',
    opponentAccuracy: 0.3,
    playerSkill: 0.62,
    color: '#39FF14',
    rewardCoins: 40,
  },
  medium: {
    id: 'medium',
    label: 'Mittel',
    description: 'Trifft regelmäßig — Fehlwürfe werden bestraft.',
    opponentAccuracy: 0.45,
    playerSkill: 0.55,
    color: '#FFC94A',
    rewardCoins: 70,
  },
  hard: {
    id: 'hard',
    label: 'Schwer',
    description: 'Räumt dein Rack ab, wenn du zu oft danebenwirfst.',
    opponentAccuracy: 0.62,
    playerSkill: 0.48,
    color: '#FF3B4E',
    rewardCoins: 120,
  },
};

export interface Division {
  id: number; // 10 = entry, 1 = elite
  name: string;
  color: string;
  winsToPromote: number;
  lossesToRelegate: number;
  promotionCoins: number;
  winCoins: number;
  opponentAccuracy: number;
}

const DIVISION_NAMES: Record<number, { name: string; color: string }> = {
  10: { name: 'Division 10 · Rookie', color: '#9BA39B' },
  9: { name: 'Division 9 · Amateur', color: '#8FD5FF' },
  8: { name: 'Division 8 · Challenger', color: '#3FD8FF' },
  7: { name: 'Division 7 · Contender', color: '#39FF14' },
  6: { name: 'Division 6 · Pro', color: '#00FF66' },
  5: { name: 'Division 5 · Veteran', color: '#FFC94A' },
  4: { name: 'Division 4 · Elite', color: '#FF9F1C' },
  3: { name: 'Division 3 · Master', color: '#FF5A1F' },
  2: { name: 'Division 2 · Legend', color: '#7C4DFF' },
  1: { name: 'Division 1 · Champion', color: '#FFD23D' },
};

export const ENTRY_DIVISION = 10;
export const TOP_DIVISION = 1;
/** Weekend League unlocks from this division upwards. */
export const WEEKEND_UNLOCK_DIVISION = 8;

export function getDivision(id: number): Division {
  const clamped = Math.max(TOP_DIVISION, Math.min(ENTRY_DIVISION, id));
  const meta = DIVISION_NAMES[clamped];
  const stepsUp = ENTRY_DIVISION - clamped; // 0 at entry, 9 at the top
  return {
    id: clamped,
    name: meta.name,
    color: meta.color,
    winsToPromote: 3 + Math.floor(stepsUp / 3),
    lossesToRelegate: 3,
    promotionCoins: 100 + stepsUp * 60,
    winCoins: 40 + stepsUp * 10,
    opponentAccuracy: Math.min(0.72, 0.3 + stepsUp * 0.045),
  };
}

export const ALL_DIVISIONS: Division[] = Array.from({ length: 10 }, (_, i) =>
  getDivision(ENTRY_DIVISION - i)
);

export const WEEKEND_MATCHES = 10;

export interface WeekendTier {
  minWins: number;
  name: string;
  coins: number;
  color: string;
}

/** Highest tier first, so the first match wins. */
export const WEEKEND_TIERS: WeekendTier[] = [
  { minWins: 9, name: 'Elite', coins: 900, color: '#FFD23D' },
  { minWins: 6, name: 'Gold', coins: 500, color: '#FFC94A' },
  { minWins: 3, name: 'Silber', coins: 260, color: '#C7D2CC' },
  { minWins: 0, name: 'Bronze', coins: 120, color: '#C97B3F' },
];

export function weekendTierFor(wins: number): WeekendTier {
  return WEEKEND_TIERS.find((tier) => wins >= tier.minWins) ?? WEEKEND_TIERS[WEEKEND_TIERS.length - 1];
}

const GAMERTAG_PREFIX = [
  'Cup', 'Neon', 'Rim', 'Party', 'Solo', 'Table', 'Pong', 'Beer', 'Night', 'Shot',
  'Bounce', 'Arc', 'Splash', 'Toss', 'Clutch',
];
const GAMERTAG_SUFFIX = [
  'Crusher', 'Sniper', 'King', 'Queen', 'Machine', 'Legend', 'Wizard', 'Menace',
  'Hunter', 'Boss', 'Rocket', 'Storm', 'Ghost', 'Blitz', 'Titan',
];

export interface OnlineOpponent {
  name: string;
  accuracy: number;
  color: string;
}

/**
 * Stands in for real matchmaking: builds a plausible opponent whose skill
 * matches the division you're playing in. Swap this out for a server call
 * once there's a backend — the match screen only needs name/accuracy/color.
 */
export function generateOnlineOpponent(divisionId: number, boost = 0): OnlineOpponent {
  const division = getDivision(divisionId);
  const prefix = GAMERTAG_PREFIX[Math.floor(Math.random() * GAMERTAG_PREFIX.length)];
  const suffix = GAMERTAG_SUFFIX[Math.floor(Math.random() * GAMERTAG_SUFFIX.length)];
  const number = Math.floor(Math.random() * 90) + 10;
  const spread = (Math.random() - 0.5) * 0.08;
  return {
    name: `${prefix}${suffix}${number}`,
    accuracy: Math.max(0.2, Math.min(0.8, division.opponentAccuracy + boost + spread)),
    color: division.color,
  };
}
