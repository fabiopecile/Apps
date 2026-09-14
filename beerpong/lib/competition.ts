import type { TranslationKey } from './i18n';
import type { AimStrategy } from './opponentAi';

export type AiDifficulty = 'easy' | 'medium' | 'hard' | 'pro';
export type MatchMode =
  | 'offline'
  | 'rivals'
  | 'weekend'
  | 'passplay'
  | 'knockout'
  | 'ghost';

export interface AiPreset {
  id: AiDifficulty;
  labelKey: TranslationKey;
  descriptionKey: TranslationKey;
  /** How often the AI sinks a cup at a full rack. */
  opponentAccuracy: number;
  /**
   * How much better they get as your rack empties, added by the last cup.
   *
   * Measured to be the only thing that decides matches — see `lib/opponentAi.ts`
   * and `npm run bench:ai`. Without it an opponent cannot close a game.
   */
  focus: number;
  /** Where they aim. `cluster` is the sheltered middle of the rack. */
  aim: AimStrategy;
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
    // No focus and no plan: they throw at whatever cup they fancy and the last
    // ones give them as much trouble as they give you.
    focus: 0,
    aim: 'random',
    playerSkill: 0.62,
    color: '#39FF14',
    rewardCoins: 40,
  },
  medium: {
    id: 'medium',
    labelKey: 'ai.medium.label',
    descriptionKey: 'ai.medium.description',
    opponentAccuracy: 0.45,
    focus: 0.08,
    aim: 'random',
    playerSkill: 0.55,
    color: '#FFC94A',
    rewardCoins: 70,
  },
  hard: {
    id: 'hard',
    labelKey: 'ai.hard.label',
    descriptionKey: 'ai.hard.description',
    opponentAccuracy: 0.62,
    focus: 0.15,
    aim: 'cluster',
    playerSkill: 0.48,
    color: '#FF3B4E',
    rewardCoins: 120,
  },
  pro: {
    id: 'pro',
    labelKey: 'ai.pro.label',
    descriptionKey: 'ai.pro.description',
    // Measured: against somebody swiping as well as they can (about 90%), this
    // wins a little over half the games. Anything less and the top of the
    // ladder is a formality.
    opponentAccuracy: 0.74,
    focus: 0.24,
    aim: 'cluster',
    playerSkill: 0.44,
    color: '#7C4DFF',
    rewardCoins: 220,
  },
};

/**
 * The colour the far rack is painted, given whatever colour the opponent goes
 * by elsewhere.
 *
 * There is one rule and it beats everything else: you have to be able to tell
 * at a glance which rack is yours. Several opponents fail that outright — the
 * easy computer is `#39FF14`, which *is* the player's neon, and so is division
 * 7; division 6 is a shade off it. Playing those, both ends of the table are
 * the same green, and the screenshot of it is genuinely hard to read.
 *
 * So a colour too near the player's is swapped for one that is not. The badge
 * and the header still show the opponent's real colour — this is only about the
 * cups, where the confusion is.
 */
const PLAYER_RACK_COLOUR = '#39FF14';
/** Warm, and as far from a green table as the palette goes. */
const SUBSTITUTE_RACK_COLOUR = '#FFC94A';

function channels(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

/**
 * How far apart two colours look, with the channels weighted rather than
 * counted equally.
 *
 * The weights matter because of what they do to *this* palette, and the numbers
 * are worth writing down. Straight RGB distance puts the two greens
 * (`#00FF66` against the player's `#39FF14`) at 100 and division 10's grey —
 * which is unmistakably another team — at 163. That is a 63-point gap to fit a
 * threshold into. Weighted, the same pairs come out at 163 and 328: the same
 * ordering, with more than twice the room. A threshold picked in the middle of
 * the wide gap is one that survives somebody adding a colour later.
 */
export function colourDistance(a: string, b: string): number {
  const [ar, ag, ab] = channels(a);
  const [br, bg, bb] = channels(b);
  return Math.sqrt(
    2 * (ar - br) ** 2 + 4 * (ag - bg) ** 2 + 3 * (ab - bb) ** 2
  );
}

/**
 * Below this, two racks read as the same colour across a phone screen.
 *
 * Set from the actual palette rather than picked: the offenders come out at 0
 * (the easy computer and division 7, which *are* the player's neon) and 163
 * (division 6's `#00FF66`, a different green on a swatch and the same green on
 * a far-away cup). The nearest colour that genuinely reads as another team is
 * division 10's grey at 328, so anywhere between 164 and 327 does the job; 200
 * sits clear of both ends.
 */
export const RACK_COLOUR_MIN_DISTANCE = 200;

export function opponentRackColour(colour: string): string {
  return colourDistance(colour, PLAYER_RACK_COLOUR) < RACK_COLOUR_MIN_DISTANCE
    ? SUBSTITUTE_RACK_COLOUR
    : colour;
}

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
  focus: number;
  aim: AimStrategy;
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
  // Climbing the ladder should mean meeting people who can close a game, not
  // just people who throw a bit straighter. From about the middle divisions up
  // they aim at the sheltered part of the rack and steady as it empties.
  const stepsUp = ENTRY_DIVISION - division.id;
  return {
    name: `${prefix}${suffix}${number}`,
    accuracy: Math.max(0.2, Math.min(0.8, division.opponentAccuracy + boost + spread)),
    focus: Math.min(0.22, stepsUp * 0.026),
    aim: stepsUp >= 4 ? 'cluster' : 'random',
    color: division.color,
  };
}
