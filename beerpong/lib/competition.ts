import type { TranslationKey } from './i18n';

export type AiDifficulty = 'easy' | 'medium' | 'hard';
export type MatchMode = 'offline' | 'rivals' | 'weekend' | 'passplay';

export interface AiPreset {
  id: AiDifficulty;
  labelKey: TranslationKey;
  descriptionKey: TranslationKey;
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
    labelKey: 'ai.easy.label',
    descriptionKey: 'ai.easy.description',
    opponentAccuracy: 0.3,
    playerSkill: 0.62,
    color: '#39FF14',
    rewardCoins: 40,
  },
  medium: {
    id: 'medium',
    labelKey: 'ai.medium.label',
    descriptionKey: 'ai.medium.description',
    opponentAccuracy: 0.45,
    playerSkill: 0.55,
    color: '#FFC94A',
    rewardCoins: 70,
  },
  hard: {
    id: 'hard',
    labelKey: 'ai.hard.label',
    descriptionKey: 'ai.hard.description',
    opponentAccuracy: 0.62,
    playerSkill: 0.48,
    color: '#FF3B4E',
    rewardCoins: 120,
  },
};

export interface Division {
  id: number; // 10 = entry, 1 = elite
  rankKey: TranslationKey;
  color: string;
  winsToPromote: number;
  lossesToRelegate: number;
  promotionCoins: number;
  winCoins: number;
  opponentAccuracy: number;
}

const DIVISION_RANKS: Record<number, { rankKey: TranslationKey; color: string }> = {
  10: { rankKey: 'division.rank.rookie', color: '#9BA39B' },
  9: { rankKey: 'division.rank.amateur', color: '#8FD5FF' },
  8: { rankKey: 'division.rank.challenger', color: '#3FD8FF' },
  7: { rankKey: 'division.rank.contender', color: '#39FF14' },
  6: { rankKey: 'division.rank.pro', color: '#00FF66' },
  5: { rankKey: 'division.rank.veteran', color: '#FFC94A' },
  4: { rankKey: 'division.rank.elite', color: '#FF9F1C' },
  3: { rankKey: 'division.rank.master', color: '#FF5A1F' },
  2: { rankKey: 'division.rank.legend', color: '#7C4DFF' },
  1: { rankKey: 'division.rank.champion', color: '#FFD23D' },
};

export const ENTRY_DIVISION = 10;
export const TOP_DIVISION = 1;
/** Weekend League unlocks from this division upwards. */
export const WEEKEND_UNLOCK_DIVISION = 8;

export function getDivision(id: number): Division {
  const clamped = Math.max(TOP_DIVISION, Math.min(ENTRY_DIVISION, id));
  const meta = DIVISION_RANKS[clamped];
  const stepsUp = ENTRY_DIVISION - clamped; // 0 at entry, 9 at the top
  return {
    id: clamped,
    rankKey: meta.rankKey,
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
  nameKey: TranslationKey;
  coins: number;
  color: string;
}

/** Highest tier first, so the first match wins. */
export const WEEKEND_TIERS: WeekendTier[] = [
  { minWins: 9, nameKey: 'weekend.tier.elite', coins: 900, color: '#FFD23D' },
  { minWins: 6, nameKey: 'weekend.tier.gold', coins: 500, color: '#FFC94A' },
  { minWins: 3, nameKey: 'weekend.tier.silver', coins: 260, color: '#C7D2CC' },
  { minWins: 0, nameKey: 'weekend.tier.bronze', coins: 120, color: '#C97B3F' },
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
